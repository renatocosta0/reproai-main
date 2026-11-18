"use client";

import { useEffect, useState } from "react";
import {
  CalendarCheck,
  CalendarDays,
  CalendarPlus,
  Check,
  Clock,
  Loader2,
  PhoneCall,
  Sparkles,
  Video
} from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleContext";
import { api, userMessage } from "@/lib/api-client";
import { FormError } from "@/components/ui/Notice";
import { DEFAULT_SUGGESTED_SLOTS, type AppointmentState } from "@/lib/appointment";

const STRINGS = {
  en: {
    recommendedBadge: "Recommended by Care Team · One-Tap Scheduling",
    scheduledBadge: "Consultation Confirmed",
    requestedBadge: "Consultation Requested",
    suggestedTitle: "Follow-up consultation recommended",
    suggestedSub: "Your clinician reviewed your recent results and suggested a 15-minute discussion.",
    chooseSlot: "Select a convenient time:",
    confirmOneTap: "Confirm in 1 Tap",
    confirming: "Confirming appointment…",
    scheduledTitle: "Your consultation is confirmed",
    scheduledSub: (slot: string) => `Scheduled for ${slot}. Telehealth link and calendar invite prepared.`,
    clinicianReady: "Your clinician has your latest biomarker and wearable trends on hand.",
    selfRequestTitle: "Discuss your results with your clinician",
    selfRequestSub: "Have questions about your trajectory or cycle patterns? Request a quick 15-minute discussion.",
    requestOneTap: "Request 15-Min Consultation",
    requesting: "Sending request…",
    errorConfirm: "Could not confirm appointment. Please try again.",
    loadError: "Could not check appointment status.",
    slotTelehealth: "Telehealth (Video call)",
    slotInPerson: "In-Clinic (Abu Dhabi)"
  },
  ar: {
    recommendedBadge: "موصى به من الفريق الطبي · حجز بنقرة واحدة",
    scheduledBadge: "تم تأكيد الموعد بنجاح",
    requestedBadge: "تم طلب الاستشارة",
    suggestedTitle: "موعد متابعة موصى به من الطبيب",
    suggestedSub: "راجع طبيبك نتائجك الأخيرة واقترح مناقشة مدتها ١٥ دقيقة لمراجعة الخطوات القادمة.",
    chooseSlot: "اختر الوقت المناسب لك:",
    confirmOneTap: "تأكيد الموعد بنقرة واحدة",
    confirming: "جارٍ تأكيد الموعد…",
    scheduledTitle: "تم تأكيد موعد استشارتك",
    scheduledSub: (slot: string) => `محدد في ${slot}. تم تجهيز رابط الاستشارة عن بُعد ودعوة التقويم.`,
    clinicianReady: "سيكون لدى طبيبك أحدث مؤشراتك الحيوية وأنماطك جاهزة في ملفك الطبي.",
    selfRequestTitle: "ناقش نتائجك مباشرة مع طبيبك",
    selfRequestSub: "لديك استفسار حول مسارك التناسلي أو حرارتك الصباحية؟ اطلب مناقشة سريعة مدتها ١٥ دقيقة.",
    requestOneTap: "طلب استشارة مدتها ١٥ دقيقة",
    requesting: "جارٍ إرسال الطلب…",
    errorConfirm: "تعذّر تأكيد الموعد. يُرجى المحاولة مرة أخرى.",
    loadError: "تعذّر التحقق من حالة الموعد.",
    slotTelehealth: "استشارة مرئية عن بُعد",
    slotInPerson: "في العيادة (أبوظبي)"
  }
};

export function AppointmentCard({ onStatusChange }: { onStatusChange?: () => void }) {
  const { locale } = useLocale();
  const ar = locale === "ar";
  const L = STRINGS[locale];

  const [appointment, setAppointment] = useState<AppointmentState | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string>(DEFAULT_SUGGESTED_SLOTS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [successNotice, setSuccessNotice] = useState(false);

  useEffect(() => {
    let active = true;
    api<{ appointment: AppointmentState }>("/api/patient/appointment")
      .then((res) => {
        if (!active) return;
        setAppointment(res.appointment);
        if (res.appointment.slot) {
          setSelectedSlot(res.appointment.slot);
        }
      })
      .catch((err) => {
        if (active) setError(userMessage(err, L.loadError));
      });

    return () => {
      active = false;
    };
  }, [L.loadError]);

  async function handleConfirm() {
    setBusy(true);
    setError("");
    try {
      const res = await api<{ ok: boolean; appointment: AppointmentState }>("/api/patient/appointment", {
        method: "POST",
        body: JSON.stringify({ slot: selectedSlot })
      });
      setAppointment(res.appointment);
      setSuccessNotice(true);
      onStatusChange?.();
    } catch (err) {
      setError(userMessage(err, L.errorConfirm));
    } finally {
      setBusy(false);
    }
  }

  if (!appointment) return null;

  // State 1: SCHEDULED
  if (appointment.status === "SCHEDULED" || appointment.status === "IN_FOLLOW_UP") {
    return (
      <article
        className="panel appointment-confirmed-banner"
        style={{
          margin: "0 0 16px",
          padding: "16px 20px",
          background: "linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.04) 100%)",
          border: "1px solid rgba(16, 185, 129, 0.3)",
          borderRadius: 14,
          display: "flex",
          flexDirection: "column",
          gap: 10
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <span
            className="chip mint"
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: "3px 10px",
              borderRadius: 20,
              display: "inline-flex",
              alignItems: "center",
              gap: 6
            }}
          >
            <CalendarCheck size={14} /> {L.scheduledBadge}
          </span>
          <span style={{ fontSize: 12, color: "var(--muted, #64748b)", display: "flex", alignItems: "center", gap: 5 }}>
            <Video size={13} /> {L.slotTelehealth}
          </span>
        </div>

        <div>
          <h3 style={{ margin: "2px 0 4px", fontSize: 16, fontWeight: 700, color: "var(--text, #0f172a)" }}>
            {L.scheduledTitle}
          </h3>
          <p style={{ margin: 0, fontSize: 13.5, color: "var(--sub, #334155)", lineHeight: 1.5 }}>
            {L.scheduledSub(appointment.slot || selectedSlot)}
          </p>
        </div>

        <div style={{ fontSize: 12, color: "#059669", display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
          <Check size={14} />
          <span>{L.clinicianReady}</span>
        </div>
      </article>
    );
  }

  // State 2: SUGGESTED (Recommended by clinician or agent rule)
  if (appointment.status === "SUGGESTED") {
    return (
      <article
        className="panel appointment-suggested-banner"
        style={{
          margin: "0 0 16px",
          padding: "18px 20px",
          background: "linear-gradient(135deg, rgba(238, 242, 255, 0.8) 0%, rgba(245, 243, 255, 0.6) 100%)",
          border: "1px solid rgba(129, 140, 248, 0.35)",
          borderRadius: 14,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          boxShadow: "0 2px 8px rgba(99, 102, 241, 0.06)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <span
            className="chip purple"
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
            <Sparkles size={13} /> {L.recommendedBadge}
          </span>
        </div>

        <div>
          <h3 style={{ margin: "0 0 4px", fontSize: 16.5, fontWeight: 700, color: "var(--text, #0f172a)" }}>
            {L.suggestedTitle}
          </h3>
          <p style={{ margin: 0, fontSize: 13.5, color: "var(--sub, #334155)", lineHeight: 1.5 }}>
            {appointment.reason ? appointment.reason : L.suggestedSub}
          </p>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted, #64748b)", marginBottom: 6 }}>
            {L.chooseSlot}
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {DEFAULT_SUGGESTED_SLOTS.map((slot) => {
              const active = selectedSlot === slot;
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setSelectedSlot(slot)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    fontSize: 12.5,
                    fontWeight: active ? 600 : 500,
                    border: active ? "1.5px solid #4f46e5" : "1px solid #cbd5e1",
                    background: active ? "#ffffff" : "#f8fafc",
                    color: active ? "#4338ca" : "#475569",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    transition: "all 0.15s ease"
                  }}
                >
                  <Clock size={13} />
                  <span>{slot}</span>
                </button>
              );
            })}
          </div>
        </div>

        {error && <FormError>{error}</FormError>}

        <div style={{ display: "flex", justifyContent: "flex-start", marginTop: 4 }}>
          <button
            type="button"
            className="primary"
            onClick={handleConfirm}
            disabled={busy}
            style={{
              padding: "9px 18px",
              fontSize: 13.5,
              fontWeight: 600,
              borderRadius: 8,
              display: "inline-flex",
              alignItems: "center",
              gap: 8
            }}
          >
            {busy ? (
              <>
                <Loader2 size={16} className="spin" />
                <span>{L.confirming}</span>
              </>
            ) : (
              <>
                <CalendarCheck size={16} />
                <span>{L.confirmOneTap}</span>
              </>
            )}
          </button>
        </div>
      </article>
    );
  }

  // State 3: NONE - Patient-initiated action
  return (
    <article
      className="panel appointment-request-card"
      style={{
        margin: "0 0 16px",
        padding: "16px 20px",
        background: "var(--panel, #ffffff)",
        border: "1px solid var(--border, #e2e8f0)",
        borderRadius: 14,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12
      }}
    >
      <div style={{ maxWidth: 540 }}>
        <h4 style={{ margin: "0 0 4px", fontSize: 14.5, fontWeight: 700, color: "var(--text, #0f172a)" }}>
          {L.selfRequestTitle}
        </h4>
        <p style={{ margin: 0, fontSize: 12.5, color: "var(--muted, #64748b)", lineHeight: 1.4 }}>
          {L.selfRequestSub}
        </p>
      </div>

      <button
        type="button"
        className="secondary compact"
        onClick={handleConfirm}
        disabled={busy}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12.5,
          fontWeight: 600,
          whiteSpace: "nowrap"
        }}
      >
        {busy ? <Loader2 size={14} className="spin" /> : <CalendarPlus size={14} />}
        <span>{busy ? L.requesting : L.requestOneTap}</span>
      </button>
    </article>
  );
}
