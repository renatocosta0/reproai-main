"use client";

import { useEffect, useState } from "react";
import { FlaskConical, Info, ListChecks } from "lucide-react";
import { FormError } from "@/components/ui/Notice";
import { api, userMessage } from "@/lib/api-client";
import type { LiveMetrics, Proportion, SimulationReport } from "@/lib/evaluation";

interface EvidenceResponse {
  live: LiveMetrics;
  simulation: SimulationReport | { error: string };
  generatedAt: string;
}

const pc = (x: number | null, d = 0) => (x === null ? "–" : `${(x * 100).toFixed(d)}%`);
const ci = (p: Proportion) => (p.low === null ? "no data yet" : `95% CI ${pc(p.low)}–${pc(p.high)} · ${p.numerator}/${p.denominator}`);
const days = (m: { median: number | null; n: number }) => (m.median === null ? "–" : `${m.median < 1 ? (m.median * 24).toFixed(1) + " h" : m.median.toFixed(1) + " d"}`);

export default function EvidencePage() {
  const [data, setData] = useState<EvidenceResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<EvidenceResponse>("/api/clinician/evidence")
      .then(setData)
      .catch((err) => setError(userMessage(err, "Could not load the evidence report.")));
  }, []);

  return (
    <div className="content">
      <div className="page-heading">
        <div>
          <p className="date-label">EVIDENCE &amp; SAFETY</p>
          <h1>Is it leading to earlier action?</h1>
          <span>Live measures from your panel, and a simulated check of calibration and false reassurance.</span>
        </div>
      </div>

      <div className="clinical-note" style={{ marginBottom: 16 }}>
        <Info size={20} />
        <span>
          <strong>How to read this report</strong>
          Live measures come from this panel&apos;s records and are small, so intervals are wide. The simulation uses synthetic records with
          a fixed seed to check the rules and the reporting; it is not evidence of clinical performance. Structure follows the
          DECIDE-AI reporting guideline (Vasey et al., BMJ 2022); this is not a claim of compliance or validation.
        </span>
      </div>

      {error && <FormError>{error}</FormError>}
      {!data && !error && <div className="loading-block" style={{ margin: 0, height: 300 }} />}

      {data && (
        <>
          <h2 className="section-title">1 · Live measures from your panel</h2>
          <section className="metrics-grid">
            <Metric label="People in your panel" value={String(data.live.people)} detail={`Intake completed ${pc(data.live.intakeCompletion.rate)} (${ci(data.live.intakeCompletion)})`} />
            <Metric label="With a baseline result" value={pc(data.live.baselineCoverage.rate)} detail={`AMH (women) or semen analysis (men) · ${ci(data.live.baselineCoverage)}`} />
            <Metric label="Signal → appointment" value={days(data.live.daysSignalToAppointment)} detail={`Median, from audit-logged transitions · ${data.live.daysSignalToAppointment.n} of ${data.live.signals} signals`} />
            <Metric label="Signal → closed" value={days(data.live.daysSignalToClosed)} detail={`Median · ${data.live.daysSignalToClosed.n} closed`} />
          </section>
          <section className="metrics-grid">
            <Metric label="Signals acted on" value={pc(data.live.signalsProgressed.rate)} detail={`Moved beyond "alert raised" · ${ci(data.live.signalsProgressed)}`} />
            <Metric label="Flagged for referral" value={String(data.live.flaggedForReferral)} detail="People with a priority-1 referral or red-flag rule" />
            <Metric label="Referral acted on" value={pc(data.live.referralActedOn.rate)} detail={`Flagged people with a follow-up beyond alert · ${ci(data.live.referralActedOn)}`} />
            <Metric label="Assessment → release" value={days(data.live.daysAssessmentToRelease)} detail={`Median clinician review time · ${data.live.daysAssessmentToRelease.n} released`} />
          </section>

          <section className="panel" style={{ marginBottom: 16 }}>
            <div className="panel-head">
              <div>
                <h2>Equitable reach</h2>
                <p>Baseline coverage and referral follow-through by group. Nationality is not yet recorded, so it cannot be reported.</p>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Group</th><th>People</th><th>With baseline</th><th>Flagged</th><th>Referral acted on</th></tr>
                </thead>
                <tbody>
                  {data.live.byGroup.map((g) => (
                    <tr key={g.group}>
                      <td>{g.group}</td>
                      <td>{g.people}</td>
                      <td>{pc(g.baseline.rate)} <small className="muted-note">({g.baseline.numerator}/{g.baseline.denominator})</small></td>
                      <td>{g.flagged}</td>
                      <td>{g.actedOn.denominator ? `${pc(g.actedOn.rate)} (${g.actedOn.numerator}/${g.actedOn.denominator})` : "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted-note" style={{ padding: "10px 20px 16px" }}>Small subgroups are unstable; no fairness claim is made from these counts.</p>
          </section>

          <h2 className="section-title">
            2 · Simulated check <span className="chip evidence"><FlaskConical size={12} /> Synthetic records</span>
          </h2>
          {"error" in data.simulation ? (
            <FormError>The simulation needs the ML service: {data.simulation.error}</FormError>
          ) : (
            <Simulation s={data.simulation} />
          )}

          <section className="panel" style={{ marginTop: 16 }}>
            <div className="panel-head">
              <div>
                <h2><ListChecks size={17} style={{ display: "inline", verticalAlign: "-3px" }} /> What a pilot still needs to measure</h2>
                <p>Proposed measures, not results</p>
              </div>
            </div>
            <ul className="plain-list">
              <li>Calibration on real Abu Dhabi outcomes (live birth, time to pregnancy), with external validation before any clinical use.</li>
              <li>False reassurance in practice: people told &quot;typical range&quot; who are later diagnosed with reduced reserve or male-factor infertility.</li>
              <li>Time from first risk signal to counselling and to specialist assessment, against usual care.</li>
              <li>Informed-choice quality (e.g. a validated decision-quality instrument) and anxiety, including in Arabic.</li>
              <li>Referral completion and preservation discussions within the effective age window, by nationality, age and sex.</li>
              <li>Clinician workload and review time; usability for patients and clinicians.</li>
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="metric-card">
      <div className="metric-label">{label}</div>
      <strong>{value}</strong>
      <div className="metric-detail">{detail}</div>
    </article>
  );
}

function Simulation({ s }: { s: SimulationReport }) {
  const r = s.reserveRule;
  const w = 320;
  const h = 220;
  const pad = 28;
  const max = Math.max(0.5, ...s.calibration.bins.map((b) => Math.max(b.predictedMean, b.observed.high ?? 0)));
  const X = (v: number) => pad + (v / max) * (w - pad * 1.5);
  const Y = (v: number) => h - pad - (v / max) * (h - pad * 1.5);

  return (
    <section className="factor-columns">
      <article className="panel">
        <div className="panel-head">
          <div>
            <h2>Reduced-reserve rule under test variability</h2>
            <p>
              {s.n} synthetic women aged 25–44 (seed {s.seed}). Reference = true AMH &lt; 1.1 ng/mL; the rule sees one measurement with
              {" "}{Math.round(s.amhTestCv * 100)}% test-to-test variation.
            </p>
          </div>
        </div>
        <div className="sim-grid">
          <SimStat label="False reassurance" p={r.falseReassurance} note="Truly low reserve, but the measurement said typical" emphasis />
          <SimStat label="Sensitivity" p={r.sensitivity} note={`${r.referencePositive} reference-positive`} />
          <SimStat label="Specificity" p={r.specificity} note="Typical reserve correctly not flagged" />
          <SimStat label="False-referral burden" p={r.falseReferral} note="Flagged, but reserve was typical" />
        </div>
        <p className="muted-note" style={{ padding: "0 20px 18px" }}>
          Why it matters: a single AMH near the threshold can falsely reassure. ReproAI shows the reference limit, the source and the date
          of every result, and the rules suggest repeat testing and clinician review rather than a verdict.
        </p>
      </article>

      <article className="panel">
        <div className="panel-head">
          <div>
            <h2>Calibration against an independent reference curve</h2>
            <p>Model estimates (deciles) vs simulated outcomes from an age-based registry-shaped curve that is not the model.</p>
          </div>
        </div>
        <div style={{ padding: "0 20px" }}>
          <svg viewBox={`0 0 ${w} ${h}`} className="calib-svg" role="img" aria-label="Calibration plot">
            <line x1={X(0)} y1={Y(0)} x2={X(max)} y2={Y(max)} stroke="#c9d6d1" strokeDasharray="4 4" />
            <line x1={X(0)} y1={Y(0)} x2={X(max)} y2={Y(0)} stroke="#dfe7e3" />
            <line x1={X(0)} y1={Y(0)} x2={X(0)} y2={Y(max)} stroke="#dfe7e3" />
            {s.calibration.bins.map((b, i) => (
              <g key={i}>
                {b.observed.low !== null && <line x1={X(b.predictedMean)} x2={X(b.predictedMean)} y1={Y(b.observed.low)} y2={Y(b.observed.high!)} stroke="#7cc3ad" strokeWidth="2" />}
                <circle cx={X(b.predictedMean)} cy={Y(b.observed.rate ?? 0)} r="4" fill="#176e65" />
              </g>
            ))}
            <text x={w / 2} y={h - 4} textAnchor="middle" fontSize="10" fill="#7d8b87">Predicted</text>
            <text x={10} y={h / 2} textAnchor="middle" fontSize="10" fill="#7d8b87" transform={`rotate(-90 10 ${h / 2})`}>Observed</text>
          </svg>
        </div>
        <div className="sim-grid">
          <div className="sim-stat"><span>Mean predicted</span><strong>{pc(s.calibration.meanPredicted, 1)}</strong></div>
          <div className="sim-stat"><span>Mean observed</span><strong>{pc(s.calibration.meanObserved, 1)}</strong></div>
          <div className="sim-stat"><span>Calibration-in-the-large</span><strong>{(s.calibration.calibrationInTheLarge * 100).toFixed(1)} pts</strong></div>
          <div className="sim-stat"><span>Brier score</span><strong>{s.calibration.brier.toFixed(3)}</strong></div>
        </div>
        <p className="muted-note" style={{ padding: "0 20px 18px" }}>
          The model is literature-derived and was not fitted to these records. A gap between predicted and observed shows why the estimate
          is shown only to clinicians for couples, always with its interval, and why real-world calibration is the first pilot measure.
        </p>
      </article>
    </section>
  );
}

function SimStat({ label, p, note, emphasis = false }: { label: string; p: Proportion; note: string; emphasis?: boolean }) {
  return (
    <div className={`sim-stat ${emphasis ? "emphasis" : ""}`}>
      <span>{label}</span>
      <strong>{pc(p.rate, 1)}</strong>
      <small>{p.low === null ? "–" : `95% CI ${pc(p.low, 1)}–${pc(p.high, 1)}`} · {p.numerator}/{p.denominator}</small>
      <small>{note}</small>
    </div>
  );
}
