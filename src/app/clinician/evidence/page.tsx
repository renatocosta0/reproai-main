"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, FileText, FlaskConical, Info, ListChecks } from "lucide-react";
import { FormError } from "@/components/ui/Notice";
import { api, userMessage } from "@/lib/api-client";
import type { LiveMetrics, Proportion, SimulationReport } from "@/lib/evaluation";
import { longDateL, type ClinicianStrings } from "@/lib/i18n-clinician";
import { useClinicianText } from "@/components/clinician/useClinicianText";

interface EvidenceResponse {
  live: LiveMetrics;
  simulation: SimulationReport | { error: string };
  rag: RagEval;
  oversight?: { released: number; discarded: number; awaiting: number; reasons: Record<string, number>; unrecorded: number };
  generatedAt: string;
}

interface RagEval {
  generatedAt: string;
  corpus: { passages: number; byStatus: Record<string, number> };
  questions: { total: number; answerable: number; unanswerable: number };
  byLanguage?: {
    ar?: {
      questions: { answerable: number; unanswerable: number };
      retrieval: { hitAt4: Proportion; falseAbstention: Proportion; correctAbstention: Proportion };
      endToEnd: null | { answered: Proportion; correctAbstention: Proportion };
    };
  };
  retrieval: { hitAt4: Proportion; falseAbstention: Proportion; correctAbstention: Proportion };
  endToEnd: null | {
    provider: string | null;
    answered: Proportion;
    correctAbstention: Proportion;
    expectedSourceCited: Proportion;
    citationValidity: Proportion;
    supportedSentences: Proportion;
  };
  caveats: string[];
  misses: { q: string; kind: string; answerable: boolean; retrieved: string[]; status: string | null }[];
}

const pc = (x: number | null, d = 0) => (x === null ? "–" : `${(x * 100).toFixed(d)}%`);
const ciL = (L: ClinicianStrings) => (p: Proportion) => (p.low === null ? L.noDataYet : `${L.ci95} ${pc(p.low)}–${pc(p.high)} · ${p.numerator}/${p.denominator}`);
const daysL = (L: ClinicianStrings) => (m: { median: number | null; n: number }) =>
  m.median === null ? "–" : `${m.median < 1 ? (m.median * 24).toFixed(1) + " " + L.hours : m.median.toFixed(1) + " " + L.days}`;

export default function EvidencePage() {
  const [data, setData] = useState<EvidenceResponse | null>(null);
  const [error, setError] = useState("");
  const { L } = useClinicianText();
  const ci = ciL(L);
  const days = daysL(L);

  useEffect(() => {
    api<EvidenceResponse>("/api/clinician/evidence")
      .then(setData)
      .catch((err) => setError(userMessage(err, L.loadEvidenceError)));
  }, [L]);

  return (
    <div className="content">
      <div className="page-heading">
        <div>
          <p className="date-label">{L.evidenceEyebrow}</p>
          <h1>{L.evidenceTitle}</h1>
          <span>{L.evidenceSubtitle}</span>
        </div>
        <div className="heading-actions">
          <Link className="secondary" href="/model-card">
            <FileText size={16} /> {L.modelCardLink}
          </Link>
        </div>
      </div>

      <div className="clinical-note" style={{ marginBottom: 16 }}>
        <Info size={20} />
        <span>
          <strong>{L.howToRead}</strong>
          {L.howToReadText}
        </span>
      </div>

      {error && <FormError>{error}</FormError>}
      {!data && !error && <div className="loading-block" style={{ margin: 0, height: 300 }} />}

      {data && (
        <>
          <h2 className="section-title">{L.liveTitle}</h2>
          <section className="metrics-grid">
            <Metric label={L.evPeople} value={String(data.live.people)} detail={L.evPeopleDetail(pc(data.live.intakeCompletion.rate), ci(data.live.intakeCompletion))} />
            <Metric label={L.evBaseline} value={pc(data.live.baselineCoverage.rate)} detail={L.evBaselineDetail(ci(data.live.baselineCoverage))} />
            <Metric label={L.evSignalAppt} value={days(data.live.daysSignalToAppointment)} detail={L.evSignalApptDetail(data.live.daysSignalToAppointment.n, data.live.signals)} />
            <Metric label={L.evSignalClosed} value={days(data.live.daysSignalToClosed)} detail={L.evSignalClosedDetail(data.live.daysSignalToClosed.n)} />
          </section>
          <section className="metrics-grid">
            <Metric label={L.evActedOn} value={pc(data.live.signalsProgressed.rate)} detail={L.evActedOnDetail(ci(data.live.signalsProgressed))} />
            <Metric label={L.evFlagged} value={String(data.live.flaggedForReferral)} detail={L.evFlaggedDetail} />
            <Metric label={L.evReferral} value={pc(data.live.referralActedOn.rate)} detail={L.evReferralDetail(ci(data.live.referralActedOn))} />
            <Metric label={L.evRelease} value={days(data.live.daysAssessmentToRelease)} detail={L.evReleaseDetail(data.live.daysAssessmentToRelease.n)} />
          </section>

          {data.oversight && (
            <section className="panel" style={{ marginBottom: 16 }}>
              <div className="panel-head">
                <div>
                  <h2>{L.oversightTitle}</h2>
                  <p>{L.oversightText}</p>
                </div>
              </div>
              <div className="oversight-body">
                <div className="oversight-counts">
                  <div><strong>{data.oversight.released}</strong><span>{L.ovReleased}</span></div>
                  <div><strong>{data.oversight.discarded}</strong><span>{L.ovDiscarded}</span></div>
                  <div><strong>{data.oversight.awaiting}</strong><span>{L.ovAwaiting}</span></div>
                </div>
                <div>
                  <h3 className="mini-title">{L.ovReasons}</h3>
                  {data.oversight.discarded === 0 ? (
                    <p className="muted-note">{L.ovNoDiscards}</p>
                  ) : (
                    <ul className="oversight-reasons">
                      {Object.entries(data.oversight.reasons).filter(([, n]) => n > 0).map(([r, n]) => (
                        <li key={r}><span>{L.discardReasons[r] ?? r}</span><strong>{n}</strong></li>
                      ))}
                      {data.oversight.unrecorded > 0 && <li className="muted-note">{L.ovUnrecorded(data.oversight.unrecorded)}</li>}
                    </ul>
                  )}
                </div>
              </div>
            </section>
          )}

          <section className="panel" style={{ marginBottom: 16 }}>
            <div className="panel-head">
              <div>
                <h2>{L.equitableTitle}</h2>
                <p>{L.equitableText}</p>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>{L.thGroup}</th><th>{L.thPeople}</th><th>{L.thWithBaseline}</th><th>{L.thFlagged}</th><th>{L.thReferralActed}</th></tr>
                </thead>
                <tbody>
                  {data.live.byGroup.map((g) => (
                    <tr key={g.group}>
                      <td>{L.groupLabel(g.group)}</td>
                      <td>{g.people}</td>
                      <td>{pc(g.baseline.rate)} <small className="muted-note">({g.baseline.numerator}/{g.baseline.denominator})</small></td>
                      <td>{g.flagged}</td>
                      <td>{g.actedOn.denominator ? `${pc(g.actedOn.rate)} (${g.actedOn.numerator}/${g.actedOn.denominator})` : "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted-note" style={{ padding: "10px 20px 16px" }}>{L.smallSubgroups}</p>
          </section>

          <h2 className="section-title">
            {L.simTitle} <span className="chip evidence"><FlaskConical size={12} /> {L.synthetic}</span>
          </h2>
          {"error" in data.simulation ? (
            <FormError>{L.simNeedsMl} <span dir="ltr">{data.simulation.error}</span></FormError>
          ) : (
            <Simulation s={data.simulation} />
          )}

          <h2 className="section-title" style={{ marginTop: 24 }}>
            {L.ragTitle} <span className="chip evidence"><BookOpen size={12} /> {L.offlineSet}</span>
          </h2>
          <RagSection r={data.rag} />

          <section className="panel" style={{ marginTop: 16 }}>
            <div className="panel-head">
              <div>
                <h2><ListChecks size={17} style={{ display: "inline", verticalAlign: "-3px" }} /> {L.pilotTitle}</h2>
                <p>{L.pilotSubtitle}</p>
              </div>
            </div>
            <ul className="plain-list">
              {L.pilotItems.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

function RagSection({ r }: { r: RagEval }) {
  const { L, locale } = useClinicianText();
  const ci = ciL(L);
  const e = r.endToEnd;
  const status = Object.entries(r.corpus.byStatus).map(([k, v]) => L.corpusStatus(v, k)).join(locale === "ar" ? "، " : ", ");
  return (
    <>
      <p className="muted-note" style={{ margin: "0 0 12px" }}>
        {L.ragIntro(
          r.questions.total,
          r.questions.answerable,
          r.questions.unanswerable,
          r.corpus.passages,
          status,
          longDateL(locale, r.generatedAt, { day: "numeric", month: "short", year: "numeric" }),
          e?.provider ?? null
        )}
      </p>
      <section className="metrics-grid">
        <Metric label={L.rgRetrieved} value={pc(r.retrieval.hitAt4.rate)} detail={L.rgRetrievedDetail(ci(r.retrieval.hitAt4))} />
        <Metric label={L.rgRefused} value={pc((e?.correctAbstention ?? r.retrieval.correctAbstention).rate)} detail={L.rgRefusedDetail(Boolean(e), ci(e?.correctAbstention ?? r.retrieval.correctAbstention))} />
        <Metric label={L.rgCitations} value={e ? pc(e.citationValidity.rate) : "–"} detail={e ? L.rgCitationsDetail(ci(e.citationValidity)) : L.rgRunEval} />
        <Metric label={L.rgSupported} value={e ? pc(e.supportedSentences.rate) : "–"} detail={e ? L.rgSupportedDetail(ci(e.supportedSentences)) : L.rgNeedsE2e} />
      </section>
      {e && (
        <section className="metrics-grid">
          <Metric label={L.rgAnswered} value={pc(e.answered.rate)} detail={L.rgAnsweredDetail(ci(e.answered))} />
          <Metric label={L.rgExpected} value={pc(e.expectedSourceCited.rate)} detail={L.rgExpectedDetail(ci(e.expectedSourceCited))} />
          <Metric label={L.rgWrongRefused} value={pc(r.retrieval.falseAbstention.rate)} detail={L.rgWrongRefusedDetail(ci(r.retrieval.falseAbstention))} />
          <Metric label={L.rgUnsupported} value="0" detail={L.rgUnsupportedDetail} />
        </section>
      )}
      {r.byLanguage?.ar && (
        <section className="panel" style={{ marginBottom: 16 }}>
          <div className="panel-head">
            <div>
              <h2>{L.arTitle}</h2>
              <p>{L.arText(r.byLanguage.ar.questions.answerable + r.byLanguage.ar.questions.unanswerable)}</p>
            </div>
          </div>
          <section className="metrics-grid" style={{ padding: "0 20px 16px", marginBottom: 0 }}>
            <Metric label={L.arFound} value={pc(r.byLanguage.ar.retrieval.hitAt4.rate)} detail={ci(r.byLanguage.ar.retrieval.hitAt4)} />
            <Metric label={L.arRefusedWrongly} value={pc(r.byLanguage.ar.retrieval.falseAbstention.rate)} detail={ci(r.byLanguage.ar.retrieval.falseAbstention)} />
            <Metric
              label={L.arCorrectRefusal}
              value={pc((r.byLanguage.ar.endToEnd?.correctAbstention ?? r.byLanguage.ar.retrieval.correctAbstention).rate)}
              detail={ci(r.byLanguage.ar.endToEnd?.correctAbstention ?? r.byLanguage.ar.retrieval.correctAbstention)}
            />
          </section>
        </section>
      )}
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>{L.missesTitle}</h2>
            <p>{L.missesText}</p>
          </div>
        </div>
        {r.misses.length === 0 ? (
          <p className="muted-note" style={{ padding: "0 20px 16px" }}>{L.noMisses}</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>{L.thQuestion}</th><th>{L.thType}</th><th>{L.thShould}</th><th>{L.thHappened}</th></tr></thead>
              <tbody>
                {r.misses.map((m) => (
                  <tr key={m.q}>
                    <td dir="auto">{m.q}</td>
                    <td dir="ltr">{m.kind}</td>
                    <td>{m.answerable ? L.shouldAnswer : L.shouldRefuse}</td>
                    <td>{m.status ? (m.status === "answered" ? L.answered : L.refused) : m.retrieved.length ? L.retrievedIds(m.retrieved.join(", ")) : L.nothingRetrieved}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <ul className="plain-list" style={{ paddingTop: 0 }}>
          {r.caveats.map((c) => <li key={c}>{L.caveat(c)}</li>)}
        </ul>
      </section>
    </>
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
  const { L } = useClinicianText();
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
            <h2>{L.simRuleTitle}</h2>
            <p>{L.simRuleText(s.n, s.seed, Math.round(s.amhTestCv * 100))}</p>
          </div>
        </div>
        <div className="sim-grid">
          <SimStat label={L.falseReassurance} p={r.falseReassurance} note={L.falseReassuranceNote} emphasis />
          <SimStat label={L.sensitivity} p={r.sensitivity} note={L.referencePositive(r.referencePositive)} />
          <SimStat label={L.specificity} p={r.specificity} note={L.specificityNote} />
          <SimStat label={L.falseReferral} p={r.falseReferral} note={L.falseReferralNote} />
        </div>
        <p className="muted-note" style={{ padding: "0 20px 18px" }}>
          {L.whyItMatters}
        </p>
      </article>

      <article className="panel">
        <div className="panel-head">
          <div>
            <h2>{L.calibTitle}</h2>
            <p>{L.calibText}</p>
          </div>
        </div>
        <div style={{ padding: "0 20px" }} dir="ltr">
          <svg viewBox={`0 0 ${w} ${h}`} className="calib-svg" role="img" aria-label={L.calibAria}>
            <line x1={X(0)} y1={Y(0)} x2={X(max)} y2={Y(max)} style={{ stroke: "var(--chart-guide)" }} strokeDasharray="4 4" />
            <line x1={X(0)} y1={Y(0)} x2={X(max)} y2={Y(0)} style={{ stroke: "var(--chart-axis)" }} />
            <line x1={X(0)} y1={Y(0)} x2={X(0)} y2={Y(max)} style={{ stroke: "var(--chart-axis)" }} />
            {s.calibration.bins.map((b, i) => (
              <g key={i}>
                {b.observed.low !== null && <line x1={X(b.predictedMean)} x2={X(b.predictedMean)} y1={Y(b.observed.low)} y2={Y(b.observed.high!)} style={{ stroke: "var(--chart-band)" }} strokeWidth="2" />}
                <circle cx={X(b.predictedMean)} cy={Y(b.observed.rate ?? 0)} r="4" style={{ fill: "var(--chart-line)" }} />
              </g>
            ))}
            <text x={w / 2} y={h - 4} textAnchor="middle" fontSize="10" style={{ fill: "var(--chart-label)" }}>{L.predicted}</text>
            <text x={10} y={h / 2} textAnchor="middle" fontSize="10" style={{ fill: "var(--chart-label)" }} transform={`rotate(-90 10 ${h / 2})`}>{L.observed}</text>
          </svg>
        </div>
        <div className="sim-grid">
          <div className="sim-stat"><span>{L.meanPredicted}</span><strong>{pc(s.calibration.meanPredicted, 1)}</strong></div>
          <div className="sim-stat"><span>{L.meanObserved}</span><strong>{pc(s.calibration.meanObserved, 1)}</strong></div>
          <div className="sim-stat"><span>{L.citl}</span><strong><bdi dir="ltr">{(s.calibration.calibrationInTheLarge * 100).toFixed(1)}</bdi> {L.pts}</strong></div>
          <div className="sim-stat"><span>{L.brier}</span><strong>{s.calibration.brier.toFixed(3)}</strong></div>
        </div>
        <p className="muted-note" style={{ padding: "0 20px 18px" }}>
          {L.calibNote}
        </p>
      </article>
    </section>
  );
}

function SimStat({ label, p, note, emphasis = false }: { label: string; p: Proportion; note: string; emphasis?: boolean }) {
  const { L } = useClinicianText();
  return (
    <div className={`sim-stat ${emphasis ? "emphasis" : ""}`}>
      <span>{label}</span>
      <strong>{pc(p.rate, 1)}</strong>
      <small>{p.low === null ? "–" : `${L.ci95} ${pc(p.low, 1)}–${pc(p.high, 1)}`} · {p.numerator}/{p.denominator}</small>
      <small>{note}</small>
    </div>
  );
}
