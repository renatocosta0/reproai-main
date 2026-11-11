"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, HeartHandshake, Leaf, LockKeyhole, Mail, ShieldCheck, Stethoscope } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Field } from "@/components/ui/Field";
import { ClinicalNotice, FormError } from "@/components/ui/Notice";
import { api, ApiError, homeForRole, userMessage } from "@/lib/api-client";
import type { Role } from "@/types";

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("PATIENT");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      </form>
    </AuthShell>
  );
}
