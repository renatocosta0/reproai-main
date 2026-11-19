import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { canAccessCase } from "@/lib/clinician-scope";
import { openFollowUpByClinician } from "./follow-up-server";

vi.mock("@/lib/db", () => ({
  prisma: {
    followUp: {
      findFirst: vi.fn(),
      create: vi.fn()
    },
    user: {
      findMany: vi.fn().mockResolvedValue([{ id: "patient-1" }])
    },
    careNotification: {
      create: vi.fn(async ({ data }: any) => ({
        id: "notification-1", ...data, readAt: null, createdAt: new Date()
      }))
    }
  }
}));

vi.mock("@/lib/clinician-scope", () => ({ canAccessCase: vi.fn() }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));

describe("clinician follow-up opening", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (canAccessCase as any).mockResolvedValue(true);
    (prisma.followUp.findFirst as any).mockResolvedValue(null);
    (prisma.followUp.create as any).mockResolvedValue({
      id: "follow-up-1", coupleId: "case-1", status: "ALERT_RAISED", note: "Please book a review."
    });
  });

  it("creates an alert and a privacy-safe patient notification", async () => {
    const item = await openFollowUpByClinician("clinician-1", "case-1", "Please book a review.");

    expect(item.status).toBe("ALERT_RAISED");
    expect(prisma.followUp.create).toHaveBeenCalledWith({
      data: { coupleId: "case-1", status: "ALERT_RAISED", note: "Please book a review." }
    });
    expect(prisma.careNotification.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId: "patient-1",
        type: "FOLLOW_UP_OPENED",
        url: "/patient/overview"
      })
    }));
  });

  it("does not create a duplicate active follow-up", async () => {
    (prisma.followUp.findFirst as any).mockResolvedValue({ id: "existing" });

    await expect(openFollowUpByClinician("clinician-1", "case-1")).rejects.toThrow("already has an active follow-up");
    expect(prisma.followUp.create).not.toHaveBeenCalled();
  });
});
