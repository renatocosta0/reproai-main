// Helpers for the closed-loop follow-up workflow. Keeps the status transitions
// and "lost in the system" detection in one place.

export const FOLLOW_UP_STATUSES = [
  "ALERT_RAISED",
  "CONSULTATION_REQUESTED",
  "APPOINTMENT_SUGGESTED",
  "APPOINTMENT_SCHEDULED",
  "IN_FOLLOW_UP",
  "APPOINTMENT_CANCELLED",
  "CLOSED",
  "LOST"
] as const;

export type FollowUpStatus = (typeof FOLLOW_UP_STATUSES)[number];

export const STATUS_LABELS: Record<FollowUpStatus, string> = {
  ALERT_RAISED: "Alert raised",
  CONSULTATION_REQUESTED: "Consultation requested",
  APPOINTMENT_SUGGESTED: "Awaiting patient acceptance",
  APPOINTMENT_SCHEDULED: "Appointment scheduled",
  IN_FOLLOW_UP: "In follow-up",
  APPOINTMENT_CANCELLED: "Appointment cancelled",
  CLOSED: "Closed",
  LOST: "Lost in the system"
};

/**
 * Progression that does not carry a patient-facing appointment action.
 * Appointment requests, suggestions, confirmations and cancellations must go
 * through appointment-server.ts so both the audit trail and notification are
 * kept in sync.
 */
const MANUAL_TRANSITIONS: Partial<Record<FollowUpStatus, readonly FollowUpStatus[]>> = {
  ALERT_RAISED: ["LOST"],
  CONSULTATION_REQUESTED: ["LOST"],
  APPOINTMENT_SCHEDULED: ["IN_FOLLOW_UP"],
  IN_FOLLOW_UP: ["CLOSED", "LOST"]
};

export function canManuallyTransitionFollowUp(from: FollowUpStatus, to: FollowUpStatus): boolean {
  return from === to || (MANUAL_TRANSITIONS[from] ?? []).includes(to);
}

// A follow-up is considered at risk of being "lost" when an alert was raised but
// no appointment has been scheduled within the threshold.
export function isAtRisk(status: FollowUpStatus, createdAt: string, thresholdDays = 14): boolean {
  if (status !== "ALERT_RAISED" && status !== "CONSULTATION_REQUESTED") return false;
  const created = new Date(createdAt).getTime();
  const ageDays = (Date.now() - created) / (1000 * 60 * 60 * 24);
  return ageDays >= thresholdDays;
}
