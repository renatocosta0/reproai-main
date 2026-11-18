// Client-safe appointment types, constants and text helpers.
// Safe to import in both Client Components and Server code without pulling in DB / crypto.

export type AppointmentStatus = "NONE" | "SUGGESTED" | "SCHEDULED" | "IN_FOLLOW_UP";

export interface AppointmentState {
  status: AppointmentStatus;
  followUpId?: string;
  slot?: string;
  reason?: string;
  suggestedBy?: string;
  scheduledAt?: string;
  isAtRisk?: boolean;
  note?: string;
}

/** Default fast-pick slot options for low-friction one-tap booking. */
export const DEFAULT_SUGGESTED_SLOTS = [
  "Thursday, 18:00 (Telehealth)",
  "Saturday, 10:30 (In-Clinic)",
  "Tuesday, 14:00 (Telehealth)"
];

/** Extract slot from follow-up note text if present. */
export function parseSlotFromNote(note: string | null | undefined): string | null {
  if (!note) return null;
  const match = note.match(/(?:Slot|slot|Appointment Confirmed|Confirmed):\s*([^.\n|\]]+)/i);
  return match ? match[1].trim() : null;
}

/** Extract clinical reason from follow-up note text if present. */
export function parseReasonFromNote(note: string | null | undefined): string | null {
  if (!note) return null;
  const match = note.match(/(?:Reason|reason):\s*([^.\n|\]]+)/i);
  return match ? match[1].trim() : null;
}
