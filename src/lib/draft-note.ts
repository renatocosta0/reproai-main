// Shared key for handing the agent's draft release note from the assistant to
// the review card on the case page (sessionStorage, client only).

export const DRAFT_NOTE_KEY = "reproai.draftNote";

export function storeDraftNote(note: string): void {
  try {
    window.sessionStorage.setItem(DRAFT_NOTE_KEY, note);
  } catch {
    /* storage unavailable: the clinician can still copy the note manually */
  }
}

export function readDraftNote(): string | null {
  try {
    return window.sessionStorage.getItem(DRAFT_NOTE_KEY);
  } catch {
    return null;
  }
}

export function clearDraftNote(): void {
  try {
    window.sessionStorage.removeItem(DRAFT_NOTE_KEY);
  } catch {
    /* ignore */
  }
}
