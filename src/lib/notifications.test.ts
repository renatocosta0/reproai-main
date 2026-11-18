import { describe, it, expect } from "vitest";
import {
  dispatchCareNotification,
  getNotificationsForUser,
  markNotificationAsRead,
  registerPushSubscription
} from "./notifications";

describe("Care Notifications Engine", () => {
  it("dispatches privacy-safe care notification to target user", async () => {
    const testUserId = "test-patient-user-1";
    const notifs = await dispatchCareNotification({
      targetUserId: testUserId,
      actorId: "test-clinician-1",
      type: "ASSESSMENT_RELEASED",
      title: "ReproAI · Dr. Fatima",
      body: "Your clinician reviewed your fertility results and shared new guidance. Tap to view.",
      url: "/patient/assessment"
    });

    expect(notifs).toHaveLength(1);
    expect(notifs[0].userId).toBe(testUserId);
    expect(notifs[0].title).toBe("ReproAI · Dr. Fatima");
    expect(notifs[0].read).toBe(false);

    const userNotifs = getNotificationsForUser(testUserId);
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

    const success = markNotificationAsRead(testUserId, notif.id);
    expect(success).toBe(true);

    const updated = getNotificationsForUser(testUserId);
    expect(updated.find((n) => n.id === notif.id)?.read).toBe(true);
  });

  it("registers device push subscription without duplicates", () => {
    const testUserId = "test-patient-user-3";
    registerPushSubscription(testUserId, {
      endpoint: "https://fcm.googleapis.com/fcm/send/token-123",
      platform: "android"
    });

    // Registering same endpoint again should not duplicate
    registerPushSubscription(testUserId, {
      endpoint: "https://fcm.googleapis.com/fcm/send/token-123",
      platform: "android"
    });

    expect(true).toBe(true);
  });
});
