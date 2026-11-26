"use client";

import { Activity, AlertCircle, CheckCircle2, HeartPulse, Info, Sparkles } from "lucide-react";
import type { CycleAnalysis } from "@/lib/cycle";
import type { CycleCopy } from "./cycle-copy";

function Pill({ tone, children }: { tone: "mint" | "amber" | "rose" | "plain"; children: React.ReactNode }) {
  return tone === "plain" ? <span className="method-chip">{children}</span> : <span className={`status-pill ${tone}`}><i />{children}</span>;
}

/** FIGO regularity, ovulation / luteal phase and premenstrual pattern. */
export function CycleInsights({ analysis, L }: { analysis: CycleAnalysis; L: CycleCopy }) {
  const { figo, ovulatory, pms } = analysis;
  const figoTone = figo.status === "NORMAL" ? "mint" : figo.status === "ATTENTION" ? (figo.findings.some((f) => f.level === "P1") ? "rose" : "amber") : "plain";
  const ovFindings = ovulatory.findings;
  return (
    <section className="cycle-insights">
      <article className="panel insight-card">
        <header>
          <h3><Activity size={16} color="var(--teal)" /> {L.insightsFigo}</h3>
          <Pill tone={figoTone}>{L.figoStatus[figo.status]}</Pill>
        </header>
        <dl>
          <dt>{L.cyclesAnalysed}</dt><dd>{figo.cyclesAnalysed}</dd>
          <dt>{L.meanLength}</dt><dd>{figo.meanLength !== null ? L.days(Math.round(figo.meanLength)) : "–"}</dd>
          <dt>{L.variation}</dt><dd>{figo.variationDays !== null ? `${L.days(figo.variationDays)} · ${L.within(figo.variationLimit)}` : "–"}</dd>
        </dl>
        {figo.findings.length > 0 && (
          <ul className="finding-list">
            {figo.findings.map((f) => (
              <li key={f.code}><AlertCircle size={14} color={f.level === "P1" ? "var(--cy-period)" : "var(--cy-late)"} />{L.findings[f.code] ?? f.detail}</li>
            ))}
          </ul>
        )}
        <p>{L.figoSource}</p>
      </article>

      <article className="panel insight-card">
        <header>
          <h3><HeartPulse size={16} color="var(--cy-ovulation)" /> {L.insightsOv}</h3>
          <Pill tone={ovFindings.some((f) => f.level === "P1") ? "rose" : ovFindings.length ? "amber" : ovulatory.confirmedCycles ? "mint" : "plain"}>
            {ovulatory.confirmedCycles ? `${ovulatory.confirmedCycles} ✓` : "–"}
          </Pill>
        </header>
        <dl>
          <dt>{L.confirmed}</dt><dd>{ovulatory.confirmedCycles}</dd>
          <dt>{L.medianLuteal}</dt><dd>{ovulatory.medianLutealDays !== null ? L.days(ovulatory.medianLutealDays) : "–"}</dd>
          <dt>{L.shortLuteal}</dt><dd>{ovulatory.shortLutealCycles}</dd>
        </dl>
        {ovFindings.length > 0 ? (
          <ul className="finding-list">
            {ovFindings.map((f) => <li key={f.code}><AlertCircle size={14} color={f.level === "P1" ? "var(--cy-period)" : "var(--cy-late)"} />{L.findings[f.code] ?? f.detail}</li>)}
          </ul>
        ) : ovulatory.confirmedCycles > 0 ? (
          <ul className="finding-list"><li><CheckCircle2 size={14} color="var(--cy-fertile)" />{L.method.BBT_CONFIRMED}</li></ul>
        ) : null}
        <p>{L.ovSource}</p>
      </article>

      <article className="panel insight-card">
        <header>
          <h3><Sparkles size={16} color="#dba56c" /> {L.insightsPms}</h3>
          <Pill tone={pms.status === "PATTERN" ? "amber" : pms.status === "NO_PATTERN" ? "mint" : "plain"}>{L.pmsStatus[pms.status]}</Pill>
        </header>
        {pms.status === "INSUFFICIENT_DATA" ? (
          <p>{L.pmsNeed}</p>
        ) : (
          <>
            <p>{L.pmsText(pms.cyclesAnalysed, pms.cyclesMatching)}</p>
            {pms.topSymptoms.length > 0 && (
              <div className="tap-row">{pms.topSymptoms.map((s) => <span key={s} className="method-chip">{L.symptomTypes[s] ?? L.moodTypes[s] ?? s}</span>)}</div>
            )}
          </>
        )}
        <p style={{ display: "flex", gap: 6, alignItems: "flex-start" }}><Info size={13} style={{ flex: "none", marginTop: 2 }} />{L.careTeam}</p>
      </article>
    </section>
  );
}
