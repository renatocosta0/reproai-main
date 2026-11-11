"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CloudDownload,
  HeartHandshake,
  Leaf,
  LockKeyhole,
  ShieldCheck,
  SlidersHorizontal,
  Snowflake,
  Sparkles,
  UserRound
} from "lucide-react";
import { usePatient } from "@/components/patient/PatientContext";
import { ShapChart } from "@/components/charts/ShapChart";
import { FormError } from "@/components/ui/Notice";
import { api, ApiError, userMessage } from "@/lib/api-client";
import { shortDate } from "@/lib/observation-analysis";
import { pct, tierCopy } from "@/lib/tiers";
import type { PatientProfile, PredictResponse, Sex, StoredPrediction } from "@/types/patient";

type Scope = "INDIVIDUAL" | "COUPLE";

interface FormState {
  age: string;
  bmi: string;
  amh: string;
  afc: string;
  sperm: string;
  pcos: boolean;
  months: string;
  cycles: string;
}

const str = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n));

function initialForm(p: PatientProfile, scope: Scope, partnerAge: number | null): FormState {
  // In joint mode `age` is the female partner's age (that is what the model expects).
  const femaleAge = p.sex === "female" ? p.age : partnerAge;
  return {
    age: str(scope === "COUPLE" ? femaleAge : p.age),
    bmi: str(p.bmi),
    amh: p.sex === "female" ? str(p.amh) : "",
    afc: p.sex === "female" ? str(p.antralFollicleCount) : "",
    sperm: p.sex === "male" ? str(p.spermCount) : "",
    pcos: Boolean(p.pcosHistory),
    months: str(p.infertilityDurationMonths),
    cycles: str(p.priorCycles)
  };
}

const num = (s: string) => (s.trim() === "" ? undefined : Number(s));

export default function AssessmentPage() {
  const { data, loading, error: loadError, refresh } = usePatient();
  const [scope, setScope] = useState<Scope>("INDIVIDUAL");
  const [form, setForm] = useState<FormState | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<PredictResponse | null>(null);

  useEffect(() => {
    if (data && !form) {
      setForm(initialForm(data.profile, "INDIVIDUAL", data.partner?.age ?? null));
      setShowForm(!data.latestPrediction);
    }
  }, [data, form]);

  if (loading || !form) {
    return (
      <div className="content patient-content">
        {loadError ? <FormError>{loadError}</FormError> : <div className="loading-block" style={{ height: 260, margin: 0 }} />}
      </div>
    );
  }
  if (!data) return null;

  const { profile, isPaired, partner, latestPrediction } = data;
  const sex: Sex | null = profile.sex;
  const showFemale = scope === "COUPLE" || sex === "female";
  const showMale = scope === "COUPLE" || sex === "male";

  function switchScope(next: Scope) {
    setScope(next);
    setForm(initialForm(profile, next, partner?.age ?? null));
    setError("");
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }

  async function assess(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError("");
    const age = num(form.age);
    const bmi = num(form.bmi);
    if (age === undefined || age < 18 || age > 55) return setError("Age must be between 18 and 55.");
    if (bmi === undefined || bmi < 10 || bmi > 60) return setError("Enter a BMI between 10 and 60.");
    if (scope === "COUPLE" && (num(form.amh) === undefined || num(form.sperm) === undefined)) {
      return setError("A joint estimate needs both the AMH value and the sperm concentration.");
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        scope,
        sex: sex ?? undefined,
        age,
        bmi,
        pcos_history: showFemale ? form.pcos : undefined,
        infertility_duration_months: num(form.months),
        prior_cycles: num(form.cycles),
        preservation_intent: profile.preservationIntent ?? undefined
      };
      if (showFemale) {
        body.amh = num(form.amh);
        body.antral_follicle_count = num(form.afc);
      }
      if (showMale) body.sperm_count = num(form.sperm);
      // Drop undefined keys: the API distinguishes "absent" from "null".
      Object.keys(body).forEach((k) => body[k] === undefined && delete body[k]);

      const res = await api<PredictResponse>("/api/predict", { method: "POST", body: JSON.stringify(body) });
      setResult(res);
      setShowForm(false);
      await refresh();
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 502
          ? "The assessment engine is not reachable right now. Please try again in a few minutes."
          : userMessage(err, "The assessment could not be completed.")
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="content patient-content">
      <div className="page-heading">
        <div>
          <p className="date-label">YOUR ASSESSMENT</p>
          <h1>Reproductive potential</h1>
          <span>A transparent, clinician-guided view of the factors shaping your journey.</span>
        </div>
        {(latestPrediction || result) && (
          <button className="secondary" onClick={() => setShowForm(!showForm)}>
            <SlidersHorizontal size={16} /> {showForm ? "Close form" : "Update my details"}
          </button>
        )}
      </div>

      {showForm && (
        <form className="panel assessment-form" onSubmit={assess}>
          <div className="panel-head">
            <div>
              <h2>Clinical inputs</h2>
              <p>Use values from your most recent lab reports. Leave a lab value blank if you don&apos;t have it.</p>
            </div>
          </div>

          {isPaired && (
            <div className="role-tabs" style={{ maxWidth: 420, marginBottom: 18 }} role="tablist">
              <button type="button" role="tab" aria-selected={scope === "INDIVIDUAL"} className={scope === "INDIVIDUAL" ? "active" : ""} onClick={() => switchScope("INDIVIDUAL")}>
                <UserRound size={16} /> Just me
              </button>
              <button type="button" role="tab" aria-selected={scope === "COUPLE"} className={scope === "COUPLE" ? "active" : ""} onClick={() => switchScope("COUPLE")}>
                <HeartHandshake size={16} /> Joint estimate
              </button>
            </div>
          )}

          <div className="form-grid">
            <NumField label={scope === "COUPLE" ? "Female partner's age" : "Age"} unit="years" value={form.age} onChange={(v) => set("age", v)} min={18} max={55} required />
            <NumField label={scope === "COUPLE" ? "Female partner's BMI" : "BMI"} unit="kg/m²" value={form.bmi} onChange={(v) => set("bmi", v)} step="0.1" min={10} max={60} required />
            {showFemale && (
              <>
                <NumField label="AMH" unit="ng/mL" value={form.amh} onChange={(v) => set("amh", v)} step="0.01" min={0} />
                <NumField label="Antral follicle count" unit="AFC" value={form.afc} onChange={(v) => set("afc", v)} min={0} />
              </>
            )}
            {showMale && (
              <NumField label="Sperm concentration" unit="million/mL" value={form.sperm} onChange={(v) => set("sperm", v)} step="0.1" min={0} />
            )}
            <NumField label="Months trying to conceive" unit="0 if not trying" value={form.months} onChange={(v) => set("months", v)} min={0} />
            {scope === "COUPLE" && (
              <NumField label="Previous treatment cycles" unit="IUI / IVF" value={form.cycles} onChange={(v) => set("cycles", v)} min={0} />
            )}
          </div>
          {showFemale && (
            <label className="check-field">
              <input type="checkbox" checked={form.pcos} onChange={(e) => set("pcos", e.target.checked)} />
              <span>Diagnosed with polycystic ovary syndrome (PCOS)</span>
            </label>
          )}
          {error && <div style={{ marginBottom: 14 }}><FormError>{error}</FormError></div>}
          <button className="primary" disabled={saving}>
            {saving ? "Calculating…" : "Calculate my assessment"} <ArrowRight size={16} />
          </button>
        </form>
      )}

      {result ? (
        <FullResult result={result} />
      ) : latestPrediction ? (
        <StoredResult prediction={latestPrediction} />
      ) : (
        !showForm && (
          <div className="panel empty-state">
            <strong>No assessment yet</strong>
            Enter your clinical values above to get your first estimate.
          </div>
        )
      )}

      <div className="clinical-note" style={{ marginTop: 16 }}>
        <ShieldCheck size={20} />
        <span>
          <strong>Important clinical context</strong>
          This screening estimate does not diagnose infertility or evaluate tubal patency, anatomy, or severe
          endometriosis. Your reproductive endocrinologist makes the final clinical assessment.
        </span>
        {profile.coupleId && (latestPrediction || result) && (
          <a className="secondary" href={`/api/reports/${profile.coupleId}`}>
            <CloudDownload size={16} /> Download report
          </a>
        )}
      </div>
    </div>
  );
}

function NumField(props: {
  label: string;
  unit?: string;
  value: string;
  onChange: (v: string) => void;
  step?: string;
  min?: number;
  max?: number;
  required?: boolean;
}) {
  return (
    <label className="field">
      <span>
        {props.label}
        {props.unit && <em>{props.unit}</em>}
      </span>
      <input
        type="number"
        inputMode="decimal"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        step={props.step ?? "1"}
        min={props.min}
        max={props.max}
        required={props.required}
      />
    </label>
  );
}

function Hero(props: { probability: number; low: number | null; high: number | null; tier: string | null; scope: string; model: string | null; date?: string }) {
  const tier = tierCopy(props.tier);
  return (
    <section className="assessment-hero">
      <div className="assessment-score">
        <span>{props.scope === "COUPLE" ? "Joint estimate" : "Current estimate"}</span>
        <strong>
          {props.probability.toFixed(1)}
          <small>%</small>
        </strong>
        <em>{tier.label}</em>
      </div>
      <div className="assessment-summary">
        <span className="soft-pill light-pill">
          <Sparkles size={14} /> {props.model ? `Model ${props.model}` : "Calibrated estimate"}
          {props.date ? ` · ${props.date}` : ""}
        </span>
        <h2>This is a starting point, not a verdict.</h2>
        <p>
          {tier.summary ? `${tier.summary} ` : ""}
          {props.scope === "COUPLE"
            ? "It becomes more useful as you both add data over time."
            : "It reflects your own markers today and becomes more useful as you add data over time."}
        </p>
        {props.low !== null && props.high !== null && (
          <div className="range-row">
            <span>95% confidence range</span>
            <strong>
              {pct(props.low)} <i /> {pct(props.high)}
            </strong>
          </div>
        )}
      </div>
    </section>
  );
}

function StoredResult({ prediction }: { prediction: StoredPrediction }) {
  return (
    <>
      <Hero
        probability={prediction.probability}
        low={prediction.confidenceLow}
        high={prediction.confidenceHigh}
        tier={prediction.tier}
        scope={prediction.scope}
        model={prediction.modelVersion}
        date={shortDate(prediction.createdAt)}
      />
      {prediction.factors && prediction.factors.length > 0 && (
        <article className="panel" style={{ marginBottom: 16 }}>
          <div className="panel-head">
            <div>
              <h2>What shaped this estimate</h2>
              <p>Each factor&apos;s contribution compared with a reference population</p>
            </div>
          </div>
          <ShapChart factors={prediction.factors} />
        </article>
      )}
      {prediction.preservationGuidance && <GuidanceCard text={prediction.preservationGuidance} scope={prediction.scope} />}
    </>
  );
}

function FullResult({ result }: { result: PredictResponse }) {
  return (
    <>
      <Hero
        probability={result.probability}
        low={result.confidence_low}
        high={result.confidence_high}
        tier={result.tier}
        scope={result.scope}
        model={result.model_version}
      />

      <article className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-head">
          <div>
            <h2>What shaped this estimate</h2>
            <p>Each factor&apos;s contribution compared with a reference population</p>
          </div>
        </div>
        <ShapChart factors={result.factors} />
      </article>

      <section className="factor-columns">
        <article className="panel factor-panel modifiable">
          <div className="factor-title">
            <span><Leaf size={20} /></span>
            <div>
              <h2>Factors you can influence</h2>
              <p>Small, supported changes can strengthen readiness.</p>
            </div>
          </div>
          {result.modifiable_factors.length === 0 ? (
            <p className="factor-empty">No modifiable factors were included in this assessment.</p>
          ) : (
            result.modifiable_factors.map((f) => (
              <div className="factor-item" key={f.factor}>
                <div><strong>{f.factor}</strong></div>
                <em>{f.target}</em>
                <p>{f.clinicalRationale}</p>
              </div>
            ))
          )}
        </article>
        <article className="panel factor-panel fixed">
          <div className="factor-title">
            <span><LockKeyhole size={20} /></span>
            <div>
              <h2>Factors we plan around</h2>
              <p>Context your care team uses, never a judgement.</p>
            </div>
          </div>
          {result.non_modifiable_factors.length === 0 ? (
            <p className="factor-empty">No fixed factors were included in this assessment.</p>
          ) : (
            result.non_modifiable_factors.map((f) => (
              <div className="factor-item" key={f.factor}>
                <div><strong>{f.factor}</strong></div>
                <em>{f.impact}</em>
                <p>{f.clinicalRationale}</p>
              </div>
            ))
          )}
        </article>
      </section>

      {result.preservation_guidance && <GuidanceCard text={result.preservation_guidance} scope={result.scope} />}

      <section className="factor-columns">
        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Options to discuss with your clinician</h2>
              <p>Suggested pathways, not instructions</p>
            </div>
          </div>
          <ul className="plain-list">
            {result.recommended_options.map((o) => <li key={o}>{o}</li>)}
          </ul>
        </article>
        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Limits of this estimate</h2>
              <p>What the model does not see</p>
            </div>
          </div>
          <ul className="plain-list">
            {result.limitations.map((l) => <li key={l}>{l}</li>)}
            <li>{result.disclaimer}</li>
          </ul>
        </article>
      </section>
    </>
  );
}

function GuidanceCard({ text, scope }: { text: string; scope: string }) {
  return (
    <article className="panel guidance-card">
      <span className="guidance-icon">{scope === "COUPLE" ? <HeartHandshake size={18} /> : <Snowflake size={18} />}</span>
      <div>
        <strong>{scope === "COUPLE" ? "Planning guidance" : "Fertility preservation guidance"}</strong>
        <p>{text}</p>
        <small><BookOpen size={13} /> ESHRE 2020 · ASRM 2021 · WHO 2021</small>
      </div>
    </article>
  );
}
