"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";

const DEMO_ACCOUNTS = [
  { label: "Patient A (favourable)", email: "patient.a@reproai.dev", role: "Patient" },
  { label: "Patient B (alert raised)", email: "patient.b@reproai.dev", role: "Patient" },
  { label: "Clinician (Dr. Demo)", email: "clinician@reproai.dev", role: "Clinician" }
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Login failed");
      router.push(data.role === "CLINICIAN" ? "/clinician/dashboard" : "/patient/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword("Demo1234!");
    setError(null);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-brand">Sign in to ReproAI</h1>
        <Link href="/" className="text-xs text-gray-500 hover:text-brand">
          ← Back to home
        </Link>
      </div>

      <Card>
        <form onSubmit={submit} className="space-y-4">
          <label className="flex flex-col text-sm text-gray-700">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              placeholder="name@example.com"
            />
          </label>
          <label className="flex flex-col text-sm text-gray-700">
            Password
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              placeholder="••••••••"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand px-5 py-2 text-white font-medium disabled:opacity-50 hover:opacity-95 transition-opacity"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
          <p className="text-center text-sm text-gray-500">
            No account? <Link href="/register" className="text-brand hover:underline">Register</Link>
          </p>
        </form>

        <div className="mt-6 border-t border-gray-100 pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Quick demo credentials
          </p>
          <div className="flex flex-col gap-1.5">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => fillDemo(acc.email)}
                className="flex items-center justify-between rounded border border-gray-200 bg-gray-50/70 px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <span>
                  <strong className="font-medium text-gray-900">{acc.label}</strong>
                  <span className="block text-[11px] text-gray-500">{acc.email}</span>
                </span>
                <span className="text-[11px] font-medium text-brand">Fill →</span>
              </button>
            ))}
          </div>
        </div>
      </Card>
    </main>
  );
}
