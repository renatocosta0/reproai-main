"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BellPlus, CloudDownload, FileJson, HeartHandshake, NotebookPen, UserRound } from "lucide-react";
import { useClinician } from "@/components/clinician/ClinicianContext";
import { ShapChart } from "@/components/charts/ShapChart";
import { TemperatureChart } from "@/components/charts/TemperatureChart";
import { SleepChart } from "@/components/charts/SleepChart";
import { EstimateHistoryChart } from "@/components/charts/EstimateHistoryChart";
import { ClinicalNotice, FormError } from "@/components/ui/Notice";
import { api, userMessage } from "@/lib/api-client";
import { analyzeBbt, isSleep, isTemperature, series, shortDate, sleepStats, formatHours } from "@/lib/observation-analysis";
import { caseInitials, peopleName, timeAgo } from "@/lib/format";
import { STATUS_LABELS, type FollowUpStatus } from "@/lib/follow-up";
import { tierCopy, WHO_SPERM_LOWER_LIMIT } from "@/lib/tiers";
import type { CaseDetail } from "@/types/clinician";
import type { PatientProfile } from "@/types/patient";

export default function CaseDetailPage({ params }: { params: { id: string } }) {
  const { bump } = useClinician();
  const [data, setData] = useState<CaseDetail | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

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

  async function exportFhir() {
    setBusy("fhir");
    try {
      const res = await fetch(`/api/fhir/export?coupleId=${encodeURIComponent(params.id)}`, { credentials: "include" });
      if (!res.ok) throw new Error();
      const blob = new Blob([JSON.stringify(await res.json(), null, 2)], { type: "application/fhir+json" });
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
      await api("/api/follow-up", { method: "POST", body: JSON.stringify({ coupleId: params.id, note: "Opened by clinician from the patient record." }) });
      setNotice("Follow-up opened. It now appears on the follow-up board.");
      bump();
      await load();
    } catch (err) {
      setError(userMessage(err, "Could not open a follow-up."));
    } finally {
      setBusy(null);
    }
  }

  if (error && !data) return <div className="content"><FormError>{error}</FormError></div>;
  if (!data) return <div className="content"><div className="loading-block" style={{ margin: 0, height: 260 }} /></div>;

  const emails = data.users.map((u) => u.email);
  const name = peopleName(data.patients, emails);
  const isCouple = data.patients.length > 1 || data.invitation?.scope === "COUPLE";
  const latest = data.predictions[0] ?? null;
  const history = [...data.predictions].reverse();
  const openFollowUps = data.followUps.filter((f) => f.status !== "CLOSED" && f.status !== "LOST");
  const emailFor = (userId: string | null) => data.users.find((u) => u.id === userId)?.email ?? null;

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
          {latest && (
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

      <section className="people-grid">
        {data.patients.length === 0 && (
          <article className="panel empty-state">
            <strong>Waiting for activation</strong>
            The invited {isCouple ? "partners haven't" : "patient hasn't"} activated their account yet.
          </article>
        )}
        {data.patients.map((p) => (
          <PersonCard key={p.id} p={p} email={emailFor(p.userId)} consentAt={data.users.find((u) => u.id === p.userId)?.consentAt ?? null} />
        ))}
      </section>

      <section className="factor-columns">
        <article className="panel">
          <div className="panel-head">
            <div>
              <h2>Estimate history</h2>
              <p>{data.predictions.length} assessment{data.predictions.length === 1 ? "" : "s"} · shaded band is the 95% range</p>
            </div>
          </div>
          {history.length === 0 ? (
            <div className="empty-state">No assessments yet.</div>
          ) : (
            <>
              <div className="large-chart-wrap">
                <EstimateHistoryChart
                  points={history.map((h) => ({ date: new Date(h.createdAt), probability: h.probability, low: h.confidenceLow, high: h.confidenceHigh }))}
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
                          {h.confidenceLow != null && h.confidenceHigh != null ? ` (${Math.round(h.confidenceLow)}–${Math.round(h.confidenceHigh)})` : ""}
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
              <h2>Latest factor contributions</h2>
              <p>{latest ? `${latest.scope === "COUPLE" ? "Joint" : "Individual"} assessment, ${shortDate(latest.createdAt)} · ${latest.modelVersion ?? ""}` : "No assessment yet"}</p>
            </div>
          </div>
          {latest?.factors?.length ? <ShapChart factors={latest.factors} /> : <div className="empty-state">Factors appear after the first assessment.</div>}
          {latest?.preservationGuidance && (
            <p className="detail-guidance">{latest.preservationGuidance}</p>
          )}
        </article>
      </section>

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
                  {bbt.status === "BIPHASIC" ? ` · biphasic shift +${bbt.shift.toFixed(2)}°C` : bbt.status === "MONOPHASIC" ? ` · no sustained shift (max +${bbt.shift.toFixed(2)}°C)` : ""}
                  {ss ? ` · sleep ${formatHours(ss.mean)} ± ${formatHours(ss.sd)}` : ""}
                </p>
              </div>
            </div>
            {temps.length >= 2 && (
              <div className="large-chart-wrap"><TemperatureChart points={temps} analysis={bbt} large /></div>
            )}
            {sleep.length >= 2 && ss && (
              <div className="large-chart-wrap"><SleepChart points={sleep.slice(-30)} stats={sleepStats(sleep.slice(-30))!} /></div>
            )}
          </section>
        );
      })}

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

function PersonCard({ p, email, consentAt }: { p: PatientProfile; email: string | null; consentAt: string | null }) {
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
      p.spermCount != null ? `${p.spermCount} M/mL${p.spermCount < WHO_SPERM_LOWER_LIMIT ? " (below WHO ref.)" : ""}` : "–"
    ]);
  }
  rows.push(["Months trying", p.infertilityDurationMonths != null ? String(p.infertilityDurationMonths) : "–"]);
  rows.push(["Preservation interest", p.preservationIntent ? "Yes" : "No"]);

  return (
    <article className="panel person-card">
      <div className="person-head">
        <span className="person-icon">{p.sex === "male" ? <UserRound size={18} /> : <HeartHandshake size={18} />}</span>
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
      <small className="consent-line">{consentAt ? `Consent recorded ${shortDate(consentAt)}` : "No consent record"}</small>
    </article>
  );
}
