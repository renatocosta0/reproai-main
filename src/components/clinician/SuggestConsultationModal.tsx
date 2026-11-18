"use client";

import { useState } from "react";
import { CalendarCheck, Loader2, Sparkles, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { FormError } from "@/components/ui/Notice";
import { api, userMessage } from "@/lib/api-client";
import { useClinicianText } from "@/components/clinician/useClinicianText";

interface SuggestConsultationModalProps {
  caseId: string;
  patientName: string;
  defaultReason?: string;
  onClose: () => void;
  onSuccess: (notice: string) => void;
}

const STRINGS = {
  en: {
    title: "Suggest Follow-up Consultation",
    sub: "Suggest a date and time to the patient. They will need to accept before the appointment is confirmed by you.",
    slotLabel: "Proposed Date & Time",
    slotPlaceholder: "e.g. Monday 10 Feb, 14:00 (Telehealth)",
    reasonLabel: "Clinical Reason",
    reasonPlaceholder: "e.g. Review AMH trajectory and discuss next steps.",
    sendBtn: "Send Suggestion to Patient",
    sending: "Sending\u2026",
    cancel: "Cancel",
    slotRequired: "Please enter a proposed date and time.",
    successMsg: "Suggestion sent. Waiting for patient acceptance — you\u2019ll confirm after they accept."
  },
  ar: {
    title: "\u0627\u0642\u062a\u0631\u0627\u062d \u0645\u0648\u0639\u062f \u0627\u0633\u062a\u0634\u0627\u0631\u0629",
    sub: "\u0627\u0642\u062a\u0631\u062d \u062a\u0627\u0631\u064a\u062e\u0627\u064b \u0648\u0648\u0642\u062a\u0627\u064b \u0644\u0644\u0645\u0631\u064a\u0636. \u064a\u062c\u0628 \u0623\u0646 \u064a\u0648\u0627\u0641\u0642 \u0627\u0644\u0645\u0631\u064a\u0636 \u0642\u0628\u0644 \u062a\u0623\u0643\u064a\u062f \u0627\u0644\u0645\u0648\u0639\u062f.",
    slotLabel: "\u0627\u0644\u062a\u0627\u0631\u064a\u062e \u0648\u0627\u0644\u0648\u0642\u062a \u0627\u0644\u0645\u0642\u062a\u0631\u062d",
    slotPlaceholder: "\u0645\u062b\u0627\u0644: \u0627\u0644\u0627\u062b\u0646\u064a\u0646 10 \u0641\u0628\u0631\u0627\u064a\u0631\u060c 14:00",
    reasonLabel: "\u0627\u0644\u0633\u0628\u0628 \u0627\u0644\u0633\u0631\u064a\u0631\u064a",
    reasonPlaceholder: "\u0645\u062b\u0627\u0644: \u0645\u0631\u0627\u062c\u0639\u0629 \u0645\u0633\u0627\u0631 AMH.",
    sendBtn: "\u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0627\u0642\u062a\u0631\u0627\u062d \u0644\u0644\u0645\u0631\u064a\u0636",
    sending: "\u062c\u0627\u0631\u064d \u0627\u0644\u0625\u0631\u0633\u0627\u0644\u2026",
    cancel: "\u0625\u0644\u063a\u0627\u0621",
    slotRequired: "\u064a\u064f\u0631\u062c\u0649 \u0625\u062f\u062e\u0627\u0644 \u0627\u0644\u062a\u0627\u0631\u064a\u062e \u0648\u0627\u0644\u0648\u0642\u062a \u0627\u0644\u0645\u0642\u062a\u0631\u062d.",
    successMsg: "\u062a\u0645 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0627\u0642\u062a\u0631\u0627\u062d. \u0641\u064a \u0627\u0646\u062a\u0638\u0627\u0631 \u0645\u0648\u0627\u0641\u0642\u0629 \u0627\u0644\u0645\u0631\u064a\u0636."
  }
};

export function SuggestConsultationModal({
  caseId,
  patientName,
  defaultReason,
  onClose,
  onSuccess
}: SuggestConsultationModalProps) {
  const { locale } = useClinicianText();
  const L = STRINGS[locale as keyof typeof STRINGS] ?? STRINGS.en;

  const [slot, setSlot] = useState("");
  const [reason, setReason] = useState(defaultReason ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSend() {
    if (!slot.trim()) {
      setError(L.slotRequired);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api(`/api/clinician/cases/${caseId}/suggest-appointment`, {
        method: "POST",
        body: JSON.stringify({ slot: slot.trim(), reason: reason.trim() })
      });
      onSuccess(L.successMsg);
      onClose();
    } catch (err) {
      setError(userMessage(err, "Failed to send suggestion."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={L.title} onClose={onClose}>
      <div style={{ padding: "4px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span
            className="chip purple"
            style={{ fontSize: 12, padding: "3px 10px", borderRadius: 16, display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Sparkles size={12} /> {patientName}
          </span>
        </div>

        <p style={{ fontSize: 13, color: "var(--muted, #64748b)", margin: "0 0 16px", lineHeight: 1.5 }}>
          {L.sub}
        </p>

        {error && (
          <div style={{ marginBottom: 12 }}>
            <FormError>{error}</FormError>
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
            {L.slotLabel}
          </label>
          <input
            type="text"
            value={slot}
            onChange={(e) => setSlot(e.target.value)}
            placeholder={L.slotPlaceholder}
            style={{
              width: "100%",
              padding: "9px 12px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              fontSize: 13,
              fontFamily: "inherit",
              boxSizing: "border-box"
            }}
          />
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
            {L.reasonLabel}
          </label>
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={L.reasonPlaceholder}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              fontSize: 13,
              fontFamily: "inherit",
              resize: "vertical"
            }}
          />
        </div>

        <div className="modal-actions" style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button type="button" className="secondary" onClick={onClose} disabled={busy}>
            {L.cancel}
          </button>
          <button
            type="button"
            className="primary"
            onClick={handleSend}
            disabled={busy}
            style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
          >
            {busy ? <Loader2 size={15} className="spin" /> : <CalendarCheck size={15} />}
            <span>{busy ? L.sending : L.sendBtn}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
