// Why a clinician discarded a draft assessment. Recorded in the audit log as
// "assessment_discarded:<CODE>" (no schema change), and summarised on the
// Evidence page so human oversight is visible, not just possible.

export const DISCARD_REASONS = ["DISAGREE", "INPUT_ERROR", "AWAITING_RESULTS", "NOT_NEEDED", "OTHER"] as const;
export type DiscardReason = (typeof DISCARD_REASONS)[number];

export const DISCARD_ACTION_PREFIX = "assessment_discarded";

export function isDiscardReason(x: unknown): x is DiscardReason {
  return typeof x === "string" && (DISCARD_REASONS as readonly string[]).includes(x);
}

/** Reason code from an audit action, or null for discards recorded before reasons existed. */
export function reasonFromAction(action: string): DiscardReason | null {
  const code = action.split(":")[1];
  return isDiscardReason(code) ? code : null;
}
