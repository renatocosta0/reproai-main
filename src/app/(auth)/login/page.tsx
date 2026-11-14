"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, HeartHandshake, Leaf, LockKeyhole, Mail, PlayCircle, ShieldCheck, Stethoscope, UserRound, type LucideIcon } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Field } from "@/components/ui/Field";
import { ClinicalNotice, FormError } from "@/components/ui/Notice";
import { api, ApiError, homeForRole, userMessage } from "@/lib/api-client";
import type { Role } from "@/types";
import { useLocale } from "@/components/i18n/LocaleContext";

type DemoPersona = "CLINICIAN" | "FEMALE" | "MALE" | "COUPLE";

const DEMO_PERSONAS: { persona: DemoPersona; label: string; detail: string; icon: LucideIcon }[] = [
  { persona: "CLINICIAN", label: "Clinician", detail: "Cohort and follow-up", icon: Stethoscope },
  { persona: "FEMALE", label: "Female patient", detail: "Ovarian reserve, BBT", icon: UserRound },
  { persona: "MALE", label: "Male patient", detail: "Semen health, sleep", icon: UserRound },
  { persona: "COUPLE", label: "Couple", detail: "Joint estimate", icon: HeartHandshake }
];


const S = {
  en: {
    personas: {
      CLINICIAN: ["Clinician", "Cohort and follow-up"],
      FEMALE: ["Female patient", "Ovarian reserve, BBT"],
      MALE: ["Male patient", "Semen health, sleep"],
      COUPLE: ["Couple", "Joint estimate"]
    } as Record<DemoPersona, [string, string]>,
    demoError: "Demo sign-in failed. Please try again.",
    badLogin: "That email and password don't match an account.",
    loginError: "Sign-in failed. Please check your connection and try again.",
    welcome: "Welcome to ReproAI",
    title: "Sign in to your workspace",
    sub: "Your care journey, securely in one place.",
    accountType: "Account type",
    patientTab: "Individual / Couple",
    clinicianTab: "Clinician",
    email: "Email address",
    password: "Password",
    signingIn: "Signing in…",
    continue: "Continue securely",
    patientNotice: "ReproAI is prescribed by licensed healthcare providers. If you are a new patient, please use the secure activation link sent to your email by your fertility clinic or partner.",
    clinicianNote: "Clinician accounts are provisioned by your organisation",
    orDemo: "Or explore the demo",
    opening: "Opening…",
    tour: "Take the guided demo (12 steps)",
    demoNote: "Demo accounts use sample data. No password needed."
  },
  ar: {
    personas: {
      CLINICIAN: ["طبيب", "المرضى والمتابعة"],
      FEMALE: ["مريضة", "مخزون المبيض، الحرارة الأساسية"],
      MALE: ["مريض", "صحة السائل المنوي، النوم"],
      COUPLE: ["زوجان", "تقدير مشترك"]
    } as Record<DemoPersona, [string, string]>,
    demoError: "تعذّر الدخول إلى العرض التوضيحي. يُرجى المحاولة مرة أخرى.",
    badLogin: "البريد الإلكتروني وكلمة المرور لا يطابقان أي حساب.",
    loginError: "تعذّر تسجيل الدخول. يُرجى التحقق من اتصالك والمحاولة مرة أخرى.",
    welcome: "مرحبًا بك في ReproAI",
    title: "سجّل الدخول إلى مساحة عملك",
    sub: "رحلة رعايتك في مكان واحد آمن.",
    accountType: "نوع الحساب",
    patientTab: "فرد / زوجان",
    clinicianTab: "طبيب",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    signingIn: "جارٍ تسجيل الدخول…",
    continue: "متابعة بأمان",
    patientNotice: "يصف ReproAI مقدّمو رعاية صحية مرخّصون. إذا كنت مريضًا جديدًا، فاستخدم رابط التفعيل الآمن الذي أرسلته عيادة الخصوبة أو شريكك إلى بريدك الإلكتروني.",
    clinicianNote: "تُنشئ مؤسستك حسابات الأطباء",
    orDemo: "أو استكشف العرض التوضيحي",
    opening: "جارٍ الفتح…",
    tour: "ابدأ الجولة الإرشادية (١٢ خطوة)",
    demoNote: "تستخدم حسابات العرض بيانات نموذجية، ولا تحتاج إلى كلمة مرور."
  }
};

export default function LoginPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const L = S[locale];
  const [role, setRole] = useState<Role>("PATIENT");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [demoEnabled, setDemoEnabled] = useState(false);
  const [demoLoading, setDemoLoading] = useState<DemoPersona | null>(null);

  useEffect(() => {
    api<{ enabled: boolean }>("/api/auth/demo")
      .then((r) => setDemoEnabled(r.enabled))
      .catch(() => setDemoEnabled(false));
  }, []);

  // The landing page links to /login#demo; the demo section renders only after
  // the check above, so scroll to it once it exists.
  useEffect(() => {
    if (demoEnabled && window.location.hash === "#demo") {
      document.getElementById("demo")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [demoEnabled]);

  async function demoLogin(persona: DemoPersona) {
    setDemoLoading(persona);
    setError("");
    try {
      const result = await api<{ ok: true; role: Role }>("/api/auth/demo", {
        method: "POST",
        body: JSON.stringify({ persona })
      });
      router.replace(homeForRole(result.role));
      router.refresh();
    } catch (err) {
      setError(userMessage(err, L.demoError));
      setDemoLoading(null);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await api<{ ok: true; role: Role }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password })
      });
      // Honour ?next= for same-site paths only (e.g. returning to a partner invite);
      // otherwise the account's real role decides where to go.
      const next = new URLSearchParams(window.location.search).get("next");
      const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
      router.replace(safeNext ?? homeForRole(result.role));
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? L.badLogin
          : userMessage(err, L.loginError)
      );
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <form className="login-card" onSubmit={submit} noValidate={false}>
        <div>
          <div className="eyebrow">
            <Leaf size={14} aria-hidden /> {L.welcome}
          </div>
          <h2>{L.title}</h2>
          <p>{L.sub}</p>
        </div>

        <div className="role-tabs" role="tablist" aria-label={L.accountType}>
          <button
            type="button"
            role="tab"
            aria-selected={role === "PATIENT"}
            className={role === "PATIENT" ? "active" : ""}
            onClick={() => setRole("PATIENT")}
          >
            <HeartHandshake size={17} aria-hidden /> {L.patientTab}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={role === "CLINICIAN"}
            className={role === "CLINICIAN" ? "active" : ""}
            onClick={() => setRole("CLINICIAN")}
          >
            <Stethoscope size={17} aria-hidden /> {L.clinicianTab}
          </button>
        </div>

        <Field
          label={L.email}
          name="email"
          type="email"
          icon={Mail}
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label={L.password}
          name="password"
          type="password"
          icon={LockKeyhole}
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <FormError>{error}</FormError>}

        <button className="primary wide" disabled={loading}>
          {loading ? L.signingIn : L.continue} <ArrowRight size={17} aria-hidden className="flip-rtl" />
        </button>

        {role === "PATIENT" ? (
          <ClinicalNotice>
            {L.patientNotice}
          </ClinicalNotice>
        ) : (
          <div className="login-note">
            <ShieldCheck size={15} aria-hidden /> {L.clinicianNote}
          </div>
        )}

        {demoEnabled && (
          <div className="demo-login" id="demo">
            <div className="demo-divider"><span>{L.orDemo}</span></div>
            <div className="demo-buttons">
              {DEMO_PERSONAS.map(({ persona, icon: Icon }) => (
                <button key={persona} type="button" className="secondary" onClick={() => demoLogin(persona)} disabled={demoLoading !== null}>
                  <Icon size={16} aria-hidden />
                  <span>
                    <strong>{demoLoading === persona ? L.opening : L.personas[persona][0]}</strong>
                    <small>{L.personas[persona][1]}</small>
                  </span>
                </button>
              ))}
            </div>
            <Link href="/tour" className="demo-tour-link">
              <PlayCircle size={15} aria-hidden /> {L.tour}
            </Link>
            <p className="demo-note">
              <PlayCircle size={13} aria-hidden /> {L.demoNote}
            </p>
          </div>
        )}
      </form>
    </AuthShell>
  );
}
