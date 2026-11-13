"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, BellPlus, CloudDownload, FileJson, HeartHandshake, Lock, NotebookPen, Play, Sparkles, UserRound } from "lucide-react";
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
import { analyzeBbt, isSleep, isTemperature, series, sleepStats, formatHours } from "@/lib/observation-analysis";
import { caseInitials } from "@/lib/format";
import { STATUS_LABELS, type FollowUpStatus } from "@/lib/follow-up";
import { HISTORY_FLAGS, LABS, type LabCode } from "@/lib/labs";
import type { CaseDetail, CaseMember } from "@/types/clinician";
import { LAB_AR } from "@/lib/i18n";
import { statusLabel } from "@/lib/i18n-clinician";
import { useClinicianText } from "@/components/clinician/useClinicianText";

interface Insufficient {
  key: string;
  missingRequired: string[];
  missingOptional: string[];
  completeness: number;
  message: string;
}

export default function CaseDetailPage({ params }: { params: { id: string } }) {
  const { bump } = useClinician();
  const { L, locale, ago, date } = useClinicianText();
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
      setError(userMessage(err, L.loadRecordError));
    }
  }, [params.id, L]);

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
        setNotice(L.draftCreated);
        await load();
      }
    } catch (err) {
      setError(userMessage(err, L.assessError));
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
      setError(L.fhirError);
    } finally {
      setBusy(null);
    }
  }

  async function openFollowUp() {
    setBusy("followup");
    try {
      await api("/api/follow-up", { method: "POST", body: JSON.stringify({ coupleId: params.id, note: L.followUpOpenedNote }) });
      setNotice(L.followUpOpened);
      bump();
      await load();
    } catch (err) {
      setError(userMessage(err, L.followUpError));
    } finally {
      setBusy(null);
    }
  }

  if (error && !data) return <div className="content"><FormError>{error}</FormError></div>;
  if (!data) return <div className="content"><div className="loading-block" style={{ margin: 0, height: 260 }} /></div>;

  const name = data.members.map((m) => m.name).filter(Boolean).join(" & ") || data.invitation?.email || L.careCase;
  const drafts = data.assessments.filter((a) => a.status === "DRAFT");
  const released = data.assessments.filter((a) => a.status === "RELEASED");
  // One series per chart: joint estimates for couples, individual ones otherwise.
  const history = released.filter((a) => a.scope === (data.isCouple ? "COUPLE" : "INDIVIDUAL")).reverse();
  const openFollowUps = data.followUps.filter((f) => f.status !== "CLOSED" && f.status !== "LOST");
  const canJoint = data.members.length === 2 && data.members.every((m) => m.clinicianAccess);
  const anySharing = data.members.some((m) => m.clinicianAccess);

  return (
    <div className="content">
      <Link href="/clinician/dashboard" className="text-button" style={{ marginBottom: 14, width: "max-content" }}>
        <ArrowLeft size={15} className="flip-rtl" /> {L.backToCohort}
      </Link>
      <div className="page-heading">
        <div className="case-heading">
          <div className="avatar peach" aria-hidden>{caseInitials(name)}</div>
          <div>
            <p className="date-label">{data.isCouple ? L.coupleRecord : L.individualRecord}</p>
            <h1>{name}</h1>
            <span>
              {L.inCareSince(date(data.createdAt))}
              {data.invitation ? L.prescriptionStatus(data.invitation.status) : ""}
            </span>
          </div>
        </div>
        <div className="heading-actions">
          {openFollowUps.length === 0 && (
            <button className="secondary" onClick={openFollowUp} disabled={busy === "followup"}>
              <BellPlus size={16} /> {busy === "followup" ? L.opening : L.openFollowUp}
            </button>
          )}
          {released.length > 0 && (
            <a className="secondary" href={`/api/reports/${data.id}`}>
              <CloudDownload size={16} /> {L.pdfReport}
            </a>
          )}
          {anySharing && (
            <>
              <Link className="secondary" href={`/clinician/assistant?case=${data.id}`}>
                <Sparkles size={16} /> {L.askCopilot}
              </Link>
              <button className="primary compact" onClick={exportFhir} disabled={busy === "fhir"}>
                <FileJson size={16} /> {busy === "fhir" ? L.exporting : L.exportFhir}
              </button>
            </>
          )}
        </div>
      </div>

      <CaseWorkflow data={data} />

      {notice && <div style={{ marginBottom: 14 }}><ClinicalNotice>{notice}</ClinicalNotice></div>}
      {error && <div style={{ marginBottom: 14 }}><FormError>{error}</FormError></div>}
      {data.invitation?.notes && (
        <div style={{ marginBottom: 16 }}>
          <ClinicalNotice icon={NotebookPen}>
            <strong>{L.prescriptionNote}</strong> <span dir="auto">{data.invitation.notes}</span>
          </ClinicalNotice>
        </div>
      )}

      {data.members.length === 0 && (
        <article className="panel empty-state" style={{ marginBottom: 16 }}>
          <strong>{L.waitingActivation}</strong>
          {L.notActivated(data.isCouple)}
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
              <h2>{L.jointTitle}</h2>
              <p>{L.jointText}</p>
            </div>
            <button className="primary compact" onClick={() => runAssessment("COUPLE", { scope: "COUPLE" })} disabled={!canJoint || busy === "assess-COUPLE"}>
              <Play size={15} /> {busy === "assess-COUPLE" ? L.running : L.runJoint}
            </button>
          </div>
          {insufficient?.key === "COUPLE" && <InsufficientPanel i={insufficient} />}
        </section>
      )}

      {drafts.length > 0 && (
        <section style={{ marginBottom: 16 }}>
          <h2 className="section-title">{L.awaitingReview(drafts.length)}</h2>
          {drafts.map((a) => (
            <ReviewCard key={a.id} a={a} onChanged={() => { setNotice(L.reviewSaved); void load(); }} />
          ))}
        </section>
      )}

      {released.length > 0 && (
        <section className="factor-columns">
          <article className="panel">
            <div className="panel-head">
              <div>
                <h2>{data.isCouple ? L.jointHistory : L.estimateHistory}</h2>
                <p>{L.historySubtitle(history.length)}</p>
              </div>
            </div>
            {history.length > 0 ? (
            <div className="large-chart-wrap" dir="ltr">
              <EstimateHistoryChart formatDate={date} points={history.map((h) => ({ date: new Date(h.createdAt), probability: h.probability, low: h.confidenceLow, high: h.confidenceHigh }))} />
            </div>
            ) : (
              <div className="empty-state">{L.noReleased(data.isCouple)}</div>
            )}
          </article>
          <div>{released.slice(0, 1).map((a) => <ReviewCard key={a.id} a={a} onChanged={load} />)}</div>
        </section>
      )}

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>{L.followUpHistory}</h2>
            <p>{L.closedLoopFor(data.isCouple)}</p>
          </div>
          <Link className="text-button" href="/clinician/follow-up">{L.navFollowUp}</Link>
        </div>
        {data.followUps.length === 0 ? (
          <div className="empty-state">{L.noFollowUps}</div>
        ) : (
          <div className="followup-history">
            {data.followUps.map((f) => (
              <div key={f.id}>
                <span className={`status-pill ${f.status === "ALERT_RAISED" ? "rose" : f.status === "CLOSED" ? "mint" : "amber"}`}>
                  <i />{statusLabel(locale, f.status, STATUS_LABELS[f.status as FollowUpStatus] ?? f.status)}
                </span>
                <p dir="auto">{f.note ?? L.noNote}</p>
                <small>{L.openedOn(date(f.createdAt), ago(f.updatedAt))}</small>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function InsufficientPanel({ i }: { i: Insufficient }) {
  const { L } = useClinicianText();
  return (
    <div className="insufficient">
      <AlertCircle size={18} aria-hidden />
      <div>
        <strong>{L.noEstimateMissing}</strong>
        <p>{L.insufficientMessage(i.message)}</p>
        <p>
          <b>{L.required}</b> <span dir="ltr">{i.missingRequired.join(", ")}</span>
          {i.missingOptional.length > 0 && <> · <b>{L.optionalMissing}</b> <span dir="ltr">{i.missingOptional.join(", ")}</span></>}
        </p>
        <small>{L.completenessRunAgain(Math.round(i.completeness * 100))}</small>
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
  const { L, ar, date } = useClinicianText();
  if (!m.clinicianAccess) {
    return (
      <section className="panel member-section restricted">
        <Lock size={18} aria-hidden />
        <div>
          <strong>{m.name ?? m.email}</strong>
          <p>{L.notShared}</p>
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
              {m.sex ? (m.sex === "female" ? L.female : L.male) : L.sexNotRecorded} · {p?.age ? L.ageYears(p.age) : L.ageNotRecorded} · <span dir="ltr">{m.email}</span>
            </small>
          </div>
        </div>
        <button className="primary compact" onClick={onAssess} disabled={busy}>
          <Play size={15} className="flip-rtl" /> {busy ? L.running : L.runIndividual}
        </button>
      </div>
      {insufficient && <div style={{ padding: "0 20px 16px" }}><InsufficientPanel i={insufficient} /></div>}

      <div className="member-grid">
        <div>
          <h4 className="mini-title">{L.selfReportedIntake} <SourceChip source="SELF_REPORTED" audience="clinician" /></h4>
          {p?.intakeCompletedAt ? (
            <dl className="intake-dl">
              <div><dt>{L.tryingToConceive}</dt><dd>{p.tryingToConceive ? L.yesMonths(String(p.infertilityDurationMonths ?? "?")) : L.no}</dd></div>
              {m.sex === "female" && <div><dt>{L.cycle}</dt><dd>{p.cycleRegularity ? L.cycleValue(p.cycleRegularity) : "–"}</dd></div>}
              <div><dt>{L.bmi}</dt><dd>{p.bmi ?? "–"}</dd></div>
              <div><dt>{L.smoking}</dt><dd>{p.smoking ? L.smokingValue(p.smoking) : "–"}</dd></div>
              <div><dt>{L.history}</dt><dd>{flags.length ? flags.map((f) => L.historyFlag(f, HISTORY_FLAGS.find((h) => h.id === f)?.label ?? f)).join(ar ? "، " : ", ") : L.noneReported}</dd></div>
              {m.sex === "female" && <div><dt>{L.familyMenopause}</dt><dd>{p.familyEarlyMenopause ? L.yes : p.familyEarlyMenopause === false ? L.no : "–"}</dd></div>}
            </dl>
          ) : (
            <p className="muted-note">{L.intakeNotDone}</p>
          )}
        </div>
        <div>
          <h4 className="mini-title">{L.pathwayTriggers}</h4>
          <OptionsList options={m.options} audience="clinician" />
        </div>
      </div>

      <div className="member-labs">
        <h4 className="mini-title">{L.labsTitle}</h4>
        {codes.length === 0 ? (
          <p className="muted-note">{L.noResults}</p>
        ) : (
          <div className="marker-grid">
            {codes.map((c) => (
              <MarkerTrend key={c} code={c} points={m.labs.filter((l) => l.code === c)} audience="clinician" />
            ))}
          </div>
        )}
        <LabEntry caseId={caseId} userId={m.userId} sex={m.sex} onSaved={onChanged} />
        <small className="muted-note">
          {L.referenceLimits} {Object.values(LABS).filter((l) => l.sex === m.sex && l.lowerLimit !== undefined).map((l, i) => <span key={l.code}>{i ? " · " : ""}{ar ? LAB_AR[l.code] ?? l.label : l.label} <span dir="ltr">{l.lowerLimit} {l.unit}</span></span>)}.
        </small>
      </div>

      {(temps.length >= 2 || sleep.length >= 2) && (
        <div className="member-wearables">
          <h4 className="mini-title">
            {L.wearableSignals} <SourceChip source="SELF_REPORTED" audience="clinician" />{" "}
            <small>
              {L.wearableCounts(temps.length, sleep.length)}
              {bbt.status === "BIPHASIC" ? L.biphasic(bbt.shift.toFixed(2)) : bbt.status === "MONOPHASIC" ? L.monophasic(bbt.shift.toFixed(2)) : ""}
              {ss ? L.sleepStat(formatHours(ss.mean), formatHours(ss.sd)) : ""}
            </small>
          </h4>
          {temps.length >= 2 && <div className="large-chart-wrap" dir="ltr"><TemperatureChart points={temps} analysis={bbt} large formatDate={date} riseLabel={L.temperatureRise} /></div>}
          {sleep.length >= 2 && ss && <div className="large-chart-wrap" dir="ltr"><SleepChart points={sleep} stats={ss} formatDate={date} /></div>}
        </div>
      )}
    </section>
  );
}

type StepState = "done" | "action" | "blocked" | "pending";

/** The assessment pipeline for this case, with each step's real state. */
function CaseWorkflow({ data }: { data: CaseDetail }) {
  const { L, ar } = useClinicianText();
  const members = data.members;
  const hidden = members.filter((m) => !m.clinicianAccess);
  const sharing = members.filter((m) => m.clinicianAccess);
  const labName = (c: LabCode) => (ar ? LAB_AR[c] ?? LABS[c].label : LABS[c].label);
  const missing = sharing.flatMap((m) => {
    const need: string[] = [];
    if (m.profile?.age === null || m.profile?.age === undefined) need.push(L.inputLabels.age ?? "Age");
    const code: LabCode | null = m.sex === "female" ? "AMH" : m.sex === "male" ? "SPERM_CONCENTRATION" : null;
    if (code && !m.labs.some((l) => l.code === code)) need.push(labName(code));
    return need.map((n) => (members.length > 1 ? `${n} (${m.name ?? m.email})` : n));
  });
  const assessed = data.assessments.length > 0;
  const drafts = data.assessments.filter((a) => a.status === "DRAFT").length;
  const released = data.assessments.some((a) => a.status === "RELEASED");
  const openFollowUp = data.followUps.some((f) => f.status !== "CLOSED" && f.status !== "LOST");
  const closedFollowUp = data.followUps.some((f) => f.status === "CLOSED");

  const steps: { state: StepState; detail: string }[] = [
    members.length === 0
      ? { state: "pending", detail: L.wfNoMembers }
      : hidden.length
        ? { state: "blocked", detail: hidden.map((m) => L.wfHidden(m.name ?? m.email)).join("; ") }
        : { state: "done", detail: L.wfDone },
    sharing.length === 0
      ? { state: "pending", detail: L.wfNotYet }
      : missing.length
        ? { state: "blocked", detail: L.wfMissing(missing.join(", ")) }
        : { state: "done", detail: L.wfDone },
    assessed ? { state: "done", detail: L.wfDone } : { state: missing.length || !sharing.length ? "pending" : "action", detail: L.wfNotYet },
    assessed ? { state: "done", detail: L.wfDone } : { state: "pending", detail: L.wfNotYet },
    drafts ? { state: "action", detail: L.wfAwaiting(drafts) } : released ? { state: "done", detail: L.wfDone } : { state: "pending", detail: L.wfNotYet },
    released ? { state: "done", detail: L.wfDone } : { state: "pending", detail: L.wfNotYet },
    openFollowUp ? { state: "action", detail: L.wfOpen } : closedFollowUp ? { state: "done", detail: L.wfDone } : { state: "pending", detail: L.wfOptional }
  ];
  const stateLabel: Record<StepState, string> = { done: L.wfDone, action: L.wfNeedsAction, blocked: L.wfBlocked, pending: L.wfNotYet };

  return (
    <ol className="pipeline live" aria-label={L.pipelineAria}>
      {L.pipeline.map((name, i) => {
        const st = steps[i] ?? { state: "pending" as StepState, detail: "" };
        return (
          <li key={name} className={`wf-${st.state}`} title={st.detail}>
            <span aria-hidden>{st.state === "done" ? "✓" : i + 1}</span>
            <div>
              <strong>{name}</strong>
              <small>{st.state === "done" ? stateLabel.done : st.detail}</small>
            </div>
            <em className="sr-only">{stateLabel[st.state]}</em>
          </li>
        );
      })}
    </ol>
  );
}
