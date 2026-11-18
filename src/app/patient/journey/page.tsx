"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { usePatient } from "@/components/patient/PatientContext";
import { useRecord } from "@/components/patient/useRecord";
import { useObservations } from "@/components/patient/useObservations";
import { CareNavigator } from "@/components/patient/CareNavigator";
import { JourneyTimeline } from "@/components/patient/JourneyTimeline";
import { FormError } from "@/components/ui/Notice";
import { useLocale } from "@/components/i18n/LocaleContext";
import { api } from "@/lib/api-client";
import { buildNavigator, buildTimeline, type JourneyInput } from "@/lib/journey";
import { isSleep, isTemperature, series } from "@/lib/observation-analysis";
import type { AppointmentState } from "@/lib/appointment";

const S = {
  en: {
    eyebrow: "MY JOURNEY",
    title: "Your journey so far",
    sub: "Where you are now, what comes next, and everything recorded along the way.",
    loadError: "Could not load your journey.",
    context: "Built only from your released record, your logged readings and your appointments. Your clinician reviews every result before you see an estimate, and you control who can see your data in Privacy & consent."
  },
  ar: {
    eyebrow: "رحلتي",
    title: "رحلتك حتى الآن",
    sub: "أين أنت الآن، وما الخطوة التالية، وكل ما سُجّل على الطريق.",
    loadError: "تعذّر تحميل رحلتك.",
    context: "مبنية فقط من سجلك المعتمد وقراءاتك ومواعيدك. يراجع طبيبك كل نتيجة قبل أن ترى أي تقدير، وأنت تتحكم في من يرى بياناتك من «الخصوصية والموافقة»."
  }
};

export default function JourneyPage() {
  const { data } = usePatient();
  const { record, loading, error } = useRecord();
  const { observations, loading: obsLoading } = useObservations(data?.profile.userId);
  const { locale } = useLocale();
  const L = S[locale];
  const [appointment, setAppointment] = useState<AppointmentState | null>(null);

  const loadAppointment = useCallback(() => {
    api<{ appointment: AppointmentState }>("/api/patient/appointment")
      .then((r) => setAppointment(r.appointment))
      .catch(() => setAppointment(null));
  }, []);
  useEffect(loadAppointment, [loadAppointment]);

  if (loading || obsLoading) {
    return (
      <div className="content patient-content">
        <div className="loading-block" style={{ height: 260, margin: 0 }} />
      </div>
    );
  }
  if (error || !record) {
    return (
      <div className="content patient-content">
        <FormError>{error || L.loadError}</FormError>
      </div>
    );
  }

  const input: JourneyInput = {
    sex: record.profile?.sex ?? null,
    intakeCompletedAt: record.profile?.intakeCompletedAt ?? null,
    labs: record.labs,
    assessments: record.assessments,
    pendingReview: record.pendingReview,
    options: record.options,
    isPaired: record.isPaired,
    consents: record.consents,
    appointment: appointment ? { status: appointment.status, slot: appointment.slot, scheduledAt: appointment.scheduledAt } : null,
    temperatures: series(observations, isTemperature),
    sleep: series(observations, isSleep)
  };
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString(locale === "ar" ? "ar-AE-u-nu-latn" : "en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="content patient-content">
      <div className="page-heading">
        <div>
          <p className="date-label">{L.eyebrow}</p>
          <h1>{L.title}</h1>
          <span>{L.sub}</span>
        </div>
      </div>

      <CareNavigator steps={buildNavigator(input)} sex={input.sex} formatDate={formatDate} onAppointmentChange={loadAppointment} />

      <JourneyTimeline events={buildTimeline(input)} />

      <div className="clinical-note" style={{ marginTop: 16 }}>
        <ShieldCheck size={20} />
        <span>{L.context}</span>
      </div>
    </div>
  );
}
