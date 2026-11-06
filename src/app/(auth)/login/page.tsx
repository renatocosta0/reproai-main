"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRoleParam = searchParams.get("role") || "Patient";
  const [role, setRole] = useState<string>(
    initialRoleParam.toLowerCase().includes("clinician") ? "Clinician" : "Patient"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const quickFill = (demoEmail: string, demoRole: string) => {
    setEmail(demoEmail);
    setPassword("Demo1234!");
    setRole(demoRole);
    setError(null);
  };

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Invalid email or password");
      }

      router.push(data.role === "CLINICIAN" ? "/clinician/dashboard" : "/patient/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid email or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <main className="login-main">
        <div className="login-shell">
          <Link href="/" className="back-link">
            <span aria-hidden="true">←</span> Back to home
          </Link>
          <Card className="login-card">
            <div className="login-heading">
              <span className="login-mark" aria-hidden="true">
                <span />
                <span />
              </span>
              <h1>Sign in</h1>
              <p>Continue to your {role.toLowerCase()} ReproAI workspace.</p>
            </div>

            <form className="login-form" onSubmit={submit} noValidate>
              <Input
                label="Email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                error={Boolean(error && !email)}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (error) setError(null);
                }}
              />
              <Input
                label="Password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                error={Boolean(error && !password)}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (error) setError(null);
                }}
              />

              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}

              <Button type="submit" className="full-button" disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </form>

            <p className="login-register">
              No account?{" "}
              <Link href="/register" className="text-link">
                Register
              </Link>
            </p>

            <div className="login-divider" />

            <div className="quick-fill">
              <span className="quick-fill-label">Demo quick-fill</span>
              <div className="quick-fill-actions">
                <Button
                  type="button"
                  variant="secondary"
                  className="button-small"
                  onClick={() => quickFill("patient.a@reproai.dev", "Patient")}
                >
                  Patient A (favourable)
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="button-small"
                  onClick={() => quickFill("patient.b@reproai.dev", "Patient")}
                >
                  Patient B (alert raised)
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="button-small"
                  onClick={() => quickFill("clinician@reproai.dev", "Clinician")}
                >
                  Clinician (Dr. Demo)
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="login-page" />}>
      <LoginForm />
    </Suspense>
  );
}
