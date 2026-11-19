"use client";

import { useState } from "react";
import { CalendarCheck, Loader2, Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { FormError } from "@/components/ui/Notice";
import { api, userMessage } from "@/lib/api-client";
import { useClinicianText } from "@/components/clinician/useClinicianText";
import { localToday, parseAppointmentSlot, serializeAppointmentSlot } from "@/lib/appointment-format";

interface ConfirmConsultationModalProps {
  caseId: string;
  patientName: string;
  followUpId: string;
  defaultSlot?: string;
  onClose: () => void;
  onSuccess: (notice: string) => void;
}

const STRINGS = {
  en: {
    title: "Confirm & Schedule Consultation",
    sub: "Set the confirmed date, time, and instructions. The patient will be notified immediately.",
    slotLabel: "Confirmed Date & Time",
    dateLabel: "Date",
    timeLabel: "Time",
    notesLabel: "Instructions / Notes for Patient (Optional)",
    notesPlaceholder: "e.g. Please have your recent cycle log open.",
    confirmBtn: "Confirm & Schedule",
    confirming: "Confirming…",
    cancel: "Cancel",
    slotRequired: "Please enter the confirmed date and time.",
    successMsg: "Appointment confirmed and notification sent to patient."
  },
  ar: {
    title: "تأكيد وجدولة الاستشارة",
    sub: "حدد التاريخ والوقت والتعليمات المؤكدة. سيتم إشعار المريض فوراً.",
    slotLabel: "التاريخ والوقت المؤكد",
    dateLabel: "التاريخ",
    timeLabel: "الوقت",
    notesLabel: "تعليمات / ملاحظات للمريض (اختياري)",
    notesPlaceholder: "مثال: يرجى تجهيز سجل الدورة الأخير.",
    confirmBtn: "تأكيد وجدولة الموعد",
    confirming: "جارٍ التأكيد…",
    cancel: "إلغاء",
    slotRequired: "يُرجى إدخال التاريخ والوقت المؤكد.",
    successMsg: "تم تأكيد الموعد وإرسال الإشعار للمريض بنجاح."
  }
};

export function ConfirmConsultationModal({
  caseId,
  patientName,
  followUpId,
  defaultSlot,
  onClose,
  onSuccess
}: ConfirmConsultationModalProps) {
  const { locale } = useClinicianText();
  const L = STRINGS[locale as keyof typeof STRINGS] ?? STRINGS.en;

  const initialSlot = parseAppointmentSlot(defaultSlot);
  const [slotDate, setSlotDate] = useState(initialSlot.date);
  const [slotTime, setSlotTime] = useState(initialSlot.time);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleConfirm() {
    if (!slotDate || !slotTime) {
      setError(L.slotRequired);
      return;
    }
    setBusy(true);
    setError("");

    try {
      await api(`/api/clinician/cases/${caseId}/suggest-appointment`, {
        method: "POST",
        body: JSON.stringify({
          action: "confirm",
          followUpId,
          slot: serializeAppointmentSlot(slotDate, slotTime),
          notes: notes.trim() || undefined
        })
      });
      onSuccess(L.successMsg);
      onClose();
    } catch (err) {
      setError(userMessage(err, "Failed to confirm appointment."));
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
          <span style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
            {L.slotLabel}
          </span>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(110px, 1fr)", gap: 8 }}>
            <label style={{ display: "grid", gap: 4, fontSize: 11.5, color: "var(--muted, #64748b)" }}>
              {L.dateLabel}
              <input type="date" value={slotDate} min={localToday()} onChange={(e) => setSlotDate(e.target.value)} required
                style={{ width: "100%", minWidth: 0, padding: "9px 10px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }} />
            </label>
            <label style={{ display: "grid", gap: 4, fontSize: 11.5, color: "var(--muted, #64748b)" }}>
              {L.timeLabel}
              <input type="time" value={slotTime} onChange={(e) => setSlotTime(e.target.value)} required
                style={{ width: "100%", minWidth: 0, padding: "9px 10px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }} />
            </label>
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
            {L.notesLabel}
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={L.notesPlaceholder}
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
            onClick={handleConfirm}
            disabled={busy}
            style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
          >
            {busy ? <Loader2 size={15} className="spin" /> : <CalendarCheck size={15} />}
            <span>{busy ? L.confirming : L.confirmBtn}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
