import { describe, it, expect, vi } from "vitest";
import {
  parseSlotFromNote,
  parseReasonFromNote,
  DEFAULT_SUGGESTED_SLOTS
} from "./appointment";
import {
  confirmAppointmentByPatient,
  suggestAppointmentByClinician
} from "./appointment-server";
import { prisma } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([])
    },
    followUp: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    },
    auditLog: {
      create: vi.fn()
    }
  }
}));

vi.mock("@/lib/clinician-scope", () => ({
  canAccessCase: vi.fn().mockResolvedValue(true)
}));

describe("Appointment & One-Tap Scheduling Flow", () => {
  it("parses slot correctly from follow-up note text", () => {
    expect(parseSlotFromNote("[Appointment Confirmed: Thursday, 18:00 (Telehealth)]")).toBe("Thursday, 18:00 (Telehealth)");
    expect(parseSlotFromNote("[Consultation Suggested] Slot: Saturday, 10:30 (In-Clinic) | Reason: Review AMH")).toBe("Saturday, 10:30 (In-Clinic)");
    expect(parseSlotFromNote(null)).toBeNull();
    expect(parseSlotFromNote("No slot mentioned here.")).toBeNull();
  });

  it("parses reason correctly from follow-up note text", () => {
    expect(parseReasonFromNote("[Consultation Suggested] Slot: Thursday, 18:00 | Reason: Discuss low AMH biomarker")).toBe("Discuss low AMH biomarker");
    expect(parseReasonFromNote(null)).toBeNull();
    expect(parseReasonFromNote("Plain follow-up note")).toBeNull();
  });

  it("confirms appointment by patient with one tap and sets status to APPOINTMENT_SCHEDULED", async () => {
    const mockUser = { id: "user-1", coupleId: "couple-1", email: "patient@example.com" };
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);

    const mockFollowUp = {
      id: "fu-1",
      coupleId: "couple-1",
      status: "ALERT_RAISED",
      note: "[Consultation Suggested] Slot: Thursday, 18:00 (Telehealth)",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    (prisma.followUp.findFirst as any).mockResolvedValue(mockFollowUp);
    (prisma.followUp.update as any).mockResolvedValue({
      ...mockFollowUp,
      status: "APPOINTMENT_SCHEDULED",
      note: "[Appointment Confirmed: Thursday, 18:00 (Telehealth)]"
    });

    const result = await confirmAppointmentByPatient("user-1", "Thursday, 18:00 (Telehealth)");

    expect(result.ok).toBe(true);
    expect(result.appointment.status).toBe("SCHEDULED");
    expect(result.appointment.slot).toBe("Thursday, 18:00 (Telehealth)");
    expect(prisma.followUp.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "fu-1" },
        data: expect.objectContaining({
          status: "APPOINTMENT_SCHEDULED"
        })
      })
    );
  });

  it("allows clinician to suggest consultation slot and dispatches care notification", async () => {
    const mockFollowUp = {
      id: "fu-2",
      coupleId: "couple-1",
      status: "ALERT_RAISED",
      note: "[Consultation Suggested] Slot: Saturday, 10:30 (In-Clinic)",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    (prisma.followUp.findFirst as any).mockResolvedValue(null);
    (prisma.followUp.create as any).mockResolvedValue(mockFollowUp);

    const result = await suggestAppointmentByClinician(
      "clinician-1",
      "couple-1",
      "Saturday, 10:30 (In-Clinic)",
      "Discuss reserve test"
    );

    expect(result.ok).toBe(true);
    expect(prisma.followUp.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          coupleId: "couple-1",
          status: "ALERT_RAISED"
        })
      })
    );
  });
});
