// Server-side appointment and consultation operations.
// Interacts with Prisma database, audit log, and care notifications.

import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { dispatchCareNotification } from "@/lib/notifications";
import { isAtRisk, type FollowUpStatus } from "@/lib/follow-up";
import { canAccessCase } from "@/lib/clinician-scope";
import {
  DEFAULT_SUGGESTED_SLOTS,
  parseReasonFromNote,
  parseSlotFromNote,
  type AppointmentState
} from "@/lib/appointment";

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

  // Find the latest active follow-up for this case
  const followUp = await prisma.followUp.findFirst({
    where: {
      coupleId: user.coupleId,
      status: { in: ["ALERT_RAISED", "APPOINTMENT_SCHEDULED", "IN_FOLLOW_UP"] }
    },
    orderBy: { createdAt: "desc" }
  });

  if (!followUp) {
    return { status: "NONE" };
  }

  const slot = parseSlotFromNote(followUp.note) || DEFAULT_SUGGESTED_SLOTS[0];
  const reason = parseReasonFromNote(followUp.note) || "Follow-up discussion on latest biomarkers and cycle trajectory.";
  const atRisk = isAtRisk(followUp.status as FollowUpStatus, followUp.createdAt.toISOString());

  if (followUp.status === "APPOINTMENT_SCHEDULED") {
    return {
      status: "SCHEDULED",
      followUpId: followUp.id,
      slot,
      reason,
      scheduledAt: followUp.updatedAt.toISOString(),
      note: followUp.note ?? undefined
    };
  }

  if (followUp.status === "IN_FOLLOW_UP") {
    return {
      status: "IN_FOLLOW_UP",
      followUpId: followUp.id,
      slot,
      reason,
      scheduledAt: followUp.updatedAt.toISOString(),
      note: followUp.note ?? undefined
    };
  }

  // ALERT_RAISED: consultation is recommended / suggested to the patient
  return {
    status: "SUGGESTED",
    followUpId: followUp.id,
    slot,
    reason,
    isAtRisk: atRisk,
    note: followUp.note ?? undefined
  };
}

/**
 * Patient action: confirm or request an appointment in one tap.
 * Transitions FollowUp status to APPOINTMENT_SCHEDULED and writes audit log.
 */
export async function confirmAppointmentByPatient(
  userId: string,
  chosenSlot?: string,
  userNote?: string
): Promise<{ ok: boolean; appointment: AppointmentState }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { coupleId: true, email: true }
  });

  if (!user || !user.coupleId) {
    throw new Error("No active care case found for this user.");
  }

  const slot = chosenSlot || DEFAULT_SUGGESTED_SLOTS[0];

  // Find existing follow-up or create a new one
  let followUp = await prisma.followUp.findFirst({
    where: {
      coupleId: user.coupleId,
      status: { in: ["ALERT_RAISED", "APPOINTMENT_SCHEDULED", "IN_FOLLOW_UP"] }
    },
    orderBy: { createdAt: "desc" }
  });

  const bookingNote = `[Appointment Confirmed: ${slot}] ${userNote ? `Patient note: ${userNote.trim()}` : ""}`.trim();

  if (followUp) {
    followUp = await prisma.followUp.update({
      where: { id: followUp.id },
      data: {
        status: "APPOINTMENT_SCHEDULED",
        note: followUp.note ? `${followUp.note} | ${bookingNote}` : bookingNote
      }
    });
  } else {
    followUp = await prisma.followUp.create({
      data: {
        coupleId: user.coupleId,
        status: "APPOINTMENT_SCHEDULED",
        note: bookingNote
      }
    });
  }

  // Audit status transition for metric tracking (Signal -> Appointment)
  await audit(userId, "status_transition", `follow_up:${followUp.id}:APPOINTMENT_SCHEDULED`);

  // Dispatch confirmation notification to the patient
  await dispatchCareNotification({
    caseId: user.coupleId,
    targetUserId: userId,
    actorId: userId,
    type: "APPOINTMENT_CONFIRMED",
    title: "ReproAI · Appointment Confirmed",
    body: `Your 15-minute consultation is booked for ${slot}. Tap to view your preparation notes.`,
    url: "/patient/overview"
  }).catch((e) => console.error("Notification error:", e));

  return {
    ok: true,
    appointment: {
      status: "SCHEDULED",
      followUpId: followUp.id,
      slot,
      reason: parseReasonFromNote(followUp.note) || undefined,
      scheduledAt: followUp.updatedAt.toISOString(),
      note: followUp.note ?? undefined
    }
  };
}

/**
 * Clinician action: suggest a consultation slot to the patient.
 * Creates/updates FollowUp with ALERT_RAISED and dispatches notification.
 */
export async function suggestAppointmentByClinician(
  clinicianId: string,
  coupleId: string,
  slot?: string,
  reason?: string
): Promise<{ ok: boolean; followUp: any }> {
  if (!(await canAccessCase(clinicianId, coupleId))) {
    throw new Error("This case is not in your care list.");
  }

  const chosenSlot = slot || DEFAULT_SUGGESTED_SLOTS[0];
  const clinicalReason = reason || "Review recent biomarker trajectory and discuss optimal care pathway.";
  const suggestionNote = `[Consultation Suggested] Slot: ${chosenSlot} | Reason: ${clinicalReason}`;

  // Check if open follow-up already exists
  let followUp = await prisma.followUp.findFirst({
    where: {
      coupleId,
      status: { in: ["ALERT_RAISED", "APPOINTMENT_SCHEDULED"] }
    },
    orderBy: { createdAt: "desc" }
  });

  if (followUp) {
    followUp = await prisma.followUp.update({
      where: { id: followUp.id },
      data: {
        status: "ALERT_RAISED",
        note: `${followUp.note ?? ""} | ${suggestionNote}`.trim()
      }
    });
  } else {
    followUp = await prisma.followUp.create({
      data: {
        coupleId,
        status: "ALERT_RAISED",
        note: suggestionNote
      }
    });
  }

  // Audit suggestion
  await audit(clinicianId, "consultation_suggested", `follow_up:${followUp.id}:couple:${coupleId}`);

  // Dispatch lock-screen & in-app notification to the patient
  await dispatchCareNotification({
    caseId: coupleId,
    actorId: clinicianId,
    type: "APPOINTMENT_SUGGESTED",
    title: "ReproAI · Dr. Fatima",
    body: `Your care team suggested a follow-up consultation (${chosenSlot}). Tap to confirm in 1 touch.`,
    url: "/patient/overview"
  }).catch((e) => console.error("Notification dispatch failed:", e));

  return { ok: true, followUp };
}
