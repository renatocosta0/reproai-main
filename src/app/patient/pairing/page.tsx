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
import { useLocale } from "@/components/i18n/LocaleContext";


const S = {
  en: {
    loadError: "Could not load your pairing status.",
    inviteError: "Could not create the invitation.",
    linkedNotice: "You're now linked. Joint estimates are available on your assessment page.",
    acceptError: "Could not accept the invitation.",
    removedNotice: "The link has been removed. Your own records are unchanged and private to you.",
    removeError: "Could not remove the link.",
    yourPartner: "your partner",
    eyebrow: "COUPLE LINK",
    linkedWith: (n: string) => `Linked with ${n}`,
    linkTitle: "Link with your partner",
    subtitle: "Linking is optional and always your choice. Each of you keeps your own private record; linking adds a joint view for planning a pregnancy together.",
    female: "Female", male: "Male",
    years: (n: number) => `${n} years`,
    linked: "Linked",
    sharedTitle: "Shared while linked",
    sharedText: "Joint assessments you run together, and each other's name and age.",
    privateTitle: "Always private to you",
    privateText: "Your own observations, lab values and individual assessments.",
    removeLink: "Remove link",
    inviteTitle: "Invite your partner",
    inviteSub: "Creates a secure link that expires in 7 days",
    partnerEmail: "Partner's email",
    creating: "Creating link…",
    createLink: "Create invitation link",
    shareWith1: "Share this link with ",
    shareWith2: ". They'll sign in (or activate an account) to accept it.",
    haveInvite: "Have an invitation?",
    acceptSub: (hasInvites: boolean) => `Accept one sent to ${hasInvites ? "you" : "your email"}, or paste a code`,
    expires: (d: string) => `Expires ${d}`,
    accept: "Accept",
    code: "Invitation code",
    codeHint: "The code at the end of the link, after token=",
    linking: "Linking…",
    acceptInvite: "Accept invitation",
    pendingTitle: "Pending invitations",
    pendingSub: "Waiting for your partner to accept",
    modalTitle: "Remove couple link",
    modalQ: (n: string) => `Remove the link with ${n}?`,
    modalText: "You can do this at any time, and you can link again later.",
    modalNote: "Nothing is deleted. Your observations, lab values and individual assessments stay intact and private to you. Joint assessments stay with the shared record.",
    keep: "Keep link",
    removing: "Removing…"
  },
  ar: {
    loadError: "تعذّر تحميل حالة الارتباط.",
    inviteError: "تعذّر إنشاء الدعوة.",
    linkedNotice: "أصبحتما مرتبطين. التقديرات المشتركة متاحة في صفحة التقييم.",
    acceptError: "تعذّر قبول الدعوة.",
    removedNotice: "أُلغي الارتباط. سجلاتك لم تتغير وتبقى خاصة بك.",
    removeError: "تعذّر إلغاء الارتباط.",
    yourPartner: "شريكك",
    eyebrow: "ربط الزوجين",
    linkedWith: (n: string) => `مرتبط مع ${n}`,
    linkTitle: "الارتباط بشريكك",
    subtitle: "الارتباط اختياري ويعود إليك دائمًا. يحتفظ كل منكما بسجله الخاص، ويضيف الارتباط عرضًا مشتركًا للتخطيط للحمل معًا.",
    female: "أنثى", male: "ذكر",
    years: (n: number) => `${n} سنة`,
    linked: "مرتبط",
    sharedTitle: "ما تتشاركانه أثناء الارتباط",
    sharedText: "التقييمات المشتركة التي تجريانها معًا، واسم كل منكما وعمره.",
    privateTitle: "يبقى خاصًا بك دائمًا",
    privateText: "ملاحظاتك وقيم مختبرك وتقييماتك الفردية.",
    removeLink: "إلغاء الارتباط",
    inviteTitle: "ادعُ شريكك",
    inviteSub: "يُنشئ رابطًا آمنًا تنتهي صلاحيته بعد ٧ أيام",
    partnerEmail: "البريد الإلكتروني للشريك",
    creating: "جارٍ إنشاء الرابط…",
    createLink: "إنشاء رابط دعوة",
    shareWith1: "شارك هذا الرابط مع ",
    shareWith2: ". سيسجّل الدخول (أو يفعّل حسابًا) لقبوله.",
    haveInvite: "لديك دعوة؟",
    acceptSub: (hasInvites: boolean) => (hasInvites ? "اقبل دعوة أُرسلت إليك، أو ألصق رمزًا" : "اقبل دعوة أُرسلت إلى بريدك، أو ألصق رمزًا"),
    expires: (d: string) => `تنتهي في ${d}`,
    accept: "قبول",
    code: "رمز الدعوة",
    codeHint: "الرمز الموجود في نهاية الرابط بعد token=",
    linking: "جارٍ الربط…",
    acceptInvite: "قبول الدعوة",
    pendingTitle: "دعوات معلّقة",
    pendingSub: "بانتظار قبول شريكك",
    modalTitle: "إلغاء ربط الزوجين",
    modalQ: (n: string) => `إلغاء الارتباط مع ${n}؟`,
    modalText: "يمكنك فعل ذلك في أي وقت، ويمكنكما الارتباط مجددًا لاحقًا.",
    modalNote: "لا يُحذف أي شيء. تبقى ملاحظاتك وقيم مختبرك وتقييماتك الفردية كما هي وخاصة بك. وتبقى التقييمات المشتركة في السجل المشترك.",
    keep: "الإبقاء على الارتباط",
    removing: "جارٍ الإلغاء…"
  }
};
const LOAD_FAILED = "__load_failed__";

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
  const { locale } = useLocale();
  const ar = locale === "ar";
  const L = S[locale];
  const dateL = (d: string | Date) => (ar ? new Date(d).toLocaleDateString("ar-AE-u-nu-latn", { day: "numeric", month: "short" }) : shortDate(d));

  const load = useCallback(async () => {
    try {
      setStatus(await api<PairingStatus>("/api/pairing/status"));
      setLoadError("");
    } catch (err) {
      setLoadError(userMessage(err, LOAD_FAILED));
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
      setError(userMessage(err, L.inviteError));
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
      setNotice(L.linkedNotice);
      await Promise.all([load(), refreshProfile()]);
    } catch (err) {
      setError(userMessage(err, L.acceptError));
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
      setNotice(L.removedNotice);
      await Promise.all([load(), refreshProfile()]);
    } catch (err) {
      setError(userMessage(err, L.removeError));
      setConfirmRevoke(false);
    } finally {
      setBusy(null);
    }
  }

  if (!status) {
    return (
      <div className="content patient-content">
        {loadError ? <FormError>{loadError === LOAD_FAILED ? L.loadError : loadError}</FormError> : <div className="loading-block" style={{ margin: 0 }} />}
      </div>
    );
  }

  const partner = status.partner;
  const partnerLabel = firstName(partner?.name) ?? partner?.email ?? L.yourPartner;

  return (
    <div className="content patient-content">
      <div className="page-heading">
        <div>
          <p className="date-label">{L.eyebrow}</p>
          <h1>{status.isPaired ? L.linkedWith(partnerLabel) : L.linkTitle}</h1>
          <span>{L.subtitle}</span>
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
                {partner.sex ? ` · ${partner.sex === "female" ? L.female : L.male}` : ""}
                {partner.age ? ` · ${L.years(partner.age)}` : ""}
              </small>
            </div>
            <span className="mode-badge paired"><HeartHandshake size={15} /> {L.linked}</span>
          </div>
          <div className="pairing-shared">
            <div>
              <strong>{L.sharedTitle}</strong>
              <p>{L.sharedText}</p>
            </div>
            <div>
              <strong>{L.privateTitle}</strong>
              <p>{L.privateText}</p>
            </div>
          </div>
          <div className="pairing-actions">
            <button className="secondary danger" onClick={() => setConfirmRevoke(true)}>
              <Link2Off size={16} /> {L.removeLink}
            </button>
          </div>
        </section>
      ) : (
        <section className="factor-columns">
          <article className="panel" style={{ padding: "4px 20px 22px" }}>
            <div className="panel-head" style={{ paddingLeft: 0 }}>
              <div>
                <h2>{L.inviteTitle}</h2>
                <p>{L.inviteSub}</p>
              </div>
            </div>
            <form onSubmit={invite} style={{ display: "grid", gap: 14 }}>
              <Field label={L.partnerEmail} name="partnerEmail" type="email" icon={Mail} required value={email} onChange={(e) => setEmail(e.target.value)} />
              <button className="primary" disabled={busy === "invite"}>
                <Send size={16} /> {busy === "invite" ? L.creating : L.createLink}
              </button>
            </form>
            {newLink && (
              <div className="new-link">
                <p>
                  {L.shareWith1}<strong>{newLink.email}</strong>{L.shareWith2}
                </p>
                <CopyLink path={newLink.path} />
              </div>
            )}
          </article>

          <article className="panel" style={{ padding: "4px 20px 22px" }}>
            <div className="panel-head" style={{ paddingLeft: 0 }}>
              <div>
                <h2>{L.haveInvite}</h2>
                <p>{L.acceptSub(status.receivedInvites.length > 0)}</p>
              </div>
            </div>
            {status.receivedInvites.length > 0 && (
              <div className="invite-list">
                {status.receivedInvites.map((inv) => (
                  <div key={inv.id}>
                    <UserRound size={17} />
                    <span>
                      <strong>{inv.senderName ?? inv.senderEmail}</strong>
                      <small>{L.expires(dateL(inv.expiresAt))}</small>
                    </span>
                    <button className="primary compact" onClick={() => accept(inv.token)} disabled={busy === "accept"}>
                      {L.accept}
                    </button>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={(e) => { e.preventDefault(); void accept(token); }} style={{ display: "grid", gap: 14 }}>
              <Field label={L.code} name="token" icon={KeyRound} value={token} onChange={(e) => setToken(e.target.value)} hint={L.codeHint} required />
              <button className="secondary" disabled={busy === "accept" || !token.trim()}>
                {busy === "accept" ? L.linking : L.acceptInvite}
              </button>
            </form>
          </article>
        </section>
      )}

      {!status.isPaired && status.sentInvites.length > 0 && (
        <section className="panel" style={{ marginTop: 16 }}>
          <div className="panel-head">
            <div>
              <h2>{L.pendingTitle}</h2>
              <p>{L.pendingSub}</p>
            </div>
          </div>
          <div className="invite-list" style={{ padding: "0 20px 16px" }}>
            {status.sentInvites.map((inv) => (
              <div key={inv.id} className="sent">
                <Mail size={17} />
                <span>
                  <strong>{inv.recipientEmail}</strong>
                  <small>{L.expires(dateL(inv.expiresAt))}</small>
                </span>
                <CopyLink path={`/pair?token=${inv.token}`} />
              </div>
            ))}
          </div>
        </section>
      )}

      {confirmRevoke && (
        <Modal title={L.modalTitle} onClose={() => setConfirmRevoke(false)}>
          <div className="modal-icon"><Link2Off size={21} /></div>
          <h2>{L.modalQ(partnerLabel)}</h2>
          <p>{L.modalText}</p>
          <div className="privacy-callout" style={{ marginTop: 18 }}>
            <ShieldCheck size={16} />
            <span>{L.modalNote}</span>
          </div>
          <div className="modal-actions" style={{ marginTop: 20 }}>
            <button className="secondary" onClick={() => setConfirmRevoke(false)}>{L.keep}</button>
            <button className="primary danger" onClick={revoke} disabled={busy === "revoke"}>
              {busy === "revoke" ? L.removing : L.removeLink}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
