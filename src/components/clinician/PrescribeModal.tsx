"use client";

import { FormEvent, useState } from "react";
import { Check, HeartHandshake, Mail, NotebookPen, UserPlus, UserRound } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Field } from "@/components/ui/Field";
import { FormError } from "@/components/ui/Notice";
import { CopyLink } from "@/components/ui/CopyLink";
import { useClinician } from "@/components/clinician/ClinicianContext";
import { api, userMessage } from "@/lib/api-client";
import type { InviteResponse } from "@/types/clinician";

type Scope = "INDIVIDUAL" | "COUPLE";

/** Clinician prescription: creates a single-use activation link for an individual or a couple. */
export function PrescribeModal({ onClose }: { onClose: () => void }) {
  const { bump } = useClinician();
  const [scope, setScope] = useState<Scope>("INDIVIDUAL");
  const [email, setEmail] = useState("");
  const [partnerEmail, setPartnerEmail] = useState("");
  const [name, setName] = useState("");
  const [sex, setSex] = useState<"female" | "male" | "">("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<InviteResponse | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!sex) return setError("Select the biological sex of the primary patient.");
    if (scope === "COUPLE" && email.trim().toLowerCase() === partnerEmail.trim().toLowerCase()) {
      return setError("The two partners need different email addresses.");
    }
    setBusy(true);
    try {
      const res = await api<InviteResponse>("/api/clinician/invite", {
        method: "POST",
        body: JSON.stringify({
          scope,
          email: email.trim(),
          partnerEmail: scope === "COUPLE" ? partnerEmail.trim() : undefined,
          name: name.trim() || undefined,
          sex,
          notes: notes.trim() || undefined
        })
      });
      setResult(res);
      bump();
    } catch (err) {
      setError(userMessage(err, "The prescription could not be created."));
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <Modal title="Prescription created" onClose={onClose}>
        <div className="success-state">
          <div><Check size={26} /></div>
          <h2>Activation link ready</h2>
          <p>
            Share this link securely with{" "}
            {result.partnerEmail ? `${result.recipientEmail} and ${result.partnerEmail}` : result.recipientEmail}.
            {result.partnerEmail ? " Both partners use the same link with their own email." : ""} It works only for the
            invited email{result.partnerEmail ? "s" : ""}.
          </p>
          <div style={{ width: "100%", marginTop: 6 }}>
            <CopyLink path={result.inviteUrl} />
          </div>
          <p style={{ fontSize: 12 }}>ReproAI does not send this email automatically yet.</p>
          <button className="primary" onClick={onClose}>Done</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Prescribe digital care" onClose={onClose}>
      <div className="modal-icon"><UserPlus size={21} /></div>
      <h2>Prescribe ReproAI</h2>
      <p>Give a patient or couple access to clinician-guided reproductive health tracking.</p>
      <form onSubmit={submit}>
        <div className="role-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={scope === "INDIVIDUAL"} className={scope === "INDIVIDUAL" ? "active" : ""} onClick={() => setScope("INDIVIDUAL")}>
            <UserRound size={16} /> Individual
          </button>
          <button type="button" role="tab" aria-selected={scope === "COUPLE"} className={scope === "COUPLE" ? "active" : ""} onClick={() => setScope("COUPLE")}>
            <HeartHandshake size={16} /> Couple
          </button>
        </div>
        <Field label={scope === "COUPLE" ? "Primary patient's email" : "Patient's email"} name="email" type="email" icon={Mail} required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field label={scope === "COUPLE" ? "Primary patient's name (optional)" : "Name (optional)"} name="name" icon={UserRound} value={name} onChange={(e) => setName(e.target.value)} />
        <div className="field">
          <span>{scope === "COUPLE" ? "Primary patient's biological sex" : "Biological sex"}</span>
          <div className="sex-options" role="radiogroup">
            {(["female", "male"] as const).map((s) => (
              <button key={s} type="button" role="radio" aria-checked={sex === s} className={sex === s ? "active" : ""} onClick={() => setSex(s)}>
                {s === "female" ? "Female" : "Male"}
              </button>
            ))}
          </div>
        </div>
        {scope === "COUPLE" && (
          <Field label="Partner's email" name="partnerEmail" type="email" icon={Mail} required value={partnerEmail} onChange={(e) => setPartnerEmail(e.target.value)} />
        )}
        <label className="field">
          <span>
            <NotebookPen size={13} style={{ display: "inline", verticalAlign: "-2px" }} /> Clinical notes <em>visible to clinicians only</em>
          </span>
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. PCOS follow-up, consider AMH in 6 months" />
        </label>
        {error && <FormError>{error}</FormError>}
        <button className="primary wide" disabled={busy}>
          {busy ? "Creating…" : "Create activation link"}
        </button>
      </form>
    </Modal>
  );
}
