// Client-safe appointment types, constants and text helpers.
// Safe to import in both Client Components and Server code without pulling in DB / crypto.

export type AppointmentStatus =
  | "NONE"
  | "REQUESTED"
  | "SUGGESTED"
  | "ACCEPTED"
  | "SCHEDULED"
  | "CANCELLED"
  | "IN_FOLLOW_UP";

export interface AppointmentState {
  status: AppointmentStatus;
  followUpId?: string;
  slot?: string;
  reason?: string;
  suggestedBy?: string;
  scheduledAt?: string;
  isAtRisk?: boolean;
  note?: string;
  cancelNote?: string;
  cancelledBy?: "PATIENT" | "CLINICIAN";
}

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

/** Extract cancel note from follow-up note text if present. */
export function parseCancelNoteFromNote(note: string | null | undefined): string | null {
  if (!note) return null;
  const match = note.match(/Cancel note:\s*([^.\n|\]]+)/i);
  return match ? match[1].trim() : null;
}
