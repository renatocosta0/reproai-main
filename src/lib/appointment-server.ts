// Server-side appointment and consultation operations.
// Interacts with Prisma database, audit log, and care notifications.

import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { dispatchCareNotification } from "@/lib/notifications";
import { isAtRisk, type FollowUpStatus } from "@/lib/follow-up";
import { canAccessCase } from "@/lib/clinician-scope";
import {
  parseReasonFromNote,
  parseSlotFromNote,
  parseCancelNoteFromNote,
  type AppointmentState
} from "@/lib/appointment";

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getPatientCoupleId(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { coupleId: true }
  });
  if (!user?.coupleId) throw new Error("No active care case found for this user.");
  return user.coupleId;
}

async function getActiveFollowUp(coupleId: string) {
  return prisma.followUp.findFirst({
    where: {
      coupleId,
      status: {
        in: [
          "ALERT_RAISED",
          "CONSULTATION_REQUESTED",
          "APPOINTMENT_SUGGESTED",
          "APPOINTMENT_SCHEDULED",
          "IN_FOLLOW_UP"
        ]
      }
    },
    orderBy: { createdAt: "desc" }
  });
}

function followUpToState(followUp: any): AppointmentState {
  const slot = parseSlotFromNote(followUp.note) ?? undefined;
  const reason = parseReasonFromNote(followUp.note) ?? undefined;
  const cancelNote = parseCancelNoteFromNote(followUp.note) ?? undefined;

  switch (followUp.status as FollowUpStatus) {
    case "ALERT_RAISED":
      return {
        status: "ALERT",
        followUpId: followUp.id,
        note: followUp.note ?? undefined,
        isAtRisk: isAtRisk(followUp.status, followUp.createdAt.toISOString())
      };
    case "CONSULTATION_REQUESTED":
      return {
        status: "REQUESTED",
        followUpId: followUp.id,
        slot,
        reason,
        isAtRisk: isAtRisk(followUp.status, followUp.createdAt.toISOString()),
        note: followUp.note ?? undefined
      };
    case "APPOINTMENT_SUGGESTED":
      return {
        status: "SUGGESTED",
        followUpId: followUp.id,
        slot,
        reason,
        note: followUp.note ?? undefined
      };
    case "APPOINTMENT_SCHEDULED":
      return {
        status: "SCHEDULED",
        followUpId: followUp.id,
        slot,
        reason,
        scheduledAt: followUp.updatedAt.toISOString(),
        note: followUp.note ?? undefined
      };
    case "IN_FOLLOW_UP":
      return {
        status: "IN_FOLLOW_UP",
        followUpId: followUp.id,
        slot,
        reason,
        scheduledAt: followUp.updatedAt.toISOString(),
        note: followUp.note ?? undefined
      };
    case "APPOINTMENT_CANCELLED":
      return {
        status: "CANCELLED",
        followUpId: followUp.id,
        cancelNote,
        note: followUp.note ?? undefined
      };
    default:
      return { status: "NONE" };
  }
}

// ─── Patient Actions ─────────────────────────────────────────────────────────

/**
 * Patient: request a consultation. Clinician must set date/time and confirm.
 * Creates FollowUp with status CONSULTATION_REQUESTED.
 */
export async function requestAppointmentByPatient(
  userId: string,
  requestNote?: string
): Promise<{ ok: boolean; appointment: AppointmentState }> {
  const coupleId = await getPatientCoupleId(userId);

  const noteText = `[Consultation Requested]${requestNote ? ` Patient note: ${requestNote.trim()}` : ""}`;

  let followUp = await getActiveFollowUp(coupleId);

  if (followUp && followUp.status === "ALERT_RAISED") {
    // Upgrade an existing alert to a patient-initiated request
    followUp = await prisma.followUp.update({
      where: { id: followUp.id },
      data: {
        status: "CONSULTATION_REQUESTED",
        note: followUp.note ? `${followUp.note} | ${noteText}` : noteText
      }
    });
  } else if (!followUp) {
    followUp = await prisma.followUp.create({
      data: {
        coupleId,
        status: "CONSULTATION_REQUESTED",
        note: noteText
      }
    });
  } else {
    // Already has an active state (suggested/scheduled/in-follow-up), return current state
    return { ok: true, appointment: followUpToState(followUp) };
  }

  await audit(userId, "consultation_requested", `follow_up:${followUp.id}:CONSULTATION_REQUESTED`);

  await dispatchCareNotification({
    caseId: coupleId,
    targetRole: "CLINICIAN",
    actorId: userId,
    type: "APPOINTMENT_REQUESTED",
    title: "ReproAI · Patient Request",
    body: "A care case has a follow-up request. Open the case to review it.",
    url: `/clinician/patient/${coupleId}`
  }).catch((e) => console.error("Notification error:", e));

  return { ok: true, appointment: followUpToState(followUp) };
}

/**
 * Patient: accept a clinician-suggested slot.
 * Transitions to CONSULTATION_REQUESTED so clinician can confirm the booking.
 */
export async function acceptSuggestionByPatient(
  userId: string,
  followUpId: string
): Promise<{ ok: boolean; appointment: AppointmentState }> {
  const coupleId = await getPatientCoupleId(userId);

  const followUp = await prisma.followUp.findFirst({
    where: { id: followUpId, coupleId, status: "APPOINTMENT_SUGGESTED" }
  });
  if (!followUp) throw new Error("No pending suggestion found.");

  const updated = await prisma.followUp.update({
    where: { id: followUpId },
    data: {
      status: "CONSULTATION_REQUESTED",
      note: followUp.note ? `${followUp.note} | [Patient Accepted]` : "[Patient Accepted]"
    }
  });

  await audit(userId, "suggestion_accepted", `follow_up:${followUpId}:CONSULTATION_REQUESTED`);

  await dispatchCareNotification({
    caseId: coupleId,
    targetRole: "CLINICIAN",
    actorId: userId,
    type: "APPOINTMENT_ACCEPTED",
    title: "ReproAI · Patient Accepted",
    body: "A care case has accepted the suggested follow-up. Open the case to confirm the appointment.",
    url: `/clinician/patient/${coupleId}`
  }).catch((e) => console.error("Notification error:", e));

  return { ok: true, appointment: followUpToState(updated) };
}

/**
 * Patient: decline a clinician-suggested slot.
 * Transitions back to ALERT_RAISED so clinician can suggest again.
 */
export async function declineSuggestionByPatient(
  userId: string,
  followUpId: string,
  declineNote?: string
): Promise<{ ok: boolean; appointment: AppointmentState }> {
  const coupleId = await getPatientCoupleId(userId);

  const followUp = await prisma.followUp.findFirst({
    where: { id: followUpId, coupleId, status: "APPOINTMENT_SUGGESTED" }
  });
  if (!followUp) throw new Error("No pending suggestion found.");

  const noteText = `[Patient Declined]${declineNote ? ` Reason: ${declineNote.trim()}` : ""}`;
  const updated = await prisma.followUp.update({
    where: { id: followUpId },
    data: {
      status: "ALERT_RAISED",
      note: followUp.note ? `${followUp.note} | ${noteText}` : noteText
    }
  });

  await audit(userId, "suggestion_declined", `follow_up:${followUpId}:ALERT_RAISED`);

  await dispatchCareNotification({
    caseId: coupleId,
    targetRole: "CLINICIAN",
    actorId: userId,
    type: "APPOINTMENT_DECLINED",
    title: "ReproAI · Patient Declined Slot",
    body: "A care case needs a new follow-up suggestion. Open the case to review next steps.",
    url: `/clinician/patient/${coupleId}`
  }).catch((e) => console.error("Notification error:", e));

  return { ok: true, appointment: followUpToState(updated) };
}

// ─── Clinician Actions ───────────────────────────────────────────────────────

/**
 * Clinician: suggest a consultation slot to the patient.
 * Patient must accept before clinician can confirm/schedule.
 */
export async function suggestSlotByClinician(
  clinicianId: string,
  coupleId: string,
  slot: string,
  reason?: string
): Promise<{ ok: boolean; followUp: any }> {
  if (!(await canAccessCase(clinicianId, coupleId))) {
    throw new Error("This case is not in your care list.");
  }

  const clinicalReason = reason || "Review recent biomarker trajectory and discuss optimal care pathway.";
  const suggestionNote = `[Consultation Suggested] Slot: ${slot} | Reason: ${clinicalReason}`;

  let followUp = await getActiveFollowUp(coupleId);

  if (followUp && ["ALERT_RAISED", "CONSULTATION_REQUESTED"].includes(followUp.status)) {
    followUp = await prisma.followUp.update({
      where: { id: followUp.id },
      data: {
        status: "APPOINTMENT_SUGGESTED",
        note: followUp.note ? `${followUp.note} | ${suggestionNote}` : suggestionNote
      }
    });
  } else if (!followUp) {
    followUp = await prisma.followUp.create({
      data: {
        coupleId,
        status: "APPOINTMENT_SUGGESTED",
        note: suggestionNote
      }
    });
  } else {
    throw new Error("Case already has an active appointment or suggestion.");
  }

  await audit(clinicianId, "slot_suggested", `follow_up:${followUp.id}:APPOINTMENT_SUGGESTED`);

  await dispatchCareNotification({
    caseId: coupleId,
    targetRole: "PATIENT",
    actorId: clinicianId,
    type: "APPOINTMENT_SUGGESTED",
    title: "ReproAI · Consultation Suggestion",
    body: "Your care team suggested a follow-up time. Open your portal to review it.",
    url: "/patient/overview"
  }).catch((e) => console.error("Notification dispatch failed:", e));

  return { ok: true, followUp };
}

/**
 * Clinician: confirm and finalize the appointment (after patient accepted or requested).
 * Transitions to APPOINTMENT_SCHEDULED.
 */
export async function confirmBookingByClinician(
  clinicianId: string,
  coupleId: string,
  followUpId: string,
  finalSlot: string,
  notes?: string
): Promise<{ ok: boolean; followUp: any }> {
  if (!(await canAccessCase(clinicianId, coupleId))) {
    throw new Error("This case is not in your care list.");
  }

  const followUp = await prisma.followUp.findFirst({
    where: {
      id: followUpId,
      coupleId,
      status: { in: ["CONSULTATION_REQUESTED", "ALERT_RAISED"] }
    }
  });
  if (!followUp) throw new Error("No pending request found to confirm.");

  const confirmNote = `[Appointment Confirmed: ${finalSlot}]${notes ? ` Clinician notes: ${notes.trim()}` : ""}`;
  const updated = await prisma.followUp.update({
    where: { id: followUpId },
    data: {
      status: "APPOINTMENT_SCHEDULED",
      note: followUp.note ? `${followUp.note} | ${confirmNote}` : confirmNote
    }
  });

  await audit(clinicianId, "status_transition", `follow_up:${followUpId}:APPOINTMENT_SCHEDULED`);

  await dispatchCareNotification({
    caseId: coupleId,
    targetRole: "PATIENT",
    actorId: clinicianId,
    type: "APPOINTMENT_CONFIRMED",
    title: "ReproAI · Appointment Confirmed",
    body: "Your consultation has been confirmed. Open your portal to review the details.",
    url: "/patient/overview"
  }).catch((e) => console.error("Notification error:", e));

  return { ok: true, followUp: updated };
}

/**
 * Cancel an appointment/request — works for both patient and clinician.
 * Sets status to APPOINTMENT_CANCELLED with optional note.
 */
export async function cancelAppointment(
  actorId: string,
  actorRole: "PATIENT" | "CLINICIAN",
  followUpId: string,
  cancelNote?: string
): Promise<{ ok: boolean; appointment: AppointmentState }> {
  const followUp = await prisma.followUp.findUnique({ where: { id: followUpId } });
  if (!followUp) throw new Error("Follow-up not found.");

  // Authorisation: patients can only cancel their own couple's follow-up
  if (actorRole === "PATIENT") {
    const coupleId = await getPatientCoupleId(actorId);
    if (followUp.coupleId !== coupleId) throw new Error("Unauthorized.");
  } else {
    if (!(await canAccessCase(actorId, followUp.coupleId))) throw new Error("Unauthorized.");
  }

  const noteText = `[Cancelled by ${actorRole}]${cancelNote ? ` Cancel note: ${cancelNote.trim()}` : ""}`;
  const updated = await prisma.followUp.update({
    where: { id: followUpId },
    data: {
      status: "APPOINTMENT_CANCELLED",
      note: followUp.note ? `${followUp.note} | ${noteText}` : noteText
    }
  });

  await audit(actorId, "appointment_cancelled", `follow_up:${followUpId}:APPOINTMENT_CANCELLED`);

  const isPatient = actorRole === "PATIENT";
  await dispatchCareNotification({
    caseId: followUp.coupleId,
    targetRole: isPatient ? "CLINICIAN" : "PATIENT",
    actorId,
    type: "APPOINTMENT_CANCELLED",
    title: "ReproAI · Appointment Cancelled",
    // Keep user-entered cancellation details out of notification previews.
    body: "An appointment was cancelled. Open your portal to review the update.",
    url: actorRole === "PATIENT" ? `/clinician/patient/${followUp.coupleId}` : "/patient/overview"
  }).catch((e) => console.error("Notification error:", e));

  return { ok: true, appointment: { status: "NONE" } };
}

/**
 * Get the current appointment / consultation state for a signed-in patient.
 */
export async function getPatientAppointmentState(userId: string): Promise<AppointmentState> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { coupleId: true }
  });

  if (!user || !user.coupleId) {
    return { status: "NONE" };
  }

  const followUp = await getActiveFollowUp(user.coupleId);

  if (!followUp) {
    return { status: "NONE" };
  }

  return followUpToState(followUp);
}

// Backward-compat aliases used in existing tests and old API routes
export const confirmAppointmentByPatient = requestAppointmentByPatient;
export const suggestAppointmentByClinician = suggestSlotByClinician;
