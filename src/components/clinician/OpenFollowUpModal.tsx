"use client";

import { useState } from "react";
import { BellPlus, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { FormError } from "@/components/ui/Notice";
import { api, userMessage } from "@/lib/api-client";

export function OpenFollowUpModal({
  caseId,
  patientName,
  onClose,
  onSuccess
}: {
  caseId: string;
  patientName: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [note, setNote] = useState("I recommend scheduling a follow-up consultation to review your care plan together.");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (note.trim().length < 10) {
      setError("Add a short recommendation for the patient before opening the follow-up.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api("/api/follow-up", {
        method: "POST",
        body: JSON.stringify({ coupleId: caseId, note: note.trim() })
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(userMessage(err, "Could not open the follow-up."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Open patient follow-up" onClose={onClose}>
      <div className="modal-icon"><BellPlus size={21} /></div>
      <h2>{patientName}</h2>
      <p>The patient will receive a privacy-safe alert and can request a consultation from their portal.</p>
      <label className="field">
        <span>Recommendation for the patient <em>visible after sign-in</em></span>
        <textarea rows={4} value={note} onChange={(event) => setNote(event.target.value)} />
      </label>
      {error && <FormError>{error}</FormError>}
      <div className="modal-actions" style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button type="button" className="secondary" onClick={onClose} disabled={busy}>Cancel</button>
        <button type="button" className="primary" onClick={() => void submit()} disabled={busy} style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
          {busy ? <Loader2 size={15} className="spin" /> : <BellPlus size={15} />}
          {busy ? "Opening…" : "Open follow-up & notify patient"}
        </button>
      </div>
    </Modal>
  );
}
