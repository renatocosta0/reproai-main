import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  parseSlotFromNote,
  parseReasonFromNote,
  parseCancelNoteFromNote
} from "./appointment";
import {
  requestAppointmentByPatient,
  acceptSuggestionByPatient,
  declineSuggestionByPatient,
  suggestSlotByClinician,
  confirmBookingByClinician,
  cancelAppointment,
  // backward-compat aliases
  confirmAppointmentByPatient,
  suggestAppointmentByClinician
} from "./appointment-server";
import { prisma } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  prisma: {
    invitation: {
      findMany: vi.fn().mockResolvedValue([])
    },
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([])
    },
    followUp: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
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

const mockUser = { id: "user-1", coupleId: "couple-1", email: "patient@example.com" };
const baseFollowUp = {
  id: "fu-1",
  coupleId: "couple-1",
  status: "ALERT_RAISED",
  note: null,
  createdAt: new Date(),
  updatedAt: new Date()
};

beforeEach(() => {
  vi.clearAllMocks();
  (prisma.user.findUnique as any).mockResolvedValue(mockUser);
});

describe("Note parsing helpers", () => {
  it("parses slot from follow-up note", () => {
    expect(parseSlotFromNote("[Appointment Confirmed: Thursday, 18:00 (Telehealth)]")).toBe(
      "Thursday, 18:00 (Telehealth)"
    );
    expect(
      parseSlotFromNote("[Consultation Suggested] Slot: Saturday, 10:30 (In-Clinic) | Reason: AMH review")
    ).toBe("Saturday, 10:30 (In-Clinic)");
    expect(parseSlotFromNote(null)).toBeNull();
    expect(parseSlotFromNote("No slot mentioned here.")).toBeNull();
  });

  it("parses reason from follow-up note", () => {
    expect(parseReasonFromNote("Slot: Thu 18:00 | Reason: Discuss low AMH")).toBe("Discuss low AMH");
    expect(parseReasonFromNote(null)).toBeNull();
    expect(parseReasonFromNote("Plain follow-up note")).toBeNull();
  });

  it("parses cancel note from follow-up note", () => {
    expect(parseCancelNoteFromNote("[Cancelled by PATIENT] Cancel note: Schedule conflict")).toBe(
      "Schedule conflict"
    );
    expect(parseCancelNoteFromNote(null)).toBeNull();
  });
});

describe("Patient: request appointment", () => {
  it("creates CONSULTATION_REQUESTED when no active follow-up exists", async () => {
    (prisma.followUp.findFirst as any).mockResolvedValue(null);
    (prisma.followUp.create as any).mockResolvedValue({
      ...baseFollowUp,
      status: "CONSULTATION_REQUESTED",
      note: "[Consultation Requested]"
    });

    const result = await requestAppointmentByPatient("user-1", "Need help reviewing cycle");
    expect(result.ok).toBe(true);
    expect(result.appointment.status).toBe("REQUESTED");
    expect(prisma.followUp.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "CONSULTATION_REQUESTED" }) })
    );
  });

  it("upgrades ALERT_RAISED to CONSULTATION_REQUESTED", async () => {
    (prisma.followUp.findFirst as any).mockResolvedValue(baseFollowUp);
    (prisma.followUp.update as any).mockResolvedValue({
      ...baseFollowUp,
      status: "CONSULTATION_REQUESTED"
    });

    const result = await requestAppointmentByPatient("user-1");
    expect(result.ok).toBe(true);
    expect(prisma.followUp.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "CONSULTATION_REQUESTED" }) })
    );
  });
});

describe("Clinician: suggest slot", () => {
  it("creates APPOINTMENT_SUGGESTED and notifies patient", async () => {
    (prisma.followUp.findFirst as any).mockResolvedValue(null);
    (prisma.followUp.create as any).mockResolvedValue({
      ...baseFollowUp,
      status: "APPOINTMENT_SUGGESTED",
      note: "[Consultation Suggested] Slot: Monday 10:00 | Reason: AMH review"
    });

    const result = await suggestSlotByClinician("clin-1", "couple-1", "Monday 10:00", "AMH review");
    expect(result.ok).toBe(true);
    expect(prisma.followUp.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "APPOINTMENT_SUGGESTED" }) })
    );
  });
});

describe("Patient: accept suggestion", () => {
  it("transitions APPOINTMENT_SUGGESTED to CONSULTATION_REQUESTED", async () => {
    const suggested = {
      ...baseFollowUp,
      status: "APPOINTMENT_SUGGESTED",
      note: "[Consultation Suggested] Slot: Monday 10:00"
    };
    (prisma.followUp.findFirst as any).mockResolvedValue(suggested);
    (prisma.followUp.update as any).mockResolvedValue({ ...suggested, status: "CONSULTATION_REQUESTED" });

    const result = await acceptSuggestionByPatient("user-1", "fu-1");
    expect(result.ok).toBe(true);
    expect(prisma.followUp.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "CONSULTATION_REQUESTED" }) })
    );
  });
});

describe("Patient: decline suggestion", () => {
  it("transitions APPOINTMENT_SUGGESTED back to ALERT_RAISED", async () => {
    const suggested = {
      ...baseFollowUp,
      status: "APPOINTMENT_SUGGESTED",
      note: "[Consultation Suggested] Slot: Monday 10:00"
    };
    (prisma.followUp.findFirst as any).mockResolvedValue(suggested);
    (prisma.followUp.update as any).mockResolvedValue({ ...suggested, status: "ALERT_RAISED" });

    const result = await declineSuggestionByPatient("user-1", "fu-1", "Time doesn't work");
    expect(result.ok).toBe(true);
    expect(prisma.followUp.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "ALERT_RAISED" }) })
    );
  });
});

describe("Clinician: confirm booking", () => {
  it("transitions CONSULTATION_REQUESTED to APPOINTMENT_SCHEDULED", async () => {
    const requested = { ...baseFollowUp, status: "CONSULTATION_REQUESTED" };
    (prisma.followUp.findFirst as any).mockResolvedValue(requested);
    (prisma.followUp.update as any).mockResolvedValue({ ...requested, status: "APPOINTMENT_SCHEDULED" });

    const result = await confirmBookingByClinician("clin-1", "couple-1", "fu-1", "Monday 10:00", "Bring cycle chart");
    expect(result.ok).toBe(true);
    expect(prisma.followUp.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "APPOINTMENT_SCHEDULED" }) })
    );
  });
});

describe("Cancel appointment", () => {
  it("patient can cancel with optional note and returns status NONE", async () => {
    const scheduled = { ...baseFollowUp, status: "APPOINTMENT_SCHEDULED", coupleId: "couple-1" };
    (prisma.followUp.findUnique as any).mockResolvedValue(scheduled);
    (prisma.followUp.update as any).mockResolvedValue({
      ...scheduled,
      status: "APPOINTMENT_CANCELLED",
      note: "[Cancelled by PATIENT] Cancel note: Family emergency"
    });

    const result = await cancelAppointment("user-1", "PATIENT", "fu-1", "Family emergency");
    expect(result.ok).toBe(true);
    expect(result.appointment.status).toBe("NONE");
    expect(prisma.followUp.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "APPOINTMENT_CANCELLED" }) })
    );
  });

  it("clinician can cancel with note and returns status NONE", async () => {
    const scheduled = { ...baseFollowUp, status: "APPOINTMENT_SCHEDULED", coupleId: "couple-1" };
    (prisma.followUp.findUnique as any).mockResolvedValue(scheduled);
    (prisma.followUp.update as any).mockResolvedValue({ ...scheduled, status: "APPOINTMENT_CANCELLED" });

    const result = await cancelAppointment("clin-1", "CLINICIAN", "fu-1", "Doctor unavailable");
    expect(result.ok).toBe(true);
    expect(result.appointment.status).toBe("NONE");
  });
});

describe("Backward compatibility exports", () => {
  it("confirmAppointmentByPatient is an alias for requestAppointmentByPatient", () => {
    expect(confirmAppointmentByPatient).toBe(requestAppointmentByPatient);
  });

  it("suggestAppointmentByClinician is an alias for suggestSlotByClinician", () => {
    expect(suggestAppointmentByClinician).toBe(suggestSlotByClinician);
  });
});
