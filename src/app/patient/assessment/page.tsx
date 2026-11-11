"use client";

import { useState } from "react";
import {
  BookOpen,
  ClipboardCheck,
  HeartHandshake,
  Leaf,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
  Snowflake,
  Sparkles,
  SlidersHorizontal
} from "lucide-react";
import Link from "next/link";
import { usePatient } from "@/components/patient/PatientContext";
import { ShapChart } from "@/components/charts/ShapChart";
import { FormError } from "@/components/ui/Notice";
import { api, userMessage } from "@/lib/api-client";
import { shortDate } from "@/lib/observation-analysis";
import { pct, tierCopy } from "@/lib/tiers";
import type { PatientProfile, PredictResponse, StoredPrediction } from "@/types/patient";

// ─────────────────────────────────────────────────────────────────────────────
// Patient-Trajectory View
// ARCHITECTURAL RULE: The patient does NOT fill out a clinical lab test form.
// Lab values (AMH, AFC, sperm count) are entered exclusively by the clinician.
// This page shows the clinician-validated trajectory in plain, empathetic terms.
// ─────────────────────────────────────────────────────────────────────────────

export default function AssessmentPage() {
  const { data, loading, error: loadError, refresh } = usePatient();

  // State for the lifestyle simulator (patient-only modifiable sliders)
  const [simBmi, setSimBmi] = useState<number | null>(null);
  const [simSleep, setSimSleep] = useState<number | null>(null);
  const [simResult, setSimResult] = useState<PredictResponse | null>(null);
  const [simRunning, setSimRunning] = useState(false);
  const [simError, setSimError] = useState("");

  if (loading) {
    return (
      <div className="content patient-content">
        <div className="loading-block" style={{ height: 260, margin: 0 }} />
      </div>
    );
  }
  if (loadError || !data) {
    return (
      <div className="content patient-content">
        <FormError>{loadError || "Could not load your profile."}</FormError>
      </div>
    );
  }

  const { profile, latestPrediction } = data;

  // ── Lifestyle simulator: only sends modifiable lifestyle parameters ──
  async function runSimulator() {
    if (!profile.age) return;
    setSimRunning(true);
    setSimError("");
    try {
      const body: Record<string, unknown> = {
        scope: "INDIVIDUAL",
        sex: profile.sex ?? undefined,
        age: profile.age,
        bmi: simBmi ?? profile.bmi ?? undefined,
        // Lock all clinical lab values from their doctor-recorded profile
        amh: profile.amh ?? undefined,
        antral_follicle_count: profile.antralFollicleCount ?? undefined,
        sperm_count: profile.spermCount ?? undefined,
        pcos_history: profile.pcosHistory ?? undefined,
        infertility_duration_months: profile.infertilityDurationMonths ?? undefined,
        prior_cycles: profile.priorCycles ?? undefined
      };
      Object.keys(body).forEach((k) => body[k] === undefined && delete body[k]);
      const res = await api<PredictResponse>("/api/predict", { method: "POST", body: JSON.stringify(body) });
      setSimResult(res);
      await refresh();
    } catch (err) {
      setSimError(userMessage(err, "Could not run the lifestyle simulation. Please try again."));
    } finally {
      setSimRunning(false);
    }
  }

  const hasAssessment = !!(latestPrediction || simResult);

  return (
    <div className="content patient-content">
      <div className="page-heading">
        <div>
          <p className="date-label">YOUR REPRODUCTIVE TRAJECTORY</p>
          <h1>My trajectory</h1>
          <span>
            Your personalised reproductive health view, based on your clinician&apos;s validated assessment.
          </span>
        </div>
      </div>

      {/* ── Empty state: doctor hasn't recorded data yet ── */}
      {!hasAssessment && (
        <div className="panel empty-state" style={{ padding: "40px 32px", textAlign: "center" }}>
          <ClipboardCheck size={40} style={{ color: "var(--teal, #0c655e)", marginBottom: 16, opacity: 0.7 }} />
          <strong style={{ display: "block", fontSize: "1.1rem", marginBottom: 10 }}>
            Awaiting your clinical assessment
          </strong>
          <p style={{ maxWidth: 480, margin: "0 auto 20px", color: "var(--muted, #71817d)", lineHeight: 1.6 }}>
            Your personalised trajectory will appear here once your fertility specialist records your laboratory
            results during your consultation. In the meantime, you can start logging your home health data.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/patient/wearables" className="secondary">
              <Sparkles size={15} /> Start home tracking
            </Link>
            <Link href="/patient/assistant" className="secondary">
              <MessageCircle size={15} /> Ask ReproAI a question
            </Link>
          </div>
        </div>
      )}

      {/* ── Active trajectory: doctor has run an assessment ── */}
      {hasAssessment && (
        <>
          <TrajectoryHero
            prediction={simResult ?? latestPrediction!}
            isSimulation={!!simResult}
          />

          {/* ── Clinician-Locked Biomarker Cards ── */}
          <LockedBiomarkerCards profile={profile} />

          {/* ── SHAP chart: plain-language styled ── */}
          {(simResult?.factors ?? latestPrediction?.factors) && (
            <article className="panel" style={{ marginBottom: 16 }}>
              <div className="panel-head">
                <div>
                  <h2>What is shaping your trajectory</h2>
                  <p>How each factor compares to a reference population — validated by your care team</p>
                </div>
              </div>
              <ShapChart factors={(simResult?.factors ?? latestPrediction?.factors)!} />
            </article>
          )}

          {/* ── Modifiable vs Non-Modifiable factors ── */}
          <FactorBreakdown prediction={simResult ?? latestPrediction!} />

          {/* ── Preservation guidance ── */}
          {(simResult?.preservation_guidance ?? latestPrediction?.preservationGuidance) && (
            <GuidanceCard
              text={(simResult?.preservation_guidance ?? latestPrediction?.preservationGuidance)!}
              scope={(simResult?.scope ?? latestPrediction?.scope ?? "INDIVIDUAL")}
            />
          )}

          {/* ── Lifestyle Simulator ── */}
          <LifestyleSimulator
            profile={profile}
            simBmi={simBmi}
            setSimBmi={setSimBmi}
            simSleep={simSleep}
            setSimSleep={setSimSleep}
            simResult={simResult}
            simRunning={simRunning}
            simError={simError}
            onRun={runSimulator}
            onReset={() => { setSimResult(null); setSimBmi(null); setSimSleep(null); }}
          />
        </>
      )}

      {/* ── Clinical disclaimer ── */}
      <div className="clinical-note" style={{ marginTop: 16 }}>
        <ShieldCheck size={20} />
        <span>
          <strong>Important clinical context</strong>
          This trajectory is an evidence-based estimate, not a diagnosis. It does not evaluate tubal patency,
          uterine anatomy, or severe endometriosis. Your fertility specialist makes the final clinical
          assessment and treatment recommendation.
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Trajectory Hero
// ─────────────────────────────────────────────────────────────────────────────
function TrajectoryHero({
  prediction,
  isSimulation
}: {
  prediction: StoredPrediction | PredictResponse;
  isSimulation: boolean;
}) {
  // Normalise between StoredPrediction and PredictResponse shapes
  const probability = prediction.probability;
  const low = "confidenceLow" in prediction ? prediction.confidenceLow : prediction.confidence_low;
  const high = "confidenceHigh" in prediction ? prediction.confidenceHigh : prediction.confidence_high;
  const tier = prediction.tier ?? null;
  const scope = prediction.scope;
  const model = "modelVersion" in prediction ? prediction.modelVersion : prediction.model_version;
  const date = "createdAt" in prediction ? shortDate((prediction as StoredPrediction).createdAt) : null;

  const tierData = tierCopy(tier);

  return (
    <section className="assessment-hero">
      <div className="assessment-score">
        <span>
          {isSimulation ? "Lifestyle simulation" : scope === "COUPLE" ? "Joint estimate" : "Clinician assessment"}
        </span>
        <strong>
          {probability.toFixed(1)}
          <small>%</small>
        </strong>
        <em>{tierData.label}</em>
      </div>
      <div className="assessment-summary">
        <span className="soft-pill light-pill">
          <Sparkles size={14} />
          {isSimulation ? "Lifestyle scenario" : model ? `Model ${model}` : "Calibrated estimate"}
          {date && !isSimulation ? ` · ${date}` : ""}
        </span>
        <h2>This is a starting point, not a verdict.</h2>
        <p>
          {tierData.summary ? `${tierData.summary} ` : ""}
          {isSimulation
            ? "This is a projected scenario based on your lifestyle changes — your official record is unchanged."
            : "It reflects your clinician-validated markers today and grows more precise with each consultation."}
        </p>
        {low !== null && high !== null && (
          <div className="range-row">
            <span>95% confidence range</span>
            <strong>
              {pct(low)} <i /> {pct(high)}
            </strong>
          </div>
        )}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Clinician-Locked Biomarker Cards (read-only display)
// ─────────────────────────────────────────────────────────────────────────────
function LockedBiomarkerCards({ profile }: { profile: PatientProfile }) {
  const isFemale = profile.sex === "female";
  const isMale = profile.sex === "male";

  const cards: { label: string; value: string; unit?: string; note: string }[] = [];

  if (profile.age) cards.push({ label: "Age", value: String(profile.age), unit: "years", note: "Clinical record" });
  if (profile.bmi) cards.push({ label: "BMI", value: profile.bmi.toFixed(1), unit: "kg/m²", note: "Clinical record" });

  if (isFemale) {
    if (profile.amh !== null && profile.amh !== undefined)
      cards.push({ label: "AMH (Ovarian Reserve)", value: profile.amh.toFixed(2), unit: "ng/mL", note: "Laboratory validated" });
    if (profile.antralFollicleCount !== null && profile.antralFollicleCount !== undefined)
      cards.push({ label: "Antral Follicle Count", value: String(profile.antralFollicleCount), unit: "AFC", note: "Ultrasound verified" });
    if (profile.pcosHistory)
      cards.push({ label: "PCOS History", value: "Confirmed", note: "Clinician recorded" });
  }

  if (isMale) {
    if (profile.spermCount !== null && profile.spermCount !== undefined)
      cards.push({ label: "Sperm Concentration", value: profile.spermCount.toFixed(1), unit: "M/mL", note: "WHO 6th Ed. verified" });
  }

  if (cards.length === 0) return null;

  return (
    <article className="panel" style={{ marginBottom: 16 }}>
      <div className="panel-head">
        <div>
          <h2>Your clinician-validated indicators</h2>
          <p>
            <LockKeyhole size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />
            These values were recorded by your fertility specialist and cannot be edited here
          </p>
        </div>
      </div>
      <div className="form-grid" style={{ gap: 12 }}>
        {cards.map((c) => (
          <div
            key={c.label}
            style={{
              background: "var(--canvas, #f5f8f6)",
              border: "1px solid var(--line, #e3eae6)",
              borderRadius: 10,
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 4
            }}
          >
            <span style={{ fontSize: "0.75rem", color: "var(--muted, #71817d)", display: "flex", alignItems: "center", gap: 4 }}>
              <LockKeyhole size={11} /> {c.note}
            </span>
            <span style={{ fontFamily: "Manrope, sans-serif", fontWeight: 700, fontSize: "1.15rem", color: "var(--ink, #173330)" }}>
              {c.value}
              {c.unit && <small style={{ fontWeight: 400, fontSize: "0.8rem", marginLeft: 4, color: "var(--muted, #71817d)" }}>{c.unit}</small>}
            </span>
            <span style={{ fontSize: "0.82rem", color: "var(--ink, #173330)", fontWeight: 500 }}>{c.label}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Plain-Language Factor Breakdown
// ─────────────────────────────────────────────────────────────────────────────
function FactorBreakdown({ prediction }: { prediction: StoredPrediction | PredictResponse }) {
  const modifiable = "modifiable_factors" in prediction
    ? prediction.modifiable_factors
    : [];
  const nonModifiable = "non_modifiable_factors" in prediction
    ? prediction.non_modifiable_factors
    : [];

  if (modifiable.length === 0 && nonModifiable.length === 0) return null;

  return (
    <section className="factor-columns" style={{ marginBottom: 16 }}>
      {modifiable.length > 0 && (
        <article className="panel factor-panel modifiable">
          <div className="factor-title">
            <span><Leaf size={20} /></span>
            <div>
              <h2>What you can influence</h2>
              <p>Small, sustained changes can strengthen your readiness.</p>
            </div>
          </div>
          {modifiable.map((f) => (
            <div className="factor-item" key={f.factor}>
              <div><strong>{f.factor}</strong></div>
              <em>{f.target}</em>
              <p>{f.clinicalRationale}</p>
            </div>
          ))}
        </article>
      )}
      {nonModifiable.length > 0 && (
        <article className="panel factor-panel fixed">
          <div className="factor-title">
            <span><LockKeyhole size={20} /></span>
            <div>
              <h2>Your natural biological baseline</h2>
              <p>Context your care team plans around — never a judgement.</p>
            </div>
          </div>
          {nonModifiable.map((f) => (
            <div className="factor-item" key={f.factor}>
              <div><strong>{f.factor}</strong></div>
              <em>{f.impact}</em>
              <p>{f.clinicalRationale}</p>
            </div>
          ))}
        </article>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Lifestyle Simulator (patient-safe — only modifiable lifestyle parameters)
// ─────────────────────────────────────────────────────────────────────────────
function LifestyleSimulator({
  profile,
  simBmi,
  setSimBmi,
  simSleep,
  setSimSleep,
  simResult,
  simRunning,
  simError,
  onRun,
  onReset
}: {
  profile: PatientProfile;
  simBmi: number | null;
  setSimBmi: (v: number | null) => void;
  simSleep: number | null;
  setSimSleep: (v: number | null) => void;
  simResult: PredictResponse | null;
  simRunning: boolean;
  simError: string;
  onRun: () => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);

  if (!profile.age) return null;

  return (
    <article className="panel" style={{ marginBottom: 16 }}>
      <div className="panel-head" style={{ cursor: "pointer" }} onClick={() => setOpen((o) => !o)}>
        <div>
          <h2>
            <SlidersHorizontal size={16} style={{ verticalAlign: "middle", marginRight: 6 }} />
            What-If Lifestyle Simulator
          </h2>
          <p>
            Explore how lifestyle changes could project your trajectory — your official medical chart
            is never altered by this simulation.
          </p>
        </div>
        <button className="secondary" style={{ flexShrink: 0 }} onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}>
          {open ? "Close" : "Open simulator"}
        </button>
      </div>

      {open && (
        <div style={{ marginTop: 16 }}>
          <div className="form-grid" style={{ marginBottom: 16 }}>
            <label className="field">
              <span>
                Target BMI <em>kg/m²</em>
              </span>
              <input
                type="range"
                min={16}
                max={40}
                step={0.5}
                value={simBmi ?? profile.bmi ?? 22}
                onChange={(e) => setSimBmi(Number(e.target.value))}
                style={{ width: "100%", accentColor: "var(--teal, #0c655e)" }}
              />
              <span style={{ fontSize: "0.9rem", color: "var(--teal, #0c655e)", fontWeight: 600 }}>
                {(simBmi ?? profile.bmi ?? 22).toFixed(1)} kg/m²
                {simBmi && (simBmi >= 20 && simBmi <= 24.9) ? (
                  <span style={{ color: "#1e9e77", marginLeft: 8, fontSize: "0.8rem" }}>✓ Optimal range</span>
                ) : null}
              </span>
            </label>
            <label className="field">
              <span>
                Sleep duration target <em>hours/night</em>
              </span>
              <input
                type="range"
                min={5}
                max={10}
                step={0.5}
                value={simSleep ?? 7}
                onChange={(e) => setSimSleep(Number(e.target.value))}
                style={{ width: "100%", accentColor: "var(--teal, #0c655e)" }}
              />
              <span style={{ fontSize: "0.9rem", color: "var(--teal, #0c655e)", fontWeight: 600 }}>
                {(simSleep ?? 7).toFixed(1)}h
                {simSleep && simSleep >= 7 && simSleep <= 9 ? (
                  <span style={{ color: "#1e9e77", marginLeft: 8, fontSize: "0.8rem" }}>✓ Restorative range</span>
                ) : null}
              </span>
            </label>
          </div>

          {simError && (
            <div style={{ marginBottom: 12 }}>
              <span style={{ color: "var(--coral, #de7467)", fontSize: "0.9rem" }}>{simError}</span>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="primary" onClick={onRun} disabled={simRunning}>
              {simRunning ? "Simulating…" : "Run lifestyle scenario"}
            </button>
            {simResult && (
              <button className="secondary" onClick={onReset}>
                Reset to official assessment
              </button>
            )}
          </div>

          {simResult && (
            <p style={{ marginTop: 12, fontSize: "0.82rem", color: "var(--muted, #71817d)" }}>
              <ShieldCheck size={12} style={{ verticalAlign: "middle", marginRight: 4 }} />
              This is a projected scenario only. Your official medical chart has not been changed.
            </p>
          )}
        </div>
      )}
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Preservation / Planning guidance card
// ─────────────────────────────────────────────────────────────────────────────
function GuidanceCard({ text, scope }: { text: string; scope: string }) {
  return (
    <article className="panel guidance-card" style={{ marginBottom: 16 }}>
      <span className="guidance-icon">
        {scope === "COUPLE" ? <HeartHandshake size={18} /> : <Snowflake size={18} />}
      </span>
      <div>
        <strong>{scope === "COUPLE" ? "Planning guidance" : "Fertility preservation guidance"}</strong>
        <p>{text}</p>
        <small>
          <BookOpen size={13} /> ESHRE 2020 · ASRM 2021 · WHO 6th Ed. 2021
        </small>
      </div>
    </article>
  );
}
