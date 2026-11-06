"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

type Role = "PATIENT" | "CLINICIAN";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("PATIENT");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? `Registration failed (${res.status}: ${res.statusText || "Server error"})`);
      }
      router.push(role === "PATIENT" ? "/patient/onboarding" : "/clinician/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <main className="login-main">
        <div className="login-shell">
          <Link href="/login" className="back-link">
            <span aria-hidden="true">←</span> Back to home
          </Link>
          <Card className="login-card">
            <div className="login-heading">
              <span className="login-mark" aria-hidden="true">
                <span />
                <span />
              </span>
              <h1>Create your account</h1>
              <p>Start your private, personalized fertility journey.</p>
            </div>
            <form className="login-form" onSubmit={submit}>
              <Input
                label="Email"
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
              />
              <Input
                label="Password"
                type="password"
                required
                minLength={6}
                placeholder="Create a secure password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
              />
              <Select
                label="I am a"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
              >
                <option value="PATIENT">Patient</option>
                <option value="CLINICIAN">Clinician</option>
              </Select>

              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}

              <Button type="submit" className="full-button" disabled={loading}>
                {loading ? "Creating…" : "Create account"}
              </Button>
            </form>
            <p className="login-register">
              Already registered?{" "}
              <Link href="/login" className="text-link">
                Sign in
              </Link>
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
}
