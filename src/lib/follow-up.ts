// Helpers for the closed-loop follow-up workflow. Keeps the status transitions
// and "lost in the system" detection in one place.

export const FOLLOW_UP_STATUSES = [
  "ALERT_RAISED",
  "APPOINTMENT_SCHEDULED",
  "IN_FOLLOW_UP",
  "CLOSED",
  "LOST"
] as const;

export type FollowUpStatus = (typeof FOLLOW_UP_STATUSES)[number];

export const STATUS_LABELS: Record<FollowUpStatus, string> = {
  ALERT_RAISED: "Alert raised",
  APPOINTMENT_SCHEDULED: "Appointment scheduled",
  IN_FOLLOW_UP: "In follow-up",
  CLOSED: "Closed",
  LOST: "Lost in the system"
};

// A follow-up is considered at risk of being "lost" when an alert was raised but
// no appointment has been scheduled within the threshold.
export function isAtRisk(status: FollowUpStatus, createdAt: string, thresholdDays = 14): boolean {
  if (status !== "ALERT_RAISED") return false;
  const created = new Date(createdAt).getTime();
  const ageDays = (Date.now() - created) / (1000 * 60 * 60 * 24);
  return ageDays >= thresholdDays;
}
