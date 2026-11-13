"use client";

import { useState } from "react";
import { BadgeCheck, CheckCircle2, Trash2 } from "lucide-react";
import { ShapChart } from "@/components/charts/ShapChart";
import { Completeness, EvidenceChip, SourceChip } from "@/components/record/Chips";
import { FormError } from "@/components/ui/Notice";
import { api, userMessage } from "@/lib/api-client";
import { pct, tierCopy } from "@/lib/tiers";
import { TIER_AR } from "@/lib/i18n";
import { useClinicianText } from "@/components/clinician/useClinicianText";
import type { AssessmentView } from "@/types/record";
import { DISCARD_REASONS, type DiscardReason } from "@/lib/review-reasons";

/** One assessment: inputs with provenance, result, factors and, for drafts, the clinician review. */
export function ReviewCard({ a, onChanged }: { a: AssessmentView; onChanged: () => void }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"RELEASE" | "DISCARD" | null>(null);
  const [error, setError] = useState("");
  const [discarding, setDiscarding] = useState(false);
  const [reason, setReason] = useState<DiscardReason | null>(null);
  const draft = a.status === "DRAFT";
  const { L, ar, date: shortDate } = useClinicianText();
  const tierLabel = ar ? TIER_AR[a.tier ?? ""]?.label ?? tierCopy(a.tier).label : tierCopy(a.tier).label;

  async function review(action: "RELEASE" | "DISCARD") {
    setBusy(action);
    setError("");
    try {
      await api(`/api/clinician/assessments/${a.id}`, { method: "PATCH", body: JSON.stringify({ action, note, reason: action === "DISCARD" ? reason : undefined }) });
      onChanged();
    } catch (err) {
      setError(userMessage(err, L.reviewError));
    } finally {
      setBusy(null);
    }
  }

  return (
    <article className={`panel review-card ${draft ? "draft" : "released"}`}>
      <header className="review-head">
        <div>
          <span className={`status-pill ${draft ? "amber" : "mint"}`}>
            <i />
            {draft ? L.draftAwaiting : L.releasedOn(a.reviewedAt ? shortDate(a.reviewedAt) : "")}
          </span>
          <h3>{a.scope === "COUPLE" ? L.jointAssessment : L.individualAssessment} · {shortDate(a.createdAt)}</h3>
        </div>
        <EvidenceChip text={a.evidenceStatus} />
      </header>

      <div className="review-grid">
        <section>
          <h4>{L.recordedInputs}</h4>
          <table className="inputs-table">
            <tbody>
              {Object.entries(a.inputs ?? {}).map(([k, v]) => (
                <tr key={k}>
                  <td>{L.inputLabels[k] ?? k}</td>
                  <td>
                    <strong>{typeof v.value === "boolean" ? (v.value ? L.yes : L.no) : v.value}</strong>
                  </td>
                  <td>
                    <SourceChip source={v.source} audience="clinician" />
                    {v.date && <small> {shortDate(v.date)}</small>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Completeness value={a.completeness} missing={a.missingOptional} />
        </section>

        <section>
          <h4>{L.calculatedResult}</h4>
          <div className="result-box">
            <strong>{pct(a.probability, 1)}</strong>
            <span>
              {L.range95(pct(a.confidenceLow), pct(a.confidenceHigh))} · {tierLabel}
            </span>
            {a.percentile !== null && <span>{L.amhPercentile(Math.round(a.percentile))}</span>}
            <small dir="ltr">{a.modelVersion}</small>
          </div>
          {a.factors && a.factors.length > 0 && <ShapChart factors={a.factors} />}
        </section>
      </div>

      {draft ? (
        <section className="review-decision">
          <h4>{L.yourDecision}</h4>
          <label className="field">
            <span>
              {L.noteToPatient} <em>{L.noteHint}</em>
            </span>
            <textarea dir={note ? "auto" : undefined} rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={L.notePlaceholder} />
          </label>
          {discarding && (
            <fieldset className="discard-reasons">
              <legend>{L.discardWhy}</legend>
              <p>{L.discardWhyHint}</p>
              {DISCARD_REASONS.map((r) => (
                <label key={r}>
                  <input type="radio" name={`discard-${a.id}`} value={r} checked={reason === r} onChange={() => setReason(r)} />
                  {L.discardReasons[r]}
                </label>
              ))}
            </fieldset>
          )}
          {error && <FormError>{error}</FormError>}
          <div className="modal-actions">
            {discarding ? (
              <>
                <button className="secondary" onClick={() => { setDiscarding(false); setReason(null); setError(""); }} disabled={busy !== null}>
                  {L.cancel}
                </button>
                <button
                  className="secondary danger"
                  onClick={() => review("DISCARD")}
                  disabled={busy !== null || !reason || (reason === "OTHER" && note.trim().length < 10)}
                >
                  <Trash2 size={15} /> {busy === "DISCARD" ? L.discarding : L.confirmDiscard}
                </button>
              </>
            ) : (
              <>
                <button className="secondary" onClick={() => setDiscarding(true)} disabled={busy !== null}>
                  <Trash2 size={15} /> {L.discardDraft}
                </button>
                <button className="primary" onClick={() => review("RELEASE")} disabled={busy !== null || note.trim().length < 10}>
                  <CheckCircle2 size={15} /> {busy === "RELEASE" ? L.releasing : L.approveRelease}
                </button>
              </>
            )}
          </div>
        </section>
      ) : (
        a.clinicianNote && (
          <p className="review-note">
            <BadgeCheck size={15} aria-hidden /> <strong>{L.clinicianNote}</strong> <span dir="auto">{a.clinicianNote}</span>
          </p>
        )
      )}
    </article>
  );
}
