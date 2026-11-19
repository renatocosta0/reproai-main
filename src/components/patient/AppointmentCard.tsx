"use client";

import { useEffect, useState } from "react";
import {
  CalendarCheck,
  CalendarClock,
  CalendarOff,
  CalendarPlus,
  CalendarX,
  Check,
  Clock,
  Loader2,
  X
} from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleContext";
import { api, userMessage } from "@/lib/api-client";
import { FormError } from "@/components/ui/Notice";
import type { AppointmentState } from "@/lib/appointment";

const S = {
  en: {
    // NONE
    noneTitle: "Discuss your results with your clinician",
    noneSub: "Have questions about your trajectory? Request a 15-minute consultation with your care team.",
    requestBtn: "Request Consultation",
    requesting: "Sending request\u2026",
    // ALERT
    alertBadge: "Follow-up Recommended",
    alertTitle: "Your care team recommends a follow-up",
    alertNote: "Recommendation from your care team:",
    alertSub: "You can request a consultation whenever you are ready.",
    // REQUESTED
    requestedBadge: "Consultation Requested",
    requestedTitle: "Your request was sent",
    requestedSub:
      "Your clinician will review your request and schedule a time. You\u2019ll be notified when it\u2019s confirmed.",
    // SUGGESTED
    suggestedBadge: "Clinician Suggested a Time",
    suggestedTitle: "Your clinician suggested a consultation",
    suggestedSlot: "Proposed time:",
    suggestedReason: "Reason:",
    acceptBtn: "Accept",
    declineBtn: "Decline",
    accepting: "Accepting\u2026",
    declining: "Declining\u2026",
    declineNotePlaceholder: "Optional: reason for declining",
    // SCHEDULED
    scheduledBadge: "Appointment Confirmed",
    scheduledTitle: "Your consultation is confirmed",
    scheduledSub: (slot: string) => `Scheduled for ${slot}. Your clinician will reach out with details.`,
    // IN_FOLLOW_UP
    followUpBadge: "In Follow-up",
    followUpTitle: "Follow-up in progress",
    followUpSub: "Your care team is monitoring your progress.",
    // CANCELLED
    cancelledBadge: "Cancelled",
    cancelledTitle: "Appointment was cancelled",
    cancelledNote: "Note:",
    // Cancel action
    cancelBtn: "Cancel",
    cancelling: "Cancelling\u2026",
    cancelNotePlaceholder: "Optional: reason for cancellation",
    confirmCancelBtn: "Confirm Cancel",
    // Errors
    loadError: "Could not check appointment status.",
    errorMsg: "Something went wrong. Please try again."
  },
  ar: {
    noneTitle: "\u0646\u0627\u0642\u0634 \u0646\u062a\u0627\u0626\u062c\u0643 \u0645\u0628\u0627\u0634\u0631\u0629 \u0645\u0639 \u0637\u0628\u064a\u0628\u0643",
    noneSub: "\u0644\u062f\u064a\u0643 \u0627\u0633\u062a\u0641\u0633\u0627\u0631 \u062d\u0648\u0644 \u0645\u0633\u0627\u0631\u0643\u061f \u0627\u0637\u0644\u0628 \u0627\u0633\u062a\u0634\u0627\u0631\u0629 \u0645\u062f\u062a\u0647\u0627 \u0661\u0665 \u062f\u0642\u064a\u0642\u0629.",
    requestBtn: "\u0637\u0644\u0628 \u0627\u0633\u062a\u0634\u0627\u0631\u0629",
    requesting: "\u062c\u0627\u0631\u064d \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0637\u0644\u0628\u2026",
    alertBadge: "\u064a\u064f\u0646\u0635\u062d \u0628\u0627\u0644\u0645\u062a\u0627\u0628\u0639\u0629",
    alertTitle: "\u064a\u0648\u0635\u064a \u0641\u0631\u064a\u0642 \u0631\u0639\u0627\u064a\u062a\u0643 \u0628\u0645\u062a\u0627\u0628\u0639\u0629",
    alertNote: "\u062a\u0648\u0635\u064a\u0629 \u0645\u0646 \u0641\u0631\u064a\u0642 \u0631\u0639\u0627\u064a\u062a\u0643:",
    alertSub: "\u064a\u0645\u0643\u0646\u0643 \u0637\u0644\u0628 \u0627\u0633\u062a\u0634\u0627\u0631\u0629 \u0639\u0646\u062f\u0645\u0627 \u062a\u0643\u0648\u0646 \u062c\u0627\u0647\u0632\u0627\u064b.",
    requestedBadge: "\u062a\u0645 \u0637\u0644\u0628 \u0627\u0644\u0627\u0633\u062a\u0634\u0627\u0631\u0629",
    requestedTitle: "\u062a\u0645 \u0625\u0631\u0633\u0627\u0644 \u0637\u0644\u0628\u0643",
    requestedSub: "\u0633\u064a\u0631\u0627\u062c\u0639 \u0637\u0628\u064a\u0628\u0643 \u0637\u0644\u0628\u0643 \u0648\u064a\u062d\u062f\u062f \u0645\u0648\u0639\u062f\u0627\u064b. \u0633\u062a\u0635\u0644\u0643 \u0625\u0634\u0639\u0627\u0631 \u0641\u0648\u0631 \u0627\u0644\u062a\u0623\u0643\u064a\u062f.",
    suggestedBadge: "\u0627\u0642\u062a\u0631\u062d \u0627\u0644\u0637\u0628\u064a\u0628 \u0645\u0648\u0639\u062f\u0627\u064b",
    suggestedTitle: "\u0627\u0642\u062a\u0631\u062d \u0637\u0628\u064a\u0628\u0643 \u0625\u062c\u0631\u0627\u0621 \u0627\u0633\u062a\u0634\u0627\u0631\u0629",
    suggestedSlot: "\u0627\u0644\u0648\u0642\u062a \u0627\u0644\u0645\u0642\u062a\u0631\u062d:",
    suggestedReason: "\u0627\u0644\u0633\u0628\u0628:",
    acceptBtn: "\u0642\u0628\u0648\u0644",
    declineBtn: "\u0631\u0641\u0636",
    accepting: "\u062c\u0627\u0631\u064d \u0627\u0644\u0642\u0628\u0648\u0644\u2026",
    declining: "\u062c\u0627\u0631\u064d \u0627\u0644\u0631\u0641\u0636\u2026",
    declineNotePlaceholder: "\u0627\u062e\u062a\u064a\u0627\u0631\u064a: \u0633\u0628\u0628 \u0627\u0644\u0631\u0641\u0636",
    scheduledBadge: "\u062a\u0645 \u062a\u0623\u0643\u064a\u062f \u0627\u0644\u0645\u0648\u0639\u062f",
    scheduledTitle: "\u062a\u0645 \u062a\u0623\u0643\u064a\u062f \u0627\u0633\u062a\u0634\u0627\u0631\u062a\u0643",
    scheduledSub: (slot: string) => `\u0645\u062d\u062f\u062f \u0641\u064a ${slot}. \u0633\u064a\u062a\u0648\u0627\u0635\u0644 \u0645\u0639\u0643 \u0627\u0644\u0637\u0628\u064a\u0628 \u0628\u0627\u0644\u062a\u0641\u0627\u0635\u064a\u0644.`,
    followUpBadge: "\u0641\u064a \u0627\u0644\u0645\u062a\u0627\u0628\u0639\u0629",
    followUpTitle: "\u0627\u0644\u0645\u062a\u0627\u0628\u0639\u0629 \u062c\u0627\u0631\u064a\u0629",
    followUpSub: "\u0641\u0631\u064a\u0642 \u0631\u0639\u0627\u064a\u062a\u0643 \u064a\u0631\u0627\u0642\u0628 \u062a\u0642\u062f\u0645\u0643.",
    cancelledBadge: "\u0645\u0644\u063a\u0649",
    cancelledTitle: "\u062a\u0645 \u0625\u0644\u063a\u0627\u0621 \u0627\u0644\u0645\u0648\u0639\u062f",
    cancelledNote: "\u0645\u0644\u0627\u062d\u0638\u0629:",
    cancelBtn: "\u0625\u0644\u063a\u0627\u0621",
    cancelling: "\u062c\u0627\u0631\u064d \u0627\u0644\u0625\u0644\u063a\u0627\u0621\u2026",
    cancelNotePlaceholder: "\u0627\u062e\u062a\u064a\u0627\u0631\u064a: \u0633\u0628\u0628 \u0627\u0644\u0625\u0644\u063a\u0627\u0621",
    confirmCancelBtn: "\u062a\u0623\u0643\u064a\u062f \u0627\u0644\u0625\u0644\u063a\u0627\u0621",
    loadError: "\u062a\u0639\u0630\u0651\u0631 \u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u062d\u0627\u0644\u0629 \u0627\u0644\u0645\u0648\u0639\u062f.",
    errorMsg: "\u062d\u062f\u062b \u062e\u0637\u0623. \u064a\u064f\u0631\u062c\u0649 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649."
  }
};

export function AppointmentCard({ onStatusChange }: { onStatusChange?: () => void }) {
  const { locale } = useLocale();
  const L = S[locale as keyof typeof S] ?? S.en;

  const [appointment, setAppointment] = useState<AppointmentState | null>(null);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelNote, setCancelNote] = useState("");
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [declineNote, setDeclineNote] = useState("");

  useEffect(() => {
    api<{ appointment: AppointmentState }>("/api/patient/appointment")
      .then((r) => setAppointment(r.appointment))
      .catch(() => setLoadError(L.loadError));
  }, [L.loadError]);

  async function handleRequest() {
    setBusy(true);
    setError("");
    try {
      const r = await api<{ appointment: AppointmentState }>("/api/patient/appointment", {
        method: "POST",
        body: JSON.stringify({})
      });
      setAppointment(r.appointment);
      onStatusChange?.();
    } catch (err) {
      setError(userMessage(err, L.errorMsg));
    } finally {
      setBusy(false);
    }
  }

  async function handleAccept() {
    if (!appointment?.followUpId) return;
    setBusy(true);
    setError("");
    try {
      const r = await api<{ appointment: AppointmentState }>("/api/patient/appointment", {
        method: "POST",
        body: JSON.stringify({ action: "accept", followUpId: appointment.followUpId })
      });
      setAppointment(r.appointment);
      onStatusChange?.();
    } catch (err) {
      setError(userMessage(err, L.errorMsg));
    } finally {
      setBusy(false);
    }
  }

  async function handleDecline() {
    if (!appointment?.followUpId) return;
    setBusy(true);
    setError("");
    try {
      const r = await api<{ appointment: AppointmentState }>("/api/patient/appointment", {
        method: "POST",
        body: JSON.stringify({ action: "decline", followUpId: appointment.followUpId, note: declineNote })
      });
      setAppointment(r.appointment);
      setShowDeclineForm(false);
      setDeclineNote("");
      onStatusChange?.();
    } catch (err) {
      setError(userMessage(err, L.errorMsg));
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    if (!appointment?.followUpId) return;
    setBusy(true);
    setError("");
    try {
      await api<{ appointment: AppointmentState }>("/api/patient/appointment", {
        method: "DELETE",
        body: JSON.stringify({ followUpId: appointment.followUpId, note: cancelNote })
      });
      setAppointment({ status: "NONE" });
      setShowCancelForm(false);
      setCancelNote("");
      onStatusChange?.();
    } catch (err) {
      setError(userMessage(err, L.errorMsg));
    } finally {
      setBusy(false);
    }
  }

  if (!appointment) {
    if (loadError) return <p className="appt-sub" style={{ fontSize: 13 }}>{loadError}</p>;
    return null;
  }

  const { status } = appointment;

  // ── ALERT ─────────────────────────────────────────────────────────────────
  if (status === "ALERT") {
    return (
      <article className="panel appt-card appt-requested">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <CalendarClock size={15} className="appt-badge" />
          <span className="appt-badge" style={{ fontSize: 12, fontWeight: 700 }}>{L.alertBadge}</span>
        </div>
        <h3 style={{ margin: "0 0 8px", fontSize: 15.5, fontWeight: 700 }}>{L.alertTitle}</h3>
        {appointment.note && (
          <p className="appt-sub" style={{ margin: "0 0 8px", fontSize: 13, lineHeight: 1.5 }}>
            <strong>{L.alertNote}</strong> {appointment.note}
          </p>
        )}
        <p className="appt-sub" style={{ margin: "0 0 12px", fontSize: 13 }}>{L.alertSub}</p>
        {error && <FormError>{error}</FormError>}
        <button
          type="button"
          className="primary compact"
          onClick={handleRequest}
          disabled={busy}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600 }}
        >
          {busy ? <Loader2 size={14} className="spin" /> : <CalendarPlus size={14} />}
          <span>{busy ? L.requesting : L.requestBtn}</span>
        </button>
      </article>
    );
  }



  // ── SCHEDULED ─────────────────────────────────────────────────────────────
  if (status === "SCHEDULED") {
    return (
      <article
        className="panel appt-card appt-scheduled"
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 8
          }}
        >
          <span
            className="chip green"
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: "4px 10px",
              borderRadius: 20,
              display: "inline-flex",
              alignItems: "center",
              gap: 6
            }}
          >
            <CalendarCheck size={13} /> {L.scheduledBadge}
          </span>
          {!showCancelForm && (
            <button
              type="button"
              onClick={() => setShowCancelForm(true)}
              className="ghost compact appt-cancel" style={{ fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              <CalendarOff size={13} /> {L.cancelBtn}
            </button>
          )}
        </div>
        <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700 }}>{L.scheduledTitle}</h3>
        {appointment.slot && (
          <p style={{ margin: "0 0 4px", fontSize: 13.5, display: "flex", alignItems: "center", gap: 6 }}>
            <Clock size={13} /> {appointment.slot}
          </p>
        )}
        {appointment.reason && (
          <p className="appt-sub" style={{ margin: 0, fontSize: 13 }}>{appointment.reason}</p>
        )}
        {showCancelForm && (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            <textarea
              className="appt-note"
              rows={2}
              placeholder={L.cancelNotePlaceholder}
              value={cancelNote}
              onChange={(e) => setCancelNote(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                fontSize: 13,
                fontFamily: "inherit",
                resize: "vertical"
              }}
            />
            {error && <FormError>{error}</FormError>}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="secondary compact"
                onClick={() => setShowCancelForm(false)}
                disabled={busy}
              >
                <X size={13} /> {L.declineBtn}
              </button>
              <button type="button" className="danger compact" onClick={handleCancel} disabled={busy}>
                {busy ? <Loader2 size={13} className="spin" /> : <CalendarX size={13} />}{" "}
                {busy ? L.cancelling : L.confirmCancelBtn}
              </button>
            </div>
          </div>
        )}
      </article>
    );
  }

  // ── IN_FOLLOW_UP ───────────────────────────────────────────────────────────
  if (status === "IN_FOLLOW_UP") {
    return (
      <article
        className="panel appt-card appt-followup"
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <CalendarClock size={16} className="appt-badge" />
          <span className="appt-badge" style={{ fontSize: 12, fontWeight: 700 }}>{L.followUpBadge}</span>
        </div>
        <p style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 600 }}>{L.followUpTitle}</p>
        <p className="appt-sub" style={{ margin: 0, fontSize: 13 }}>{L.followUpSub}</p>
      </article>
    );
  }

  // ── SUGGESTED ─────────────────────────────────────────────────────────────
  if (status === "SUGGESTED") {
    return (
      <article
        className="panel appt-card appt-suggested"
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <CalendarClock size={15} className="appt-badge" />
          <span className="appt-badge" style={{ fontSize: 12, fontWeight: 700 }}>{L.suggestedBadge}</span>
        </div>
        <h3 style={{ margin: "0 0 8px", fontSize: 15.5, fontWeight: 700 }}>{L.suggestedTitle}</h3>
        {appointment.slot && (
          <p style={{ margin: "0 0 4px", fontSize: 13.5 }}>
            <strong>{L.suggestedSlot}</strong> {appointment.slot}
          </p>
        )}
        {appointment.reason && (
          <p className="appt-sub" style={{ margin: "0 0 12px", fontSize: 13 }}>
            <strong>{L.suggestedReason}</strong> {appointment.reason}
          </p>
        )}
        {error && <FormError>{error}</FormError>}
        {!showDeclineForm ? (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="primary compact"
              onClick={handleAccept}
              disabled={busy}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600 }}
            >
              {busy ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
              {busy ? L.accepting : L.acceptBtn}
            </button>
            <button
              type="button"
              className="secondary compact"
              onClick={() => setShowDeclineForm(true)}
              disabled={busy}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}
            >
              <X size={14} /> {L.declineBtn}
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <textarea
              className="appt-note"
              rows={2}
              placeholder={L.declineNotePlaceholder}
              value={declineNote}
              onChange={(e) => setDeclineNote(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                fontSize: 13,
                fontFamily: "inherit",
                resize: "vertical"
              }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="secondary compact"
                onClick={() => setShowDeclineForm(false)}
                disabled={busy}
              >
                <X size={13} /> {L.acceptBtn}
              </button>
              <button type="button" className="danger compact" onClick={handleDecline} disabled={busy}>
                {busy ? <Loader2 size={13} className="spin" /> : <CalendarX size={13} />}{" "}
                {busy ? L.declining : L.declineBtn}
              </button>
            </div>
          </div>
        )}
      </article>
    );
  }

  // ── REQUESTED ─────────────────────────────────────────────────────────────
  if (status === "REQUESTED") {
    return (
      <article
        className="panel appt-card appt-requested"
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 8
          }}
        >
          <span
            className="appt-badge"
            style={{
              fontSize: 12,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: 6
            }}
          >
            <CalendarClock size={13} /> {L.requestedBadge}
          </span>
          {!showCancelForm && (
            <button
              type="button"
              onClick={() => setShowCancelForm(true)}
              className="ghost compact appt-cancel" style={{ fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              <X size={13} /> {L.cancelBtn}
            </button>
          )}
        </div>
        <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700 }}>{L.requestedTitle}</h3>
        <p className="appt-sub" style={{ margin: 0, fontSize: 13 }}>{L.requestedSub}</p>
        {showCancelForm && (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            <textarea
              className="appt-note"
              rows={2}
              placeholder={L.cancelNotePlaceholder}
              value={cancelNote}
              onChange={(e) => setCancelNote(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                fontSize: 13,
                fontFamily: "inherit",
                resize: "vertical"
              }}
            />
            {error && <FormError>{error}</FormError>}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="secondary compact"
                onClick={() => setShowCancelForm(false)}
                disabled={busy}
              >
                <X size={13} />
              </button>
              <button type="button" className="danger compact" onClick={handleCancel} disabled={busy}>
                {busy ? <Loader2 size={13} className="spin" /> : <CalendarX size={13} />}{" "}
                {busy ? L.cancelling : L.confirmCancelBtn}
              </button>
            </div>
          </div>
        )}
      </article>
    );
  }

  // ── NONE — Patient request form ───────────────────────────────────────────
  return (
    <article
      className="panel appt-card appt-none"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12
      }}
    >
      <div style={{ maxWidth: 540 }}>
        <h4 style={{ margin: "0 0 4px", fontSize: 14.5, fontWeight: 700 }}>{L.noneTitle}</h4>
        <p className="appt-sub" style={{ margin: 0, fontSize: 12.5, lineHeight: 1.4 }}>{L.noneSub}</p>
      </div>
      {error && <FormError>{error}</FormError>}
      <button
        type="button"
        className="secondary compact"
        onClick={handleRequest}
        disabled={busy}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap" }}
      >
        {busy ? <Loader2 size={14} className="spin" /> : <CalendarPlus size={14} />}
        <span>{busy ? L.requesting : L.requestBtn}</span>
      </button>
    </article>
  );
}
