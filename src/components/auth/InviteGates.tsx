"use client";

// Translated messages for the invitation gates on /register and /pair. The
// pages decide on the server which state applies (the token is checked there);
// these components only render the words in the reader's language.

import Link from "next/link";
import { ArrowLeft, ArrowRight, HeartHandshake, LogIn, MailCheck } from "lucide-react";
import { AcceptPairing } from "@/components/auth/AcceptPairing";
import { useLocale } from "@/components/i18n/LocaleContext";

const S = {
  en: {
    linkNotValid: "Link not valid",
    secureActivation: "Secure activation",
    invitationRequired: "Invitation required",
    requiredText: "ReproAI requires a clinical prescription or a partner pairing invite to activate an account. Please verify your invitation link or contact your clinic.",
    expiredText: "This link may have already been used or may have expired. Partner invitations are valid for 7 days.",
    backToSignIn: "Back to sign in",
    pairInvalidTitle: "This link isn't valid",
    pairInvalidText: "The partner invitation may have expired, been used already, or been withdrawn. Invitations last 7 days. Ask your partner to send a new one from their Couple link page.",
    goToSignIn: "Go to sign in",
    partnerInvitation: "Partner invitation",
    invitedYou: (n: string | null) => `${n ?? "Your partner"} invited you to link accounts`,
    pairText: "Linking adds a joint view for planning a pregnancy together. Your own records stay private to you, and either of you can remove the link at any time.",
    clinicianNote: "You are signed in as a clinician. Partner links are for patient accounts.",
    haveAccount: "I already have an account",
    newHere: "I'm new to ReproAI"
  },
  ar: {
    linkNotValid: "الرابط غير صالح",
    secureActivation: "تفعيل آمن",
    invitationRequired: "يلزم وجود دعوة",
    requiredText: "يتطلب ReproAI وصفة سريرية أو دعوة ارتباط من الشريك لتفعيل الحساب. يُرجى التحقق من رابط الدعوة أو التواصل مع عيادتك.",
    expiredText: "ربما استُخدم هذا الرابط من قبل أو انتهت صلاحيته. دعوات الشريك صالحة لمدة ٧ أيام.",
    backToSignIn: "العودة إلى تسجيل الدخول",
    pairInvalidTitle: "هذا الرابط غير صالح",
    pairInvalidText: "ربما انتهت صلاحية دعوة الشريك أو استُخدمت من قبل أو سُحبت. تبقى الدعوات صالحة لمدة ٧ أيام. اطلب من شريكك إرسال دعوة جديدة من صفحة ربط الزوجين.",
    goToSignIn: "الانتقال إلى تسجيل الدخول",
    partnerInvitation: "دعوة من الشريك",
    invitedYou: (n: string | null) => `دعاك ${n ?? "شريكك"} لربط الحسابين`,
    pairText: "يضيف الارتباط عرضًا مشتركًا للتخطيط للحمل معًا. تبقى سجلاتك خاصة بك، ويمكن لأي منكما إلغاء الارتباط في أي وقت.",
    clinicianNote: "أنت مسجّل الدخول بوصفك طبيبًا. روابط الشريك مخصصة لحسابات المرضى.",
    haveAccount: "لدي حساب بالفعل",
    newHere: "أنا جديد في ReproAI"
  }
};

function useText() {
  const { locale } = useLocale();
  return S[locale];
}

export function RegisterInviteGate({ hadToken }: { hadToken: boolean }) {
  const L = useText();
  return (
    <div className="gate-card">
      <div className="gate-icon">
        <MailCheck size={22} aria-hidden />
      </div>
      <div>
        <div className="eyebrow">{hadToken ? L.linkNotValid : L.secureActivation}</div>
        <h2 style={{ marginTop: 10 }}>{L.invitationRequired}</h2>
      </div>
      <p>{L.requiredText}</p>
      {hadToken && <p style={{ fontSize: 13 }}>{L.expiredText}</p>}
      <Link href="/login" className="secondary-link">
        <ArrowLeft size={16} aria-hidden className="flip-rtl" /> {L.backToSignIn}
      </Link>
    </div>
  );
}

export function PairInvalidGate() {
  const L = useText();
  return (
    <div className="gate-card">
      <div className="gate-icon"><MailCheck size={22} aria-hidden /></div>
      <h2>{L.pairInvalidTitle}</h2>
      <p>{L.pairInvalidText}</p>
      <Link href="/login" className="secondary-link">{L.goToSignIn}</Link>
    </div>
  );
}

export function PairInviteGate({
  token,
  senderName,
  role
}: {
  token: string;
  senderName: string | null;
  role: "PATIENT" | "CLINICIAN" | null;
}) {
  const L = useText();
  const nextPath = `/pair?token=${encodeURIComponent(token)}`;
  return (
    <div className="gate-card">
      <div className="gate-icon"><HeartHandshake size={22} aria-hidden /></div>
      <div>
        <div className="eyebrow">{L.partnerInvitation}</div>
        <h2 style={{ marginTop: 10 }}>{L.invitedYou(senderName)}</h2>
      </div>
      <p>{L.pairText}</p>
      {role === "PATIENT" ? (
        <AcceptPairing token={token} />
      ) : role === "CLINICIAN" ? (
        <p style={{ fontSize: 13 }}>{L.clinicianNote}</p>
      ) : (
        <>
          <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="primary wide" style={{ textDecoration: "none" }}>
            <LogIn size={17} /> {L.haveAccount}
          </Link>
          <Link href={`/register?token=${encodeURIComponent(token)}`} className="secondary-link">
            {L.newHere} <ArrowRight size={16} className="flip-rtl" />
          </Link>
        </>
      )}
    </div>
  );
}
