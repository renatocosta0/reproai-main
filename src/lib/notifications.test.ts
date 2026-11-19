import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import {
  dispatchCareNotification,
  getNotificationsForUser,
  markNotificationAsRead
} from "./notifications";

const notificationRows = vi.hoisted(() => new Map<string, any>());

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(async ({ where }: any) => ({ id: where.id }))
    },
    invitation: { findMany: vi.fn().mockResolvedValue([]) },
    consent: { findMany: vi.fn().mockResolvedValue([]) },
    careNotification: {
      create: vi.fn(async ({ data }: any) => {
        const record = { id: `notif-${notificationRows.size + 1}`, ...data, readAt: null, createdAt: new Date() };
        notificationRows.set(record.id, record);
        return record;
      }),
      findMany: vi.fn(async ({ where }: any) =>
        [...notificationRows.values()].filter((row) => row.userId === where.userId)
      ),
      count: vi.fn(async ({ where }: any) =>
        [...notificationRows.values()].filter((row) => row.userId === where.userId && row.readAt === null).length
      ),
      findFirst: vi.fn(async ({ where }: any) => {
        const record = notificationRows.get(where.id);
        return record?.userId === where.userId ? { readAt: record.readAt } : null;
      }),
      updateMany: vi.fn(async ({ where, data }: any) => {
        const record = notificationRows.get(where.id);
        if (!record || record.userId !== where.userId || record.readAt !== null) return { count: 0 };
        record.readAt = data.readAt;
        return { count: 1 };
      })
    },
    auditLog: { create: vi.fn().mockResolvedValue({}) }
  }
}));

beforeEach(() => {
  notificationRows.clear();
  vi.clearAllMocks();
});

describe("Care Notifications Engine", () => {
  it("dispatches privacy-safe care notification to target user", async () => {
    const testUserId = "test-patient-user-1";
    const notifs = await dispatchCareNotification({
      targetUserId: testUserId,
      actorId: "test-clinician-1",
      type: "ASSESSMENT_RELEASED",
      title: "ReproAI · Care update",
      body: "Your care team has shared an update. Sign in to review it.",
      url: "/patient/assessment"
    });

    expect(notifs).toHaveLength(1);
    expect(notifs[0].userId).toBe(testUserId);
    expect(notifs[0].title).toBe("ReproAI · Care update");
    expect(notifs[0].read).toBe(false);

    const userNotifs = await getNotificationsForUser(testUserId);
    expect(userNotifs.length).toBeGreaterThanOrEqual(1);
    expect(userNotifs[0].id).toBe(notifs[0].id);
  });

  it("marks notification as read", async () => {
    const testUserId = "test-patient-user-2";
    const [notif] = await dispatchCareNotification({
      targetUserId: testUserId,
      actorId: "test-clinician-1",
      type: "INSIGHT_UPDATE",
      title: "ReproAI · Care Update",
      body: "Updated sleep patterns recorded.",
      url: "/patient/overview"
    });

    expect(notif.read).toBe(false);

    const success = await markNotificationAsRead(testUserId, notif.id);
    expect(success).toBe(true);

    const updated = await getNotificationsForUser(testUserId);
    expect(updated.find((n) => n.id === notif.id)?.read).toBe(true);
  });
});
