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

export default function TrajectoryPage() {
  const { record, loading, error } = useRecord();

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
          <p className="date-label">MY TRAJECTORY</p>
          <h1>How your picture is changing</h1>
          <span>Your results over time, explained, and the options worth discussing. Not a score, and not a diagnosis.</span>
        </div>
      </div>

      {record.pendingReview && (
        <div style={{ marginBottom: 16 }}>
          <ClinicalNotice icon={Clock}>
            A new assessment is with your clinician for review. You will see it here once they have released it with their note.
          </ClinicalNotice>
        </div>
      )}

      {!record.profile?.intakeCompletedAt && (
        <section className="support-strip" style={{ marginBottom: 16 }}>
          <div className="support-icon"><Info size={21} /></div>
          <span>
            <strong>Tell us a little about you</strong>
            <small>A 3-minute check on your history and lifestyle helps us suggest the right next steps.</small>
          </span>
          <Link href="/patient/about">Start <ArrowRight size={15} /></Link>
        </section>
      )}

      {/* Headline: where things stand, in words, from the latest released assessment */}
      {latest ? (
        <Headline a={latest} sex={sex} />
      ) : (
        <section className="panel empty-state" style={{ marginBottom: 16 }}>
          <strong>Your clinical baseline is set by your clinician</strong>
          Once your clinician records your laboratory results (such as an AMH blood test or a semen analysis) and reviews them with you,
          your trajectory will appear here.
        </section>
      )}

      {/* Marker trends */}
      <section className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-head">
          <div>
            <h2>Your results over time</h2>
            <p>Each result shows where it came from. The dashed line is the reference limit used by clinicians.</p>
          </div>
        </div>
        {ordered.length === 0 ? (
          <div className="empty-state">No results recorded yet.</div>
        ) : (
          <div className="marker-grid" style={{ padding: "0 20px 20px" }}>
            {ordered.map((c) => (
              <MarkerTrend key={c} code={c} points={record.labs.filter((l) => l.code === c)} />
            ))}
          </div>
        )}
      </section>

      {/* Options */}
      <section className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-head">
          <div>
            <h2>Your options</h2>
            <p>Suggestions to discuss, based on what is recorded. Each one says why.</p>
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
              <h2><HeartHandshake size={17} style={{ display: "inline", verticalAlign: "-3px" }} /> Your joint estimate</h2>
              <p>Reviewed by your clinician {joint[0].reviewedAt ? `on ${shortDate(joint[0].reviewedAt)}` : ""}</p>
            </div>
            <EvidenceChip text={joint[0].evidenceStatus} />
          </div>
          <div className="joint-body">
            <div className="result-box">
              <strong>{pct(joint[0].probability)}</strong>
              <span>95% range {pct(joint[0].confidenceLow)}–{pct(joint[0].confidenceHigh)}</span>
              <small>An estimate for planning with your clinician, combining both partners&apos; results. It can change as more information is added.</small>
            </div>
            {joint[0].clinicianNote && <Note text={joint[0].clinicianNote} />}
          </div>
        </section>
      )}

      {latest?.factors && latest.factors.length > 0 && (
        <section className="panel" style={{ marginBottom: 16 }}>
          <div className="panel-head">
            <div>
              <h2>What shaped your latest assessment</h2>
              <p>Each factor compared with a reference population. Mint helped, coral weighed against.</p>
            </div>
          </div>
          <ShapChart factors={latest.factors} />
        </section>
      )}

      <div className="clinical-note">
        <ShieldCheck size={20} />
        <span>
          <strong>Important context</strong>
          AMH reflects egg quantity, not egg quality, and does not predict whether you can conceive naturally. These results do not
          assess tubal, uterine or other factors. Your clinician makes clinical decisions with you.
        </span>
      </div>
    </div>
  );
}

function Headline({ a, sex }: { a: AssessmentView; sex: string | null }) {
  const tier = tierCopy(a.tier);
  return (
    <section className="assessment-hero trajectory-hero">
      <div className="assessment-score">
        <span>{sex === "female" ? "Egg reserve for your age" : "Semen health"}</span>
        <strong style={{ fontSize: 30 }}>{tier.label}</strong>
        <em>Released {a.reviewedAt ? shortDate(a.reviewedAt) : shortDate(a.createdAt)}</em>
      </div>
      <div className="assessment-summary">
        <span className="soft-pill light-pill">
          <BadgeCheck size={14} /> Reviewed by your clinician
        </span>
        <h2>{tier.summary || "Your clinician has reviewed your latest results."}</h2>
        {a.percentile !== null && sex === "female" && (
          <p>Your AMH is {percentileWords(a.percentile)} (around the {Math.round(a.percentile)}th percentile).</p>
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
  return (
    <p className={`clinician-note ${light ? "light" : ""}`}>
      <BadgeCheck size={15} aria-hidden /> <span><strong>From your clinician:</strong> {text}</span>
    </p>
  );
}
