"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { HeartHandshake, KeyRound, Link2Off, Mail, Send, ShieldCheck, UserRound } from "lucide-react";
import { firstName, initials, usePatient } from "@/components/patient/PatientContext";
import { Field } from "@/components/ui/Field";
import { ClinicalNotice, FormError } from "@/components/ui/Notice";
import { Modal } from "@/components/ui/Modal";
import { CopyLink } from "@/components/ui/CopyLink";
import { api, userMessage } from "@/lib/api-client";
import { shortDate } from "@/lib/observation-analysis";
import type { PairingStatus } from "@/types/patient";

export default function PairingPage() {
  const { refresh: refreshProfile } = usePatient();
  const [status, setStatus] = useState<PairingStatus | null>(null);
  const [loadError, setLoadError] = useState("");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [newLink, setNewLink] = useState<{ email: string; path: string } | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      setStatus(await api<PairingStatus>("/api/pairing/status"));
      setLoadError("");
    } catch (err) {
      setLoadError(userMessage(err, "Could not load your pairing status."));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function invite(e: FormEvent) {
    e.preventDefault();
    setBusy("invite");
    setError("");
    try {
      const res = await api<{ invite: { recipientEmail: string; inviteUrl: string } }>("/api/pairing/invite", {
        method: "POST",
        body: JSON.stringify({ recipientEmail: email.trim() })
      });
      setNewLink({ email: res.invite.recipientEmail, path: res.invite.inviteUrl });
      setEmail("");
      await load();
    } catch (err) {
      setError(userMessage(err, "Could not create the invitation."));
    } finally {
      setBusy(null);
    }
  }

  async function accept(t: string) {
    setBusy("accept");
    setError("");
    try {
      await api("/api/pairing/accept", { method: "POST", body: JSON.stringify({ token: t.trim() }) });
      setToken("");
      setNotice("You're now linked. Joint estimates are available on your assessment page.");
      await Promise.all([load(), refreshProfile()]);
    } catch (err) {
      setError(userMessage(err, "Could not accept the invitation."));
    } finally {
      setBusy(null);
    }
  }

  async function revoke() {
    setBusy("revoke");
    setError("");
    try {
      await api("/api/pairing/revoke", { method: "POST", body: "{}" });
      setConfirmRevoke(false);
      setNotice("The link has been removed. Your own records are unchanged and private to you.");
      await Promise.all([load(), refreshProfile()]);
    } catch (err) {
      setError(userMessage(err, "Could not remove the link."));
      setConfirmRevoke(false);
    } finally {
      setBusy(null);
    }
  }

  if (!status) {
    return (
      <div className="content patient-content">
        {loadError ? <FormError>{loadError}</FormError> : <div className="loading-block" style={{ margin: 0 }} />}
      </div>
    );
  }

  const partner = status.partner;
  const partnerLabel = firstName(partner?.name) ?? partner?.email ?? "your partner";

  return (
    <div className="content patient-content">
      <div className="page-heading">
        <div>
          <p className="date-label">COUPLE LINK</p>
          <h1>{status.isPaired ? `Linked with ${partnerLabel}` : "Link with your partner"}</h1>
          <span>
            Linking is optional and always your choice. Each of you keeps your own private record; linking adds a
            joint view for planning a pregnancy together.
          </span>
        </div>
      </div>

      {notice && (
        <div style={{ marginBottom: 16 }}>
          <ClinicalNotice icon={ShieldCheck}>{notice}</ClinicalNotice>
        </div>
      )}
      {error && <div style={{ marginBottom: 16 }}><FormError>{error}</FormError></div>}

      {status.isPaired && partner ? (
        <section className="panel pairing-card">
          <div className="pairing-partner">
            <div className="avatar peach" aria-hidden>{initials(partner.name, partner.email[0]?.toUpperCase())}</div>
            <div>
              <strong>{partner.name ?? partner.email}</strong>
              <small>
                {partner.email}
                {partner.sex ? ` · ${partner.sex === "female" ? "Female" : "Male"}` : ""}
                {partner.age ? ` · ${partner.age} years` : ""}
              </small>
            </div>
            <span className="mode-badge paired"><HeartHandshake size={15} /> Linked</span>
          </div>
          <div className="pairing-shared">
            <div>
              <strong>Shared while linked</strong>
              <p>Joint assessments you run together, and each other&apos;s name and age.</p>
            </div>
            <div>
              <strong>Always private to you</strong>
              <p>Your own observations, lab values and individual assessments.</p>
            </div>
          </div>
          <div className="pairing-actions">
            <button className="secondary danger" onClick={() => setConfirmRevoke(true)}>
              <Link2Off size={16} /> Remove link
            </button>
          </div>
        </section>
      ) : (
        <section className="factor-columns">
          <article className="panel" style={{ padding: "4px 20px 22px" }}>
            <div className="panel-head" style={{ paddingLeft: 0 }}>
              <div>
                <h2>Invite your partner</h2>
                <p>Creates a secure link that expires in 7 days</p>
              </div>
            </div>
            <form onSubmit={invite} style={{ display: "grid", gap: 14 }}>
              <Field label="Partner's email" name="partnerEmail" type="email" icon={Mail} required value={email} onChange={(e) => setEmail(e.target.value)} />
              <button className="primary" disabled={busy === "invite"}>
                <Send size={16} /> {busy === "invite" ? "Creating link…" : "Create invitation link"}
              </button>
            </form>
            {newLink && (
              <div className="new-link">
                <p>
                  Share this link with <strong>{newLink.email}</strong>. They&apos;ll sign in (or activate an account) to
                  accept it.
                </p>
                <CopyLink path={newLink.path} />
              </div>
            )}
          </article>

          <article className="panel" style={{ padding: "4px 20px 22px" }}>
            <div className="panel-head" style={{ paddingLeft: 0 }}>
              <div>
                <h2>Have an invitation?</h2>
                <p>Accept one sent to {status.receivedInvites.length ? "you" : "your email"}, or paste a code</p>
              </div>
            </div>
            {status.receivedInvites.length > 0 && (
              <div className="invite-list">
                {status.receivedInvites.map((inv) => (
                  <div key={inv.id}>
                    <UserRound size={17} />
                    <span>
                      <strong>{inv.senderName ?? inv.senderEmail}</strong>
                      <small>Expires {shortDate(inv.expiresAt)}</small>
                    </span>
                    <button className="primary compact" onClick={() => accept(inv.token)} disabled={busy === "accept"}>
                      Accept
                    </button>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={(e) => { e.preventDefault(); void accept(token); }} style={{ display: "grid", gap: 14 }}>
              <Field label="Invitation code" name="token" icon={KeyRound} value={token} onChange={(e) => setToken(e.target.value)} hint="The code at the end of the link, after token=" required />
              <button className="secondary" disabled={busy === "accept" || !token.trim()}>
                {busy === "accept" ? "Linking…" : "Accept invitation"}
              </button>
            </form>
          </article>
        </section>
      )}

      {!status.isPaired && status.sentInvites.length > 0 && (
        <section className="panel" style={{ marginTop: 16 }}>
          <div className="panel-head">
            <div>
              <h2>Pending invitations</h2>
              <p>Waiting for your partner to accept</p>
            </div>
          </div>
          <div className="invite-list" style={{ padding: "0 20px 16px" }}>
            {status.sentInvites.map((inv) => (
              <div key={inv.id} className="sent">
                <Mail size={17} />
                <span>
                  <strong>{inv.recipientEmail}</strong>
                  <small>Expires {shortDate(inv.expiresAt)}</small>
                </span>
                <CopyLink path={`/pair?token=${inv.token}`} />
              </div>
            ))}
          </div>
        </section>
      )}

      {confirmRevoke && (
        <Modal title="Remove couple link" onClose={() => setConfirmRevoke(false)}>
          <div className="modal-icon"><Link2Off size={21} /></div>
          <h2>Remove the link with {partnerLabel}?</h2>
          <p>You can do this at any time, and you can link again later.</p>
          <div className="privacy-callout" style={{ marginTop: 18 }}>
            <ShieldCheck size={16} />
            <span>
              Nothing is deleted. Your observations, lab values and individual assessments stay intact and private to
              you. Joint assessments stay with the shared record.
            </span>
          </div>
          <div className="modal-actions" style={{ marginTop: 20 }}>
            <button className="secondary" onClick={() => setConfirmRevoke(false)}>Keep link</button>
            <button className="primary danger" onClick={revoke} disabled={busy === "revoke"}>
              {busy === "revoke" ? "Removing…" : "Remove link"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
