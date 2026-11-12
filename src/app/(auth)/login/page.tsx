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

type DemoPersona = "CLINICIAN" | "FEMALE" | "MALE" | "COUPLE";

const DEMO_PERSONAS: { persona: DemoPersona; label: string; detail: string; icon: LucideIcon }[] = [
  { persona: "CLINICIAN", label: "Clinician", detail: "Cohort and follow-up", icon: Stethoscope },
  { persona: "FEMALE", label: "Female patient", detail: "Ovarian reserve, BBT", icon: UserRound },
  { persona: "MALE", label: "Male patient", detail: "Semen health, sleep", icon: UserRound },
  { persona: "COUPLE", label: "Couple", detail: "Joint estimate", icon: HeartHandshake }
];

export default function LoginPage() {
  const router = useRouter();
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
      setError(userMessage(err, "Demo sign-in failed. Please try again."));
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
          ? "That email and password don't match an account."
          : userMessage(err, "Sign-in failed. Please check your connection and try again.")
      );
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <form className="login-card" onSubmit={submit} noValidate={false}>
        <div>
          <div className="eyebrow">
            <Leaf size={14} aria-hidden /> Welcome to ReproAI
          </div>
          <h2>Sign in to your workspace</h2>
          <p>Your care journey, securely in one place.</p>
        </div>

        <div className="role-tabs" role="tablist" aria-label="Account type">
          <button
            type="button"
            role="tab"
            aria-selected={role === "PATIENT"}
            className={role === "PATIENT" ? "active" : ""}
            onClick={() => setRole("PATIENT")}
          >
            <HeartHandshake size={17} aria-hidden /> Individual / Couple
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={role === "CLINICIAN"}
            className={role === "CLINICIAN" ? "active" : ""}
            onClick={() => setRole("CLINICIAN")}
          >
            <Stethoscope size={17} aria-hidden /> Clinician
          </button>
        </div>

        <Field
          label="Email address"
          name="email"
          type="email"
          icon={Mail}
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label="Password"
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
          {loading ? "Signing in…" : "Continue securely"} <ArrowRight size={17} aria-hidden />
        </button>

        {role === "PATIENT" ? (
          <ClinicalNotice>
            ReproAI is prescribed by licensed healthcare providers. If you are a new patient, please
            use the secure activation link sent to your email by your fertility clinic or partner.
          </ClinicalNotice>
        ) : (
          <div className="login-note">
            <ShieldCheck size={15} aria-hidden /> Clinician accounts are provisioned by your
            organisation
          </div>
        )}

        {demoEnabled && (
          <div className="demo-login">
            <div className="demo-divider"><span>Or explore the demo</span></div>
            <div className="demo-buttons">
              {DEMO_PERSONAS.map(({ persona, label, detail, icon: Icon }) => (
                <button key={persona} type="button" className="secondary" onClick={() => demoLogin(persona)} disabled={demoLoading !== null}>
                  <Icon size={16} aria-hidden />
                  <span>
                    <strong>{demoLoading === persona ? "Opening…" : label}</strong>
                    <small>{detail}</small>
                  </span>
                </button>
              ))}
            </div>
            <Link href="/tour" className="demo-tour-link">
              <PlayCircle size={15} aria-hidden /> Take the guided demo (12 steps)
            </Link>
            <p className="demo-note">
              <PlayCircle size={13} aria-hidden /> Demo accounts use sample data. No password needed.
            </p>
          </div>
        )}
      </form>
    </AuthShell>
  );
}
