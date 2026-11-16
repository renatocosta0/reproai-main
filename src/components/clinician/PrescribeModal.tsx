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
import { useClinicianText } from "@/components/clinician/useClinicianText";

type Scope = "INDIVIDUAL" | "COUPLE";

/** Clinician prescription: creates a single-use activation link for an individual or a couple, and emails it when email is configured. */
export function PrescribeModal({ onClose }: { onClose: () => void }) {
  const { bump } = useClinician();
  const { L } = useClinicianText();
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
    if (!sex) return setError(L.selectSex);
    if (scope === "COUPLE" && email.trim().toLowerCase() === partnerEmail.trim().toLowerCase()) {
      return setError(L.differentEmails);
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
      setError(userMessage(err, L.prescribeError));
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <Modal title={L.prescriptionCreated} onClose={onClose}>
        <div className="success-state">
          <div><Check size={26} /></div>
          <h2>{L.linkReady}</h2>
          <p>
            {L.shareWith(result.partnerEmail ? `${result.recipientEmail} ${L.and} ${result.partnerEmail}` : result.recipientEmail)}
            {result.partnerEmail ? L.bothPartners : ""}
            {L.worksOnlyFor(Boolean(result.partnerEmail))}
          </p>
          <div style={{ width: "100%", marginTop: 6 }}>
            <CopyLink path={result.inviteUrl} />
          </div>
          {result.emailDelivery?.configured ? (
            <>
              {result.emailDelivery.sent.length > 0 && <p style={{ fontSize: 12 }}>{L.emailSent(result.emailDelivery.sent.join(` ${L.and} `))}</p>}
              {result.emailDelivery.failed.length > 0 && <FormError>{L.emailFailed(result.emailDelivery.failed.join(` ${L.and} `))}</FormError>}
            </>
          ) : (
            <p style={{ fontSize: 12 }}>{L.noAutoEmail}</p>
          )}
          <button className="primary" onClick={onClose}>{L.done}</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={L.prescribe} onClose={onClose}>
      <div className="modal-icon"><UserPlus size={21} /></div>
      <h2>{L.prescribeTitle}</h2>
      <p>{L.prescribeText}</p>
      <form onSubmit={submit}>
        <div className="role-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={scope === "INDIVIDUAL"} className={scope === "INDIVIDUAL" ? "active" : ""} onClick={() => setScope("INDIVIDUAL")}>
            <UserRound size={16} /> {L.individual}
          </button>
          <button type="button" role="tab" aria-selected={scope === "COUPLE"} className={scope === "COUPLE" ? "active" : ""} onClick={() => setScope("COUPLE")}>
            <HeartHandshake size={16} /> {L.couple}
          </button>
        </div>
        <Field label={scope === "COUPLE" ? L.primaryEmail : L.patientEmail} name="email" type="email" icon={Mail} required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field label={scope === "COUPLE" ? L.primaryName : L.nameOptional} name="name" icon={UserRound} value={name} onChange={(e) => setName(e.target.value)} />
        <div className="field">
          <span>{scope === "COUPLE" ? L.primarySex : L.biologicalSex}</span>
          <div className="sex-options" role="radiogroup">
            {(["female", "male"] as const).map((s) => (
              <button key={s} type="button" role="radio" aria-checked={sex === s} className={sex === s ? "active" : ""} onClick={() => setSex(s)}>
                {s === "female" ? L.female : L.male}
              </button>
            ))}
          </div>
        </div>
        {scope === "COUPLE" && (
          <Field label={L.partnerEmail} name="partnerEmail" type="email" icon={Mail} required value={partnerEmail} onChange={(e) => setPartnerEmail(e.target.value)} />
        )}
        <label className="field">
          <span>
            <NotebookPen size={13} style={{ display: "inline", verticalAlign: "-2px" }} /> {L.clinicalNotes} <em>{L.cliniciansOnly}</em>
          </span>
          <textarea dir={notes ? "auto" : undefined} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={L.notesPlaceholder} />
        </label>
        {error && <FormError>{error}</FormError>}
        <button className="primary wide" disabled={busy}>
          {busy ? L.creating : L.createLink}
        </button>
      </form>
    </Modal>
  );
}
