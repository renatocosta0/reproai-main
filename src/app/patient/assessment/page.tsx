"use client";

import Link from "next/link";
import { ArrowRight, BadgeCheck, Clock, HeartHandshake, Info, ShieldCheck } from "lucide-react";
import { useRecord, percentileWords } from "@/components/patient/useRecord";
import { MarkerTrend } from "@/components/charts/MarkerTrend";
import { ShapChart } from "@/components/charts/ShapChart";
import { OptionsList } from "@/components/record/OptionsList";
import { Completeness, EvidenceChip } from "@/components/record/Chips";
import { ClinicalNotice, FormError } from "@/components/ui/Notice";
import { shortDate } from "@/lib/observation-analysis";
import { pct, tierCopy } from "@/lib/tiers";
import type { LabCode } from "@/lib/labs";
import type { AssessmentView } from "@/types/record";
import { useLocale } from "@/components/i18n/LocaleContext";
import { WhatIf } from "@/components/patient/WhatIf";
import { percentileWordsAr, TIER_AR } from "@/lib/i18n";

export default function TrajectoryPage() {
  const { record, loading, error } = useRecord();
  const { t } = useLocale();

  if (loading) {
    return <div className="content patient-content"><div className="loading-block" style={{ height: 260, margin: 0 }} /></div>;
  }
  if (error || !record) {
    return <div className="content patient-content"><FormError>{error || "Could not load your record."}</FormError></div>;
  }

  const sex = record.profile?.sex ?? null;
  const individual = record.assessments.filter((a) => a.scope === "INDIVIDUAL");
  const joint = record.assessments.filter((a) => a.scope === "COUPLE");
  const latest = individual[0] ?? null;
  const codes = Array.from(new Set(record.labs.map((l) => l.code))) as LabCode[];
  const ordered = codes.sort((a, b) => ["AMH", "AFC", "FSH", "SPERM_CONCENTRATION", "SPERM_PROGRESSIVE_MOTILITY", "SPERM_TOTAL_MOTILITY", "SPERM_MORPHOLOGY", "SEMEN_VOLUME"].indexOf(a) - ["AMH", "AFC", "FSH", "SPERM_CONCENTRATION", "SPERM_PROGRESSIVE_MOTILITY", "SPERM_TOTAL_MOTILITY", "SPERM_MORPHOLOGY", "SEMEN_VOLUME"].indexOf(b));

  return (
    <div className="content patient-content">
      <div className="page-heading">
        <div>
          <p className="date-label">{t("trajEyebrow")}</p>
          <h1>{t("trajTitle")}</h1>
          <span>{t("trajSubtitle")}</span>
        </div>
      </div>

      {record.pendingReview && (
        <div style={{ marginBottom: 16 }}>
          <ClinicalNotice icon={Clock}>
            {t("pendingReview")}
          </ClinicalNotice>
        </div>
      )}

      {!record.profile?.intakeCompletedAt && (
        <section className="support-strip" style={{ marginBottom: 16 }}>
          <div className="support-icon"><Info size={21} /></div>
          <span>
            <strong>{t("intakePromptTitle")}</strong>
            <small>{t("intakePromptText")}</small>
          </span>
          <Link href="/patient/about">{t("start")} <ArrowRight size={15} className="flip-rtl" /></Link>
        </section>
      )}

      {/* Headline: where things stand, in words, from the latest released assessment */}
      {latest ? (
        <Headline a={latest} sex={sex} />
      ) : (
        <section className="panel empty-state" style={{ marginBottom: 16 }}>
          <strong>{t("baselineTitle")}</strong>
          {t("baselineText")}
        </section>
      )}

      {/* Marker trends */}
      <section className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-head">
          <div>
            <h2>{t("resultsTitle")}</h2>
            <p>{t("resultsSubtitle")}</p>
          </div>
        </div>
        {ordered.length === 0 ? (
          <div className="empty-state">{t("noResults")}</div>
        ) : (
          <div className="marker-grid" style={{ padding: "0 20px 20px" }}>
            {ordered.map((c) => (
              <MarkerTrend key={c} code={c} points={record.labs.filter((l) => l.code === c)} />
            ))}
          </div>
        )}
      </section>

      {latest && <WhatIf currentBmi={record.profile?.bmi ?? null} />}

      {/* Options */}
      <section className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-head">
          <div>
            <h2>{t("optionsTitle")}</h2>
            <p>{t("optionsSubtitle")}</p>
          </div>
        </div>
        <div style={{ padding: "0 20px 20px" }}>
          <OptionsList options={record.options} audience="patient" intendedUse={record.intendedUse} />
        </div>
      </section>

      {/* Joint estimate for couples */}
      {joint[0] && (
        <section className="panel" style={{ marginBottom: 16 }}>
          <div className="panel-head">
            <div>
              <h2><HeartHandshake size={17} style={{ display: "inline", verticalAlign: "-3px" }} /> {t("jointTitle")}</h2>
              <p>{t("reviewedOn")} {joint[0].reviewedAt ? `· ${shortDate(joint[0].reviewedAt)}` : ""}</p>
            </div>
            <EvidenceChip text={joint[0].evidenceStatus} />
          </div>
          <div className="joint-body">
            <div className="result-box">
              <strong>{pct(joint[0].probability)}</strong>
              <span>{t("range95")} <span dir="ltr">{pct(joint[0].confidenceLow)}–{pct(joint[0].confidenceHigh)}</span></span>
              <small>{t("jointExplain")}</small>
            </div>
            {joint[0].clinicianNote && <Note text={joint[0].clinicianNote} />}
          </div>
        </section>
      )}

      {latest?.factors && latest.factors.length > 0 && (
        <section className="panel" style={{ marginBottom: 16 }}>
          <div className="panel-head">
            <div>
              <h2>{t("shapedTitle")}</h2>
              <p>{t("shapedSubtitle")}</p>
            </div>
          </div>
          <ShapChart factors={latest.factors} />
        </section>
      )}

      <div className="clinical-note">
        <ShieldCheck size={20} />
        <span>
          <strong>{t("importantContext")}</strong>
          {t("importantContextText")}
        </span>
      </div>
    </div>
  );
}

function Headline({ a, sex }: { a: AssessmentView; sex: string | null }) {
  const { locale, t } = useLocale();
  const ar = locale === "ar";
  const tier = ar && a.tier && TIER_AR[a.tier] ? TIER_AR[a.tier] : tierCopy(a.tier);
  return (
    <section className="assessment-hero trajectory-hero">
      <div className="assessment-score">
        <span>{sex === "female" ? t("eggReserve") : t("semenHealth")}</span>
        <strong style={{ fontSize: 30 }}>{tier.label}</strong>
        <em>{t("released")} {a.reviewedAt ? shortDate(a.reviewedAt) : shortDate(a.createdAt)}</em>
      </div>
      <div className="assessment-summary">
        <span className="soft-pill light-pill">
          <BadgeCheck size={14} /> {t("reviewedBadge")}
        </span>
        <h2>{tier.summary || "Your clinician has reviewed your latest results."}</h2>
        {a.percentile !== null && sex === "female" && (
          <p>
            {t("amhIs")} {ar ? percentileWordsAr(a.percentile) : percentileWords(a.percentile)} ({t("aroundPercentile", { n: Math.round(a.percentile * 2) })}).
          </p>
        )}
        {a.clinicianNote && <Note text={a.clinicianNote} light />}
        <div style={{ maxWidth: 420, marginTop: 14 }}>
          <Completeness value={a.completeness} missing={a.missingOptional} />
        </div>
      </div>
    </section>
  );
}

function Note({ text, light = false }: { text: string; light?: boolean }) {
  const { t } = useLocale();
  return (
    <p className={`clinician-note ${light ? "light" : ""}`}>
      <BadgeCheck size={15} aria-hidden /> <span><strong>{t("fromClinician")}</strong> <span dir="auto">{text}</span></span>
    </p>
  );
}
