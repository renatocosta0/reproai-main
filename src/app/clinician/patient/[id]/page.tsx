"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BellPlus,
  CloudDownload,
  FileJson,
  FlaskConical,
  HeartHandshake,
  NotebookPen,
  SlidersHorizontal,
  Sparkles,
  UserRound
} from "lucide-react";
import { useClinician } from "@/components/clinician/ClinicianContext";
import { ShapChart } from "@/components/charts/ShapChart";
import { TemperatureChart } from "@/components/charts/TemperatureChart";
import { SleepChart } from "@/components/charts/SleepChart";
import { EstimateHistoryChart } from "@/components/charts/EstimateHistoryChart";
import { ClinicalNotice, FormError } from "@/components/ui/Notice";
import { api, userMessage } from "@/lib/api-client";
import {
  analyzeBbt,
  isSleep,
  isTemperature,
  series,
  shortDate,
  sleepStats,
  formatHours
} from "@/lib/observation-analysis";
import { caseInitials, peopleName, timeAgo } from "@/lib/format";
import { STATUS_LABELS, type FollowUpStatus } from "@/lib/follow-up";
import { tierCopy, WHO_SPERM_LOWER_LIMIT } from "@/lib/tiers";
import { pct } from "@/lib/tiers";
import type { CaseDetail } from "@/types/clinician";
import type { PatientProfile, PredictResponse } from "@/types/patient";

// ─────────────────────────────────────────────────────────────────────────────
// Biomarker form state — only fields the clinician may enter
// ─────────────────────────────────────────────────────────────────────────────
interface BiomarkerForm {
  // Female
  femaleAge: string;
  femaleBmi: string;
  amh: string;
  afc: string;
  pcos: boolean;
  durationMonths: string;
  priorCycles: string;
  // Male
  maleAge: string;
  maleBmi: string;
  spermConc: string;
}

function emptyForm(): BiomarkerForm {
  return {
    femaleAge: "", femaleBmi: "", amh: "", afc: "", pcos: false, durationMonths: "", priorCycles: "",
    maleAge: "", maleBmi: "", spermConc: ""
  };
}

function prefillForm(patients: PatientProfile[]): BiomarkerForm {
  const f = patients.find((p) => p.sex === "female");
  const m = patients.find((p) => p.sex === "male");
  const s = (n: number | null | undefined) => (n == null ? "" : String(n));
  return {
    femaleAge: s(f?.age), femaleBmi: s(f?.bmi), amh: s(f?.amh), afc: s(f?.antralFollicleCount),
    pcos: Boolean(f?.pcosHistory), durationMonths: s(f?.infertilityDurationMonths ?? m?.infertilityDurationMonths),
    priorCycles: s(f?.priorCycles ?? m?.priorCycles),
    maleAge: s(m?.age), maleBmi: s(m?.bmi), spermConc: s(m?.spermCount)
  };
}

const num = (s: string) => (s.trim() === "" ? undefined : Number(s));

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function CaseDetailPage({ params }: { params: { id: string } }) {
  const { bump } = useClinician();
  const [data, setData] = useState<CaseDetail | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  // Biomarker CDSS form state
  const [bioFormOpen, setBioFormOpen] = useState(false);
  const [bioForm, setBioForm] = useState<BiomarkerForm>(emptyForm());
  const [bioError, setBioError] = useState("");
  const [cdssResult, setCdssResult] = useState<PredictResponse | null>(null);
  const [cdssRunning, setCdssRunning] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api<CaseDetail>(`/api/clinician/cases/${params.id}`));
      setError("");
    } catch (err) {
      setError(userMessage(err, "Could not load this record."));
    }
  }, [params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  // Pre-fill biomarker form when data loads
  useEffect(() => {
    if (data?.patients.length) {
      setBioForm(prefillForm(data.patients));
    }
  }, [data]);

  async function exportFhir() {
    setBusy("fhir");
    try {
      const res = await fetch(`/api/fhir/export?coupleId=${encodeURIComponent(params.id)}`, {
        credentials: "include"
      });
      if (!res.ok) throw new Error();
      const blob = new Blob([JSON.stringify(await res.json(), null, 2)], {
        type: "application/fhir+json"
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reproai-fhir-${params.id.slice(0, 8)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("The FHIR export failed. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function openFollowUp() {
    setBusy("followup");
    try {
      await api("/api/follow-up", {
        method: "POST",
        body: JSON.stringify({ coupleId: params.id, note: "Opened by clinician from the patient record." })
      });
      setNotice("Follow-up opened. It now appears on the follow-up board.");
      bump();
      await load();
    } catch (err) {
      setError(userMessage(err, "Could not open a follow-up."));
    } finally {
      setBusy(null);
    }
  }

  // ── CDSS: Run Predictive Simulation ──
  async function runCdss(e: FormEvent) {
    e.preventDefault();
    setBioError("");
    setCdssResult(null);
    const f = bioForm;
    const isCouple = data
      ? data.patients.length > 1 || data.invitation?.scope === "COUPLE"
      : false;

    // Build the ML payload based on who is in this case
    const hasFemale = data?.patients.some((p) => p.sex === "female") ?? (num(f.femaleAge) !== undefined);
    const hasMale = data?.patients.some((p) => p.sex === "male") ?? (num(f.spermConc) !== undefined);

    const body: Record<string, unknown> = {
      scope: isCouple && hasFemale && hasMale ? "COUPLE" : "INDIVIDUAL",
      targetCoupleId: params.id
    };

    if (hasFemale || !hasMale) {
      const age = num(f.femaleAge);
      const bmi = num(f.femaleBmi);
      if (!age || age < 18 || age > 55) return setBioError("Female age must be between 18 and 55.");
      if (!bmi || bmi < 10 || bmi > 60) return setBioError("Female BMI must be between 10 and 60.");
      body.age = age;
      body.bmi = bmi;
      body.sex = "female";
      if (f.amh) body.amh = num(f.amh);
      if (f.afc) body.antral_follicle_count = num(f.afc);
      body.pcos_history = f.pcos;
      if (f.durationMonths) body.infertility_duration_months = num(f.durationMonths);
      if (f.priorCycles) body.prior_cycles = num(f.priorCycles);
    }

    if (hasMale) {
      const maleAge = num(f.maleAge);
      const maleBmi = num(f.maleBmi);
      if (maleAge !== undefined && (maleAge < 18 || maleAge > 75)) return setBioError("Male age must be between 18 and 75.");
      if (body.scope === "COUPLE") {
        if (f.spermConc) body.sperm_count = num(f.spermConc);
      } else {
        // Individual male assessment
        if (!maleAge || maleAge < 18) return setBioError("Male age is required (18–75).");
        body.age = maleAge;
        body.bmi = maleBmi;
        body.sex = "male";
        if (f.spermConc) body.sperm_count = num(f.spermConc);
        if (f.durationMonths) body.infertility_duration_months = num(f.durationMonths);
        if (f.priorCycles) body.prior_cycles = num(f.priorCycles);
      }
    }

    Object.keys(body).forEach((k) => body[k] === undefined && delete body[k]);

    setCdssRunning(true);
    try {
      const res = await api<PredictResponse>("/api/predict", { method: "POST", body: JSON.stringify(body) });
      setCdssResult(res);
      setNotice("Predictive simulation completed and saved to this case.");
      bump();
      await load();
    } catch (err) {
      setBioError(userMessage(err, "The predictive simulation failed. Please try again."));
    } finally {
      setCdssRunning(false);
    }
  }

  if (error && !data) return <div className="content"><FormError>{error}</FormError></div>;
  if (!data) return <div className="content"><div className="loading-block" style={{ margin: 0, height: 260 }} /></div>;

  const emails = data.users.map((u) => u.email);
  const name = peopleName(data.patients, emails);
  const isCouple = data.patients.length > 1 || data.invitation?.scope === "COUPLE";
  const latest = cdssResult ? null : (data.predictions[0] ?? null);
  const history = [...data.predictions].reverse();
  const openFollowUps = data.followUps.filter((f) => f.status !== "CLOSED" && f.status !== "LOST");
  const emailFor = (userId: string | null) => data.users.find((u) => u.id === userId)?.email ?? null;

  const displayResult = cdssResult ?? (latest ? { ...latest, factors: latest.factors ?? [] } : null);

  return (
    <div className="content">
      <Link href="/clinician/dashboard" className="text-button" style={{ marginBottom: 14, width: "max-content" }}>
        <ArrowLeft size={15} /> Back to cohort
      </Link>
      <div className="page-heading">
        <div className="case-heading">
          <div className="avatar peach" aria-hidden>{caseInitials(name)}</div>
          <div>
            <p className="date-label">{isCouple ? "COUPLE RECORD" : "INDIVIDUAL RECORD"}</p>
            <h1>{name}</h1>
            <span>
              In care since {shortDate(data.createdAt)}
              {data.invitation ? ` · prescription ${data.invitation.status.toLowerCase()}` : ""}
            </span>
          </div>
        </div>
        <div className="heading-actions">
          {openFollowUps.length === 0 && (
            <button className="secondary" onClick={openFollowUp} disabled={busy === "followup"}>
              <BellPlus size={16} /> {busy === "followup" ? "Opening…" : "Open follow-up"}
            </button>
          )}
          {data.predictions.length > 0 && (
            <a className="secondary" href={`/api/reports/${data.id}`}>
              <CloudDownload size={16} /> PDF report
            </a>
          )}
          <button className="primary compact" onClick={exportFhir} disabled={busy === "fhir"}>
            <FileJson size={16} /> {busy === "fhir" ? "Exporting…" : "Export FHIR R4"}
          </button>
        </div>
      </div>

      {notice && <div style={{ marginBottom: 14 }}><ClinicalNotice>{notice}</ClinicalNotice></div>}
      {error && <div style={{ marginBottom: 14 }}><FormError>{error}</FormError></div>}
      {data.invitation?.notes && (
        <div style={{ marginBottom: 16 }}>
          <ClinicalNotice icon={NotebookPen}>
            <strong>Prescription note:</strong> {data.invitation.notes}
          </ClinicalNotice>
        </div>
      )}

      {/* Patient record cards */}
      <section className="people-grid">
        {data.patients.length === 0 && (
          <article className="panel empty-state">
            <strong>Waiting for activation</strong>
            The invited {isCouple ? "partners haven't" : "patient hasn't"} activated their account yet.
          </article>
        )}
        {data.patients.map((p) => (
          <PersonCard
            key={p.id}
            p={p}
            email={emailFor(p.userId)}
            consentAt={data.users.find((u) => u.id === p.userId)?.consentAt ?? null}
          />
        ))}
      </section>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* CLINICAL DIAGNOSTIC BIOMARKER ENTRY & CDSS FORM                   */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <article className="panel" style={{ marginBottom: 16 }}>
        <div
          className="panel-head"
          style={{ cursor: "pointer" }}
          onClick={() => setBioFormOpen((o) => !o)}
        >
          <div>
            <h2>
              <FlaskConical size={16} style={{ verticalAlign: "middle", marginRight: 6 }} />
              Clinical Diagnostic Biomarker Entry
            </h2>
            <p>
              Enter or update verified laboratory results, then run a predictive simulation (CDSS)
              with Shapley-attributed prognostics and ESHRE/POSEIDON guideline stratification.
            </p>
          </div>
          <button
            className="primary compact"
            onClick={(e) => { e.stopPropagation(); setBioFormOpen((o) => !o); }}
          >
            <SlidersHorizontal size={15} /> {bioFormOpen ? "Close form" : "Enter / update biomarkers"}
          </button>
        </div>

        {bioFormOpen && (
          <form onSubmit={runCdss} style={{ marginTop: 16 }}>
            {/* Female biomarkers */}
            {(data.patients.some((p) => p.sex === "female") || !data.patients.some((p) => p.sex === "male")) && (
              <fieldset style={{ border: "1px solid var(--line, #e3eae6)", borderRadius: 10, padding: "16px 20px", marginBottom: 16 }}>
                <legend style={{ padding: "0 8px", fontWeight: 700, fontFamily: "Manrope, sans-serif", fontSize: "0.9rem" }}>
                  Female Patient Biomarkers
                </legend>
                <div className="form-grid">
                  <NumField label="Age" unit="years" value={bioForm.femaleAge} onChange={(v) => setBioForm((f) => ({ ...f, femaleAge: v }))} min={18} max={55} required />
                  <NumField label="BMI" unit="kg/m²" value={bioForm.femaleBmi} onChange={(v) => setBioForm((f) => ({ ...f, femaleBmi: v }))} step="0.1" min={10} max={60} required />
                  <NumField label="Serum AMH (Anti-Müllerian Hormone)" unit="ng/mL" value={bioForm.amh} onChange={(v) => setBioForm((f) => ({ ...f, amh: v }))} step="0.01" min={0} />
                  <NumField label="Antral Follicle Count (AFC)" unit="follicles · transvaginal US" value={bioForm.afc} onChange={(v) => setBioForm((f) => ({ ...f, afc: v }))} min={0} />
                  <NumField label="Infertility duration" unit="months" value={bioForm.durationMonths} onChange={(v) => setBioForm((f) => ({ ...f, durationMonths: v }))} min={0} />
                  <NumField label="Prior IVF/IUI cycles" unit="n" value={bioForm.priorCycles} onChange={(v) => setBioForm((f) => ({ ...f, priorCycles: v }))} min={0} />
                </div>
                <label className="check-field" style={{ marginTop: 8 }}>
                  <input
                    type="checkbox"
                    checked={bioForm.pcos}
                    onChange={(e) => setBioForm((f) => ({ ...f, pcos: e.target.checked }))}
                  />
                  <span>Polycystic Ovary Syndrome (PCOS) confirmed</span>
                </label>
              </fieldset>
            )}

            {/* Male biomarkers */}
            {data.patients.some((p) => p.sex === "male") && (
              <fieldset style={{ border: "1px solid var(--line, #e3eae6)", borderRadius: 10, padding: "16px 20px", marginBottom: 16 }}>
                <legend style={{ padding: "0 8px", fontWeight: 700, fontFamily: "Manrope, sans-serif", fontSize: "0.9rem" }}>
                  Male Patient Biomarkers (WHO 6th Ed.)
                </legend>
                <div className="form-grid">
                  <NumField label="Age" unit="years" value={bioForm.maleAge} onChange={(v) => setBioForm((f) => ({ ...f, maleAge: v }))} min={18} max={80} />
                  <NumField label="BMI" unit="kg/m²" value={bioForm.maleBmi} onChange={(v) => setBioForm((f) => ({ ...f, maleBmi: v }))} step="0.1" min={10} max={60} />
                  <NumField label="Sperm concentration" unit="M/mL · WHO 6th Ed. ref. ≥15" value={bioForm.spermConc} onChange={(v) => setBioForm((f) => ({ ...f, spermConc: v }))} step="0.1" min={0} />
                </div>
              </fieldset>
            )}

            {bioError && <div style={{ marginBottom: 12 }}><FormError>{bioError}</FormError></div>}

            <button className="primary" type="submit" disabled={cdssRunning}>
              {cdssRunning ? "Running simulation…" : "Run Predictive Simulation (CDSS)"}
              {!cdssRunning && <ArrowRight size={16} />}
            </button>
          </form>
        )}

        {/* CDSS Result — rendered right inside the form panel */}
        {cdssResult && (
          <div style={{ marginTop: 24, borderTop: "1px solid var(--line, #e3eae6)", paddingTop: 20 }}>
            <CdssResult result={cdssResult} />
          </div>
        )}
      </article>

      {/* ── Estimate history & SHAP chart ── */}
      <section className="factor-columns">
        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Estimate history</h2>
              <p>{data.predictions.length} assessment{data.predictions.length === 1 ? "" : "s"} · shaded band is the 95% range</p>
            </div>
          </div>
          {history.length === 0 ? (
            <div className="empty-state">No assessments yet. Run a predictive simulation above.</div>
          ) : (
            <>
              <div className="large-chart-wrap">
                <EstimateHistoryChart
                  points={history.map((h) => ({
                    date: new Date(h.createdAt),
                    probability: h.probability,
                    low: h.confidenceLow,
                    high: h.confidenceHigh
                  }))}
                />
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Date</th><th>Scope</th><th>Estimate</th><th>Tier</th><th>Run by</th></tr>
                  </thead>
                  <tbody>
                    {data.predictions.slice(0, 8).map((h) => (
                      <tr key={h.id}>
                        <td>{shortDate(h.createdAt)}</td>
                        <td>{h.scope === "COUPLE" ? "Joint" : "Individual"}</td>
                        <td>
                          <strong>{h.probability.toFixed(1)}%</strong>
                          {h.confidenceLow != null && h.confidenceHigh != null
                            ? ` (${Math.round(h.confidenceLow)}–${Math.round(h.confidenceHigh)})`
                            : ""}
                        </td>
                        <td>{tierCopy(h.tier).label}</td>
                        <td>{emailFor(h.userId) ?? "–"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </article>

        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Latest factor contributions (SHAP)</h2>
              <p>
                {displayResult
                  ? `${displayResult.scope === "COUPLE" ? "Joint" : "Individual"} assessment${
                      "createdAt" in displayResult ? `, ${shortDate((displayResult as any).createdAt)}` : " · just now"
                    }`
                  : "No assessment yet"}
              </p>
            </div>
          </div>
          {displayResult?.factors?.length ? (
            <ShapChart factors={displayResult.factors} />
          ) : (
            <div className="empty-state">Shapley attribution appears after the first assessment.</div>
          )}
          {(cdssResult?.preservation_guidance ?? latest?.preservationGuidance) && (
            <p className="detail-guidance">{cdssResult?.preservation_guidance ?? latest?.preservationGuidance}</p>
          )}
        </article>
      </section>

      {/* ── Longitudinal wearable charts ── */}
      {data.patients.filter((p) => p.userId).map((p) => {
        const obs = data.observations.filter((o) => o.userId === p.userId);
        const temps = series(obs, isTemperature);
        const sleep = series(obs, isSleep);
        const bbt = analyzeBbt(temps);
        const ss = sleepStats(sleep);
        if (temps.length < 2 && sleep.length < 2) return null;
        return (
          <section className="panel tracking-chart" key={`obs-${p.id}`} style={{ marginBottom: 16 }}>
            <div className="panel-head">
              <div>
                <h2>Wearable signals · {p.name ?? emailFor(p.userId) ?? "Patient"}</h2>
                <p>
                  {temps.length} temperature · {sleep.length} sleep readings
                  {bbt.status === "BIPHASIC"
                    ? ` · biphasic shift +${bbt.shift.toFixed(2)}°C`
                    : bbt.status === "MONOPHASIC"
                    ? ` · no sustained shift (max +${bbt.shift.toFixed(2)}°C)`
                    : ""}
                  {ss ? ` · sleep ${formatHours(ss.mean)} ± ${formatHours(ss.sd)}` : ""}
                </p>
              </div>
            </div>
            {temps.length >= 2 && (
              <div className="large-chart-wrap"><TemperatureChart points={temps} analysis={bbt} large /></div>
            )}
            {sleep.length >= 2 && ss && (
              <div className="large-chart-wrap">
                <SleepChart points={sleep.slice(-30)} stats={sleepStats(sleep.slice(-30))!} />
              </div>
            )}
          </section>
        );
      })}

      {/* ── Follow-up history ── */}
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Follow-up history</h2>
            <p>Closed-loop record for this {isCouple ? "couple" : "patient"}</p>
          </div>
          <Link className="text-button" href="/clinician/follow-up">Follow-up board</Link>
        </div>
        {data.followUps.length === 0 ? (
          <div className="empty-state">No follow-ups recorded.</div>
        ) : (
          <div className="followup-history">
            {data.followUps.map((f) => (
              <div key={f.id}>
                <span className={`status-pill ${f.status === "ALERT_RAISED" ? "rose" : f.status === "CLOSED" ? "mint" : "amber"}`}>
                  <i />{STATUS_LABELS[f.status as FollowUpStatus] ?? f.status}
                </span>
                <p>{f.note ?? "No note"}</p>
                <small>Opened {shortDate(f.createdAt)} · updated {timeAgo(f.updatedAt)}</small>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CDSS Result Panel (Shapley + POSEIDON guideline badge + treatment pathway)
// ─────────────────────────────────────────────────────────────────────────────
function CdssResult({ result }: { result: PredictResponse }) {
  const tier = tierCopy(result.tier);

  // Derive POSEIDON/ESHRE stratification badge from result fields
  function stratificationBadge() {
    return null; // Extended stratification is surfaced via preservation_guidance
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
        <div style={{ background: "var(--mint, #dff2e9)", borderRadius: 12, padding: "14px 22px", textAlign: "center", minWidth: 120 }}>
          <div style={{ fontSize: "2rem", fontWeight: 800, fontFamily: "Manrope, sans-serif", color: "var(--teal, #0c655e)" }}>
            {result.probability.toFixed(1)}<span style={{ fontSize: "1rem" }}>%</span>
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--muted, #71817d)", marginTop: 2 }}>
            {pct(result.confidence_low)}–{pct(result.confidence_high)} 95% CI
          </div>
        </div>
        <div>
          <span
            className={`status-pill ${tier.tone === "good" ? "mint" : tier.tone === "attention" ? "rose" : "amber"}`}
            style={{ marginBottom: 6, display: "inline-flex" }}
          >
            <Sparkles size={12} /> {tier.label}
          </span>
          <p style={{ margin: 0, fontSize: "0.9rem", maxWidth: 400 }}>{tier.summary}</p>
        </div>
      </div>

      {result.factors?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontFamily: "Manrope, sans-serif", marginBottom: 8, fontSize: "0.95rem" }}>
            Shapley attribution (SHAP φᵢ)
          </h3>
          <ShapChart factors={result.factors} />
        </div>
      )}

      {result.preservation_guidance && (
        <div
          style={{
            background: "var(--canvas, #f5f8f6)",
            border: "1px solid var(--line, #e3eae6)",
            borderRadius: 10,
            padding: "14px 18px",
            marginBottom: 16
          }}
        >
          <strong style={{ fontSize: "0.88rem" }}>ESHRE / POSEIDON Guideline Recommendation</strong>
          <p style={{ margin: "6px 0 0", fontSize: "0.88rem", lineHeight: 1.5 }}>{result.preservation_guidance}</p>
        </div>
      )}

      {result.recommended_options?.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <strong style={{ fontSize: "0.88rem" }}>Treatment pathways to consider</strong>
          <ul style={{ margin: "6px 0 0 18px", fontSize: "0.88rem", lineHeight: 1.7 }}>
            {result.recommended_options.map((o) => <li key={o}>{o}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Person card (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
function PersonCard({
  p,
  email,
  consentAt
}: {
  p: PatientProfile;
  email: string | null;
  consentAt: string | null;
}) {
  const rows: [string, string][] = [
    ["Age", p.age != null ? `${p.age} years` : "–"],
    ["BMI", p.bmi != null ? p.bmi.toFixed(1) : "–"]
  ];
  if (p.sex === "female") {
    rows.push(["AMH", p.amh != null ? `${p.amh} ng/mL` : "–"]);
    rows.push(["Antral follicles", p.antralFollicleCount != null ? String(p.antralFollicleCount) : "–"]);
    rows.push(["PCOS", p.pcosHistory == null ? "–" : p.pcosHistory ? "Yes" : "No"]);
  }
  if (p.sex === "male") {
    rows.push([
      "Sperm concentration",
      p.spermCount != null
        ? `${p.spermCount} M/mL${p.spermCount < WHO_SPERM_LOWER_LIMIT ? " (below WHO ref.)" : ""}`
        : "–"
    ]);
  }
  rows.push(["Months trying", p.infertilityDurationMonths != null ? String(p.infertilityDurationMonths) : "–"]);
  rows.push(["Preservation interest", p.preservationIntent ? "Yes" : "No"]);

  return (
    <article className="panel person-card">
      <div className="person-head">
        <span className="person-icon">
          {p.sex === "male" ? <UserRound size={18} /> : <HeartHandshake size={18} />}
        </span>
        <div>
          <strong>{p.name ?? email ?? "Patient"}</strong>
          <small>
            {p.sex ? (p.sex === "female" ? "Female" : "Male") : "Sex not recorded"}
            {email ? ` · ${email}` : ""}
          </small>
        </div>
      </div>
      <dl>
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <small className="consent-line">
        {consentAt ? `Consent recorded ${shortDate(consentAt)}` : "No consent record"}
      </small>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Numeric field helper
// ─────────────────────────────────────────────────────────────────────────────
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
