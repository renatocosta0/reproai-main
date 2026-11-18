"use client";

import { useState } from "react";
import { CalendarCheck, CalendarPlus, Clock, Loader2, Sparkles, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { FormError } from "@/components/ui/Notice";
import { api, userMessage } from "@/lib/api-client";
import { DEFAULT_SUGGESTED_SLOTS } from "@/lib/appointment";
import { useClinicianText } from "@/components/clinician/useClinicianText";

interface SuggestConsultationModalProps {
  caseId: string;
  patientName: string;
  defaultReason?: string;
  onClose: () => void;
  onSuccess: (notice: string) => void;
}

export function SuggestConsultationModal({
  caseId,
  patientName,
  defaultReason,
  onClose,
  onSuccess
}: SuggestConsultationModalProps) {
  const { L } = useClinicianText();
  const [slot, setSlot] = useState(DEFAULT_SUGGESTED_SLOTS[0]);
  const [customSlot, setCustomSlot] = useState("");
  const [reason, setReason] = useState(defaultReason || "Review recent biomarker trajectory and discuss optimal care pathway.");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSend() {
    setBusy(true);
    setError("");
    const finalSlot = customSlot.trim() || slot;

    try {
      await api(`/api/clinician/cases/${caseId}/suggest-appointment`, {
        method: "POST",
        body: JSON.stringify({ slot: finalSlot, reason: reason.trim() })
      });
      onSuccess(L.inviteSentNotice);
      onClose();
    } catch (err) {
      setError(userMessage(err, "Failed to send consultation invite."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={L.suggestConsultationTitle} onClose={onClose}>
      <div style={{ padding: "4px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span className="chip purple" style={{ fontSize: 12, padding: "3px 10px", borderRadius: 16 }}>
            <Sparkles size={13} /> {patientName}
          </span>
        </div>

        <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 6px" }}>
          {L.suggestConsultationTitle}
        </h2>
        <p style={{ fontSize: 13, color: "var(--muted, #64748b)", margin: "0 0 16px", lineHeight: 1.5 }}>
          {L.suggestConsultationSub}
        </p>

        {error && <div style={{ marginBottom: 12 }}><FormError>{error}</FormError></div>}

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
            {L.suggestSlotLabel}
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {DEFAULT_SUGGESTED_SLOTS.map((s) => (
              <label
                key={s}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: slot === s && !customSlot ? "1.5px solid #4f46e5" : "1px solid #e2e8f0",
                  background: slot === s && !customSlot ? "#f5f3ff" : "#ffffff",
                  cursor: "pointer",
                  fontSize: 13
                }}
              >
                <input
                  type="radio"
                  name="slot"
                  value={s}
                  checked={slot === s && !customSlot}
                  onChange={() => {
                    setSlot(s);
                    setCustomSlot("");
                  }}
                />
                <Clock size={14} color="#6366f1" />
                <span>{s}</span>
              </label>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
            {L.suggestReasonLabel}
          </label>
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
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

        <div className="modal-actions" style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
          <button type="button" className="secondary" onClick={onClose} disabled={busy}>
            {L.cancel}
          </button>
          <button type="button" className="primary" onClick={handleSend} disabled={busy}>
            {busy ? <Loader2 size={15} className="spin" /> : <CalendarCheck size={15} />}
            <span>{busy ? L.opening : L.sendInviteBtn}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
