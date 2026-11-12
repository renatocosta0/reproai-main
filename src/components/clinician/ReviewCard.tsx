"use client";

import { useState } from "react";
import { BadgeCheck, CheckCircle2, Trash2 } from "lucide-react";
import { ShapChart } from "@/components/charts/ShapChart";
import { Completeness, EvidenceChip, SourceChip } from "@/components/record/Chips";
import { FormError } from "@/components/ui/Notice";
import { api, userMessage } from "@/lib/api-client";
import { shortDate } from "@/lib/observation-analysis";
import { pct, tierCopy } from "@/lib/tiers";
import type { AssessmentView } from "@/types/record";

const INPUT_LABELS: Record<string, string> = {
  age: "Age",
  amh: "AMH (ng/mL)",
  antral_follicle_count: "Antral follicle count",
  sperm_count: "Sperm concentration (M/mL)",
  bmi: "BMI",
  pcos_history: "PCOS history",
  infertility_duration_months: "Months trying",
  prior_cycles: "Previous treatment cycles"
};

/** One assessment: inputs with provenance, result, factors and, for drafts, the clinician review. */
export function ReviewCard({ a, onChanged }: { a: AssessmentView; onChanged: () => void }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"RELEASE" | "DISCARD" | null>(null);
  const [error, setError] = useState("");
  const draft = a.status === "DRAFT";

  async function review(action: "RELEASE" | "DISCARD") {
    setBusy(action);
    setError("");
    try {
      await api(`/api/clinician/assessments/${a.id}`, { method: "PATCH", body: JSON.stringify({ action, note }) });
      onChanged();
    } catch (err) {
      setError(userMessage(err, "Could not save the review."));
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
            {draft ? "Draft · awaiting your review" : `Released ${a.reviewedAt ? shortDate(a.reviewedAt) : ""}`}
          </span>
          <h3>{a.scope === "COUPLE" ? "Joint assessment" : "Individual assessment"} · {shortDate(a.createdAt)}</h3>
        </div>
        <EvidenceChip text={a.evidenceStatus} />
      </header>

      <div className="review-grid">
        <section>
          <h4>1 · Recorded inputs</h4>
          <table className="inputs-table">
            <tbody>
              {Object.entries(a.inputs ?? {}).map(([k, v]) => (
                <tr key={k}>
                  <td>{INPUT_LABELS[k] ?? k}</td>
                  <td>
                    <strong>{typeof v.value === "boolean" ? (v.value ? "Yes" : "No") : v.value}</strong>
                  </td>
                  <td>
                    <SourceChip source={v.source} />
                    {v.date && <small> {shortDate(v.date)}</small>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Completeness value={a.completeness} missing={a.missingOptional} />
        </section>

        <section>
          <h4>2 · Calculated result</h4>
          <div className="result-box">
            <strong>{pct(a.probability, 1)}</strong>
            <span>
              95% range {pct(a.confidenceLow)}–{pct(a.confidenceHigh)} · {tierCopy(a.tier).label}
            </span>
            {a.percentile !== null && <span>AMH for age: about the {Math.round(a.percentile)}th percentile</span>}
            <small>{a.modelVersion}</small>
          </div>
          {a.factors && a.factors.length > 0 && <ShapChart factors={a.factors} />}
        </section>
      </div>

      {draft ? (
        <section className="review-decision">
          <h4>3 · Your decision</h4>
          <label className="field">
            <span>
              Note to the patient <em>shown with the result; plain language</em>
            </span>
            <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Your egg reserve is in the expected range for your age. We will repeat AMH in 12 months." />
          </label>
          {error && <FormError>{error}</FormError>}
          <div className="modal-actions">
            <button className="secondary" onClick={() => review("DISCARD")} disabled={busy !== null}>
              <Trash2 size={15} /> {busy === "DISCARD" ? "Discarding…" : "Discard draft"}
            </button>
            <button className="primary" onClick={() => review("RELEASE")} disabled={busy !== null || note.trim().length < 10}>
              <CheckCircle2 size={15} /> {busy === "RELEASE" ? "Releasing…" : "Approve and release to patient"}
            </button>
          </div>
        </section>
      ) : (
        a.clinicianNote && (
          <p className="review-note">
            <BadgeCheck size={15} aria-hidden /> <strong>Clinician note:</strong> {a.clinicianNote}
          </p>
        )
      )}
    </article>
  );
}
