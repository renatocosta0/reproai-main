"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, BellPlus, CloudDownload, FileJson, HeartHandshake, Lock, NotebookPen, Play, UserRound } from "lucide-react";
import { useClinician } from "@/components/clinician/ClinicianContext";
import { ReviewCard } from "@/components/clinician/ReviewCard";
import { LabEntry } from "@/components/clinician/LabEntry";
import { MarkerTrend } from "@/components/charts/MarkerTrend";
import { TemperatureChart } from "@/components/charts/TemperatureChart";
import { SleepChart } from "@/components/charts/SleepChart";
import { EstimateHistoryChart } from "@/components/charts/EstimateHistoryChart";
import { OptionsList } from "@/components/record/OptionsList";
import { SourceChip } from "@/components/record/Chips";
import { ClinicalNotice, FormError } from "@/components/ui/Notice";
import { api, userMessage } from "@/lib/api-client";
import { analyzeBbt, isSleep, isTemperature, series, shortDate, sleepStats, formatHours } from "@/lib/observation-analysis";
import { caseInitials, timeAgo } from "@/lib/format";
import { STATUS_LABELS, type FollowUpStatus } from "@/lib/follow-up";
import { HISTORY_FLAGS, LABS, type LabCode } from "@/lib/labs";
import type { CaseDetail, CaseMember } from "@/types/clinician";

interface Insufficient {
  key: string;
  missingRequired: string[];
  missingOptional: string[];
  completeness: number;
  message: string;
}

export default function CaseDetailPage({ params }: { params: { id: string } }) {
  const { bump } = useClinician();
  const [data, setData] = useState<CaseDetail | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [insufficient, setInsufficient] = useState<Insufficient | null>(null);

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

  async function runAssessment(key: string, body: Record<string, unknown>) {
    setBusy(`assess-${key}`);
    setError("");
    setInsufficient(null);
    setNotice("");
    try {
      const res = await api<{ status: string; missingRequired?: string[]; missingOptional?: string[]; completeness?: number; message?: string }>(
        `/api/clinician/cases/${params.id}/assess`,
        { method: "POST", body: JSON.stringify(body) }
      );
      if (res.status === "insufficient_data") {
        setInsufficient({ key, missingRequired: res.missingRequired ?? [], missingOptional: res.missingOptional ?? [], completeness: res.completeness ?? 0, message: res.message ?? "" });
      } else {
        setNotice("Draft assessment created. Review it below before it is released to the patient.");
        await load();
      }
    } catch (err) {
      setError(userMessage(err, "The assessment could not be run."));
    } finally {
      setBusy(null);
    }
  }

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

  const name = data.members.map((m) => m.name).filter(Boolean).join(" & ") || data.invitation?.email || "Care case";
  const drafts = data.assessments.filter((a) => a.status === "DRAFT");
  const released = data.assessments.filter((a) => a.status === "RELEASED");
  // One series per chart: joint estimates for couples, individual ones otherwise.
  const history = released.filter((a) => a.scope === (data.isCouple ? "COUPLE" : "INDIVIDUAL")).reverse();
  const openFollowUps = data.followUps.filter((f) => f.status !== "CLOSED" && f.status !== "LOST");
  const canJoint = data.members.length === 2 && data.members.every((m) => m.clinicianAccess);

  return (
    <div className="content">
      <Link href="/clinician/dashboard" className="text-button" style={{ marginBottom: 14, width: "max-content" }}>
        <ArrowLeft size={15} /> Back to cohort
      </Link>
      <div className="page-heading">
        <div className="case-heading">
          <div className="avatar peach" aria-hidden>{caseInitials(name)}</div>
          <div>
            <p className="date-label">{data.isCouple ? "COUPLE RECORD" : "INDIVIDUAL RECORD"}</p>
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
          {released.length > 0 && (
            <a className="secondary" href={`/api/reports/${data.id}`}>
              <CloudDownload size={16} /> PDF report
            </a>
          )}
          <button className="primary compact" onClick={exportFhir} disabled={busy === "fhir"}>
            <FileJson size={16} /> {busy === "fhir" ? "Exporting…" : "Export FHIR R4"}
          </button>
        </div>
      </div>

      <ol className="pipeline" aria-label="Assessment pipeline">
        {["Consent", "Verified data", "Calculate", "Explain", "Clinician review", "Release", "Follow-up"].map((s, i) => (
          <li key={s}>
            <span>{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>

      {notice && <div style={{ marginBottom: 14 }}><ClinicalNotice>{notice}</ClinicalNotice></div>}
      {error && <div style={{ marginBottom: 14 }}><FormError>{error}</FormError></div>}
      {data.invitation?.notes && (
        <div style={{ marginBottom: 16 }}>
          <ClinicalNotice icon={NotebookPen}>
            <strong>Prescription note:</strong> {data.invitation.notes}
          </ClinicalNotice>
        </div>
      )}

      {data.members.length === 0 && (
        <article className="panel empty-state" style={{ marginBottom: 16 }}>
          <strong>Waiting for activation</strong>
          The invited {data.isCouple ? "partners haven't" : "patient hasn't"} activated their account yet.
        </article>
      )}

      {data.members.map((m) => (
        <MemberSection
          key={m.userId}
          caseId={data.id}
          m={m}
          busy={busy === `assess-${m.userId}`}
          insufficient={insufficient?.key === m.userId ? insufficient : null}
          onAssess={() => runAssessment(m.userId, { userId: m.userId })}
          onChanged={load}
        />
      ))}

      {data.members.length === 2 && (
        <section className="panel joint-panel">
          <div className="panel-head">
            <div>
              <h2>Joint assessment</h2>
              <p>Uses both partners&apos; verified results. Needs both partners&apos; consent to joint assessment.</p>
            </div>
            <button className="primary compact" onClick={() => runAssessment("COUPLE", { scope: "COUPLE" })} disabled={!canJoint || busy === "assess-COUPLE"}>
              <Play size={15} /> {busy === "assess-COUPLE" ? "Running…" : "Run joint assessment"}
            </button>
          </div>
          {insufficient?.key === "COUPLE" && <InsufficientPanel i={insufficient} />}
        </section>
      )}

      {drafts.length > 0 && (
        <section style={{ marginBottom: 16 }}>
          <h2 className="section-title">Awaiting your review ({drafts.length})</h2>
          {drafts.map((a) => (
            <ReviewCard key={a.id} a={a} onChanged={() => { setNotice("Review saved."); void load(); }} />
          ))}
        </section>
      )}

      {released.length > 0 && (
        <section className="factor-columns">
          <article className="panel">
            <div className="panel-head">
              <div>
                <h2>{data.isCouple ? "Joint estimate history" : "Estimate history"}</h2>
                <p>{history.length} released · shaded band is the 95% range</p>
              </div>
            </div>
            {history.length > 0 ? (
            <div className="large-chart-wrap">
              <EstimateHistoryChart points={history.map((h) => ({ date: new Date(h.createdAt), probability: h.probability, low: h.confidenceLow, high: h.confidenceHigh }))} />
            </div>
            ) : (
              <div className="empty-state">No released {data.isCouple ? "joint" : ""} estimate yet.</div>
            )}
          </article>
          <div>{released.slice(0, 1).map((a) => <ReviewCard key={a.id} a={a} onChanged={load} />)}</div>
        </section>
      )}

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Follow-up history</h2>
            <p>Closed-loop record for this {data.isCouple ? "couple" : "patient"}</p>
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

function InsufficientPanel({ i }: { i: Insufficient }) {
  return (
    <div className="insufficient">
      <AlertCircle size={18} aria-hidden />
      <div>
        <strong>No estimate: required information is missing</strong>
        <p>{i.message}</p>
        <p>
          <b>Required:</b> {i.missingRequired.join(", ")}
          {i.missingOptional.length > 0 && <> · <b>Optional, also missing:</b> {i.missingOptional.join(", ")}</>}
        </p>
        <small>Data completeness {Math.round(i.completeness * 100)}%. Record the missing results above, then run again.</small>
      </div>
    </div>
  );
}

function MemberSection({
  caseId,
  m,
  busy,
  insufficient,
  onAssess,
  onChanged
}: {
  caseId: string;
  m: CaseMember;
  busy: boolean;
  insufficient: Insufficient | null;
  onAssess: () => void;
  onChanged: () => void;
}) {
  if (!m.clinicianAccess) {
    return (
      <section className="panel member-section restricted">
        <Lock size={18} aria-hidden />
        <div>
          <strong>{m.name ?? m.email}</strong>
          <p>This patient has not shared their record with the care team. Only their enrolment is visible. They can change this in Privacy &amp; consent.</p>
        </div>
      </section>
    );
  }
  const p = m.profile;
  const flags: string[] = p?.historyFlags ? JSON.parse(p.historyFlags) : [];
  const codes = Array.from(new Set(m.labs.map((l) => l.code))) as LabCode[];
  const temps = series(m.observations, isTemperature);
  const sleep = series(m.observations, isSleep).slice(-30);
  const ss = sleepStats(sleep);
  const bbt = analyzeBbt(temps);

  return (
    <section className="panel member-section">
      <div className="panel-head">
        <div className="person-head" style={{ margin: 0 }}>
          <span className="person-icon">{m.sex === "male" ? <UserRound size={18} /> : <HeartHandshake size={18} />}</span>
          <div>
            <strong>{m.name ?? m.email}</strong>
            <small>
              {m.sex ? (m.sex === "female" ? "Female" : "Male") : "Sex not recorded"} · {p?.age ? `${p.age} years` : "age not recorded"} · {m.email}
            </small>
          </div>
        </div>
        <button className="primary compact" onClick={onAssess} disabled={busy}>
          <Play size={15} /> {busy ? "Running…" : "Run individual assessment"}
        </button>
      </div>
      {insufficient && <div style={{ padding: "0 20px 16px" }}><InsufficientPanel i={insufficient} /></div>}

      <div className="member-grid">
        <div>
          <h4 className="mini-title">Self-reported intake <SourceChip source="SELF_REPORTED" /></h4>
          {p?.intakeCompletedAt ? (
            <dl className="intake-dl">
              <div><dt>Trying to conceive</dt><dd>{p.tryingToConceive ? `Yes, ${p.infertilityDurationMonths ?? "?"} months` : "No"}</dd></div>
              {m.sex === "female" && <div><dt>Cycle</dt><dd>{p.cycleRegularity ? p.cycleRegularity.toLowerCase() : "–"}</dd></div>}
              <div><dt>BMI</dt><dd>{p.bmi ?? "–"}</dd></div>
              <div><dt>Smoking</dt><dd>{p.smoking ? p.smoking.toLowerCase() : "–"}</dd></div>
              <div><dt>History</dt><dd>{flags.length ? flags.map((f) => HISTORY_FLAGS.find((h) => h.id === f)?.label ?? f).join(", ") : "None reported"}</dd></div>
              {m.sex === "female" && <div><dt>Family early menopause</dt><dd>{p.familyEarlyMenopause ? "Yes" : p.familyEarlyMenopause === false ? "No" : "–"}</dd></div>}
            </dl>
          ) : (
            <p className="muted-note">The patient has not completed their intake yet.</p>
          )}
        </div>
        <div>
          <h4 className="mini-title">Pathway triggers</h4>
          <OptionsList options={m.options} audience="clinician" />
        </div>
      </div>

      <div className="member-labs">
        <h4 className="mini-title">Laboratory and ultrasound results</h4>
        {codes.length === 0 ? (
          <p className="muted-note">No results recorded yet.</p>
        ) : (
          <div className="marker-grid">
            {codes.map((c) => (
              <MarkerTrend key={c} code={c} points={m.labs.filter((l) => l.code === c)} />
            ))}
          </div>
        )}
        <LabEntry caseId={caseId} userId={m.userId} sex={m.sex} onSaved={onChanged} />
        <small className="muted-note">
          Reference limits: {Object.values(LABS).filter((l) => l.sex === m.sex && l.lowerLimit !== undefined).map((l) => `${l.label} ${l.lowerLimit} ${l.unit}`).join(" · ")}.
        </small>
      </div>

      {(temps.length >= 2 || sleep.length >= 2) && (
        <div className="member-wearables">
          <h4 className="mini-title">
            Wearable signals <SourceChip source="SELF_REPORTED" />{" "}
            <small>
              {temps.length} temperature · {sleep.length} sleep
              {bbt.status === "BIPHASIC" ? ` · biphasic +${bbt.shift.toFixed(2)}°C` : bbt.status === "MONOPHASIC" ? ` · no sustained shift (max +${bbt.shift.toFixed(2)}°C)` : ""}
              {ss ? ` · sleep ${formatHours(ss.mean)} ± ${formatHours(ss.sd)}` : ""}
            </small>
          </h4>
          {temps.length >= 2 && <div className="large-chart-wrap"><TemperatureChart points={temps} analysis={bbt} large /></div>}
          {sleep.length >= 2 && ss && <div className="large-chart-wrap"><SleepChart points={sleep} stats={ss} /></div>}
        </div>
      )}
    </section>
  );
}
