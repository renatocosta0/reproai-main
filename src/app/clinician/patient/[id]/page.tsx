"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, BellPlus, CalendarCheck, CalendarPlus, CalendarX, Clock, CloudDownload, FileJson, HeartHandshake, Lock, NotebookPen, Play, Sparkles, UserRound } from "lucide-react";
import { useClinician } from "@/components/clinician/ClinicianContext";
import { ReviewCard } from "@/components/clinician/ReviewCard";
import { MoreMenu } from "@/components/clinician/MoreMenu";
import { SuggestConsultationModal } from "@/components/clinician/SuggestConsultationModal";
import { ConfirmConsultationModal } from "@/components/clinician/ConfirmConsultationModal";
import { CancelAppointmentModal } from "@/components/clinician/CancelAppointmentModal";
import { OpenFollowUpModal } from "@/components/clinician/OpenFollowUpModal";
import { parseSlotFromNote } from "@/lib/appointment";
import { LabEntry } from "@/components/clinician/LabEntry";
import { CycleOverlay } from "@/components/clinician/CycleOverlay";
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
import { HISTORY_FLAGS, LABS, referenceText, type LabCode } from "@/lib/labs";
import type { CaseDetail, CaseMember } from "@/types/clinician";
import { LAB_AR } from "@/lib/i18n";
import { statusLabel } from "@/lib/i18n-clinician";
import { useClinicianText } from "@/components/clinician/useClinicianText";
import { AskChip } from "@/components/patient/AskPanel";

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
  const [suggestModalOpen, setSuggestModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [cancelModalTarget, setCancelModalTarget] = useState<string | null>(null);
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [activeMember, setActiveMember] = useState<string | null>(null);

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
        if (key !== "COUPLE") setActiveMember(key);
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

  async function syncEhr() {
    setBusy("sync-ehr");
    setError("");
    setNotice("");
    try {
      const res = await api<{ ok: boolean; imported: number; message: string }>(
        `/api/clinician/cases/${params.id}/sync-ehr`,
        { method: "POST" }
      );
      setNotice(res.message);
      await load();
    } catch (err) {
      setError(userMessage(err, "Failed to sync laboratory records from clinic EHR."));
    } finally {
      setBusy(null);
    }
  }

  async function openFollowUp() {
    setBusy("followup");
    try {
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
  const openFollowUps = data.followUps.filter((f) => f.status !== "CLOSED" && f.status !== "LOST" && f.status !== "APPOINTMENT_CANCELLED");
  const scheduledFollowUp = data.followUps.find((f) => f.status === "APPOINTMENT_SCHEDULED");
  const requestedFollowUp = data.followUps.find((f) => f.status === "CONSULTATION_REQUESTED");
  const suggestedFollowUp = data.followUps.find((f) => f.status === "APPOINTMENT_SUGGESTED");
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
          {scheduledFollowUp ? (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span className="chip mint" style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 16 }}>
                <CalendarCheck size={14} /> {L.appointmentScheduledBadge}
              </span>
              <button
                type="button"
                className="ghost compact"
                onClick={() => setCancelModalTarget(scheduledFollowUp.id)}
                style={{ fontSize: 12, color: "#dc2626", display: "inline-flex", alignItems: "center", gap: 4 }}
                title={L.cancelAppointmentBtn}
              >
                <CalendarX size={13} /> {L.cancelAppointmentBtn}
              </button>
            </div>
          ) : requestedFollowUp ? (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <button
                type="button"
                className="primary compact"
                onClick={() => setConfirmModalOpen(true)}
                disabled={busy !== null}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <CalendarCheck size={14} /> {L.confirmAppointmentBtn}
              </button>
              <button
                type="button"
                className="ghost compact"
                onClick={() => setCancelModalTarget(requestedFollowUp.id)}
                disabled={busy !== null}
                style={{ fontSize: 12, color: "#dc2626", display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                <CalendarX size={13} /> {L.cancelRequestBtn}
              </button>
            </div>
          ) : suggestedFollowUp ? (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span className="chip purple" style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 16 }}>
                <Clock size={14} /> {L.awaitingPatientBadge}
              </span>
              <button
                type="button"
                className="ghost compact"
                onClick={() => setCancelModalTarget(suggestedFollowUp.id)}
                disabled={busy !== null}
                style={{ fontSize: 12, color: "#dc2626", display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                <CalendarX size={13} /> {L.cancelSuggestionBtn}
              </button>
            </div>
          ) : (
            <button className="secondary" onClick={() => setSuggestModalOpen(true)} disabled={busy !== null}>
              <CalendarPlus size={16} /> {L.suggestConsultation}
            </button>
          )}
          {anySharing && (
            <Link className="secondary" href={`/clinician/assistant?case=${data.id}`}>
              <Sparkles size={16} /> {L.askCopilot}
            </Link>
          )}
          <MoreMenu label={busy === "sync-ehr" ? L.syncingEhr : busy === "fhir" ? L.exporting : busy === "followup" ? L.opening : L.moreActions}>
            {released.length > 0 && (
              <Link role="menuitem" href={`/clinician/patient/${data.id}/report`}>
                <CloudDownload size={15} /> {L.pdfReport}
              </Link>
            )}
            {openFollowUps.length === 0 && !scheduledFollowUp && !requestedFollowUp && !suggestedFollowUp && (
              <button type="button" role="menuitem" onClick={() => setFollowUpModalOpen(true)} disabled={busy === "followup"}>
                <BellPlus size={15} /> {L.openFollowUp}
              </button>
            )}
            {anySharing && (
              <>
                <button type="button" role="menuitem" onClick={syncEhr} disabled={busy === "sync-ehr"}>
                  <CloudDownload size={15} /> {L.syncEhr}
                </button>
                <button type="button" role="menuitem" onClick={exportFhir} disabled={busy === "fhir"}>
                  <FileJson size={15} /> {L.exportFhir}
                </button>
              </>
            )}
          </MoreMenu>
        </div>
      </div>

      <CaseWorkflow data={data} />

      {notice && <div style={{ marginBottom: 14 }}><ClinicalNotice>{notice}</ClinicalNotice></div>}
      {suggestModalOpen && (
        <SuggestConsultationModal
          caseId={params.id}
          patientName={name}
          onClose={() => setSuggestModalOpen(false)}
          onSuccess={(msg) => {
            setNotice(msg);
            bump();
            void load();
          }}
        />
      )}
      {confirmModalOpen && (requestedFollowUp || suggestedFollowUp) && (
        <ConfirmConsultationModal
          caseId={params.id}
          patientName={name}
          followUpId={(requestedFollowUp || suggestedFollowUp)!.id}
          defaultSlot={parseSlotFromNote((requestedFollowUp || suggestedFollowUp)?.note) ?? undefined}
          onClose={() => setConfirmModalOpen(false)}
          onSuccess={(msg) => {
            setNotice(msg);
            bump();
            void load();
          }}
        />
      )}
      {cancelModalTarget && (
        <CancelAppointmentModal
          caseId={params.id}
          patientName={name}
          followUpId={cancelModalTarget}
          onClose={() => setCancelModalTarget(null)}
          onSuccess={(msg) => {
            setNotice(msg);
            bump();
            void load();
          }}
        />
      )}
      {followUpModalOpen && (
        <OpenFollowUpModal
          caseId={params.id}
          patientName={name}
          onClose={() => setFollowUpModalOpen(false)}
          onSuccess={() => { void openFollowUp(); }}
        />
      )}
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

      {/* The clinician's main job on this page comes first: review and release. */}
      {drafts.length > 0 && (
        <section className="review-first">
          <div className="review-first-head">
            <h2 className="section-title">{L.needsReviewTitle} · {drafts.length}</h2>
            <p>{L.needsReviewText}</p>
          </div>
          {drafts.map((a) => (
            <ReviewCard key={a.id} a={a} onChanged={() => { setNotice(L.reviewSaved); void load(); }} />
          ))}
        </section>
      )}

      {data.members.length > 1 && (
        <div className="member-tabs" role="tablist" aria-label={L.memberTabsAria}>
          {data.members.map((m) => {
            const selected = (activeMember ?? data.members[0].userId) === m.userId;
            return (
              <button
                key={m.userId}
                type="button"
                role="tab"
                aria-selected={selected}
                className={selected ? "active" : ""}
                onClick={() => setActiveMember(m.userId)}
              >
                {m.sex === "male" ? <UserRound size={15} /> : <HeartHandshake size={15} />}
                {m.name ?? m.email}
                {!m.clinicianAccess && <small>{L.notSharedShort}</small>}
              </button>
            );
          })}
        </div>
      )}
      {data.members
        .filter((m) => data.members.length === 1 || (activeMember ?? data.members[0].userId) === m.userId)
        .map((m) => (
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


      {released.length > 0 && (
        <section className="factor-columns">
          <article className="panel">
            <div className="panel-head">
              <div>
                <h2>{data.isCouple ? L.jointHistory : L.estimateHistory}</h2>
                <p>{L.historySubtitle(history.length)}</p>
              </div>
              <AskChip topic={{ title: data.isCouple ? L.jointHistory : L.estimateHistory, caseId: data.id, context: "ReproAI estimate model Shapley 95% confidence interval", autoExplain: "How is the ReproAI estimate and 95% confidence interval calculated for this case?", questions: ["What does the 95% confidence interval reflect?", "What factors shaped this patient's latest assessment?"] }} />
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
          <h4 className="mini-title" style={{ margin: 0 }}>{L.labsTitle}</h4>
          <span style={{ fontSize: 11.5, color: "#64748b" }}>{L.labsSyncOrManualHint}</span>
        </div>
        {codes.length === 0 ? (
          <p className="muted-note">{L.noResults}</p>
        ) : (
          <div className="marker-grid">
            {codes.map((c) => (
              <MarkerTrend key={c} code={c} points={m.labs.filter((l) => l.code === c)} audience="clinician" caseId={caseId} />
            ))}
          </div>
        )}
        <LabEntry caseId={caseId} userId={m.userId} sex={m.sex} onSaved={onChanged} />
        <small className="muted-note">
          {L.referenceLimits} {Object.values(LABS).filter((l) => (l.sex === m.sex || l.sex === "any") && (l.lowerLimit !== undefined || l.upperLimit !== undefined)).map((l, i) => <span key={l.code}>{i ? " · " : ""}{ar ? LAB_AR[l.code] ?? l.label : l.label} <span dir="ltr">{referenceText(l.code)}</span></span>)}.
        </small>
      </div>

      {m.sex === "female" && <CycleOverlay caseId={caseId} userId={m.userId} />}

      {(temps.length >= 2 || sleep.length >= 2) && (
        <div className="member-wearables">
          <h4 className="mini-title">
            {L.wearableSignals} <SourceChip source="SELF_REPORTED" audience="clinician" />{" "}
            <AskChip topic={{ title: L.wearableSignals, caseId, context: "basal body temperature BBT wearable sleep fertility", autoExplain: "How should I interpret this patient's BBT pattern and sleep duration clinically?", questions: ["What does a monophasic BBT pattern suggest?", "How does sleep duration affect fertility?"] }} />{" "}
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
