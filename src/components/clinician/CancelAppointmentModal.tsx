"use client";

import { useState } from "react";
import { CalendarX, Loader2, Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { FormError } from "@/components/ui/Notice";
import { api, userMessage } from "@/lib/api-client";
import { useClinicianText } from "@/components/clinician/useClinicianText";

interface CancelAppointmentModalProps {
  caseId: string;
  patientName: string;
  followUpId: string;
  onClose: () => void;
  onSuccess: (notice: string) => void;
}

const STRINGS = {
  en: {
    title: "Cancel Appointment / Request",
    sub: "Are you sure you want to cancel this appointment or consultation request? The patient will be notified.",
    noteLabel: "Reason for Cancellation (Optional)",
    notePlaceholder: "e.g. Clinician unavailable / Schedule conflict / Handled via phone",
    cancelActionBtn: "Confirm Cancellation",
    cancelling: "Cancelling…",
    keepBtn: "Keep Appointment",
    successMsg: "Appointment cancelled."
  },
  ar: {
    title: "إلغاء الموعد / الطلب",
    sub: "هل أنت متأكد من رغبتك في إلغاء هذا الموعد أو طلب الاستشارة؟ سيتم إشعار المريض.",
    noteLabel: "سبب الإلغاء (اختياري)",
    notePlaceholder: "مثال: عدم تفرغ الطبيب / تعارض في الجدول / تم الحل هاتفياً",
    cancelActionBtn: "تأكيد الإلغاء",
    cancelling: "جارٍ الإلغاء…",
    keepBtn: "الإبقاء على الموعد",
    successMsg: "تم إلغاء الموعد."
  }
};

export function CancelAppointmentModal({
  caseId,
  patientName,
  followUpId,
  onClose,
  onSuccess
}: CancelAppointmentModalProps) {
  const { locale } = useClinicianText();
  const L = STRINGS[locale as keyof typeof STRINGS] ?? STRINGS.en;

  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleCancel() {
    setBusy(true);
    setError("");

    try {
      await api(`/api/clinician/cases/${caseId}/suggest-appointment`, {
        method: "DELETE",
        body: JSON.stringify({
          followUpId,
          note: note.trim() || undefined
        })
      });
      onSuccess(L.successMsg);
      onClose();
    } catch (err) {
      setError(userMessage(err, "Failed to cancel appointment."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={L.title} onClose={onClose}>
      <div style={{ padding: "4px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span
            className="chip peach"
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

        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
            {L.noteLabel}
          </label>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={L.notePlaceholder}
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
            {L.keepBtn}
          </button>
          <button
            type="button"
            className="danger"
            onClick={handleCancel}
            disabled={busy}
            style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
          >
            {busy ? <Loader2 size={15} className="spin" /> : <CalendarX size={15} />}
            <span>{busy ? L.cancelling : L.cancelActionBtn}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
