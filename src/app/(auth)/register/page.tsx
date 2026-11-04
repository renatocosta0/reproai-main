"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";

type Role = "PATIENT" | "CLINICIAN";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("PATIENT");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Registration failed");
      router.push(role === "PATIENT" ? "/patient/onboarding" : "/clinician/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-8">
      <h1 className="mb-6 text-2xl font-semibold text-brand">Create your ReproAI account</h1>
      <Card>
        <div className="space-y-4">
          <label className="flex flex-col text-sm text-gray-700">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 rounded border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col text-sm text-gray-700">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 rounded border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col text-sm text-gray-700">
            I am a
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="mt-1 rounded border border-gray-300 px-3 py-2"
            >
              <option value="PATIENT">Patient</option>
              <option value="CLINICIAN">Clinician</option>
            </select>
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            onClick={submit}
            disabled={loading}
            className="w-full rounded-lg bg-brand px-5 py-2 text-white disabled:opacity-50"
          >
            {loading ? "Creating…" : "Create account"}
          </button>
          <p className="text-center text-sm text-gray-500">
            Already registered? <Link href="/login" className="text-brand hover:underline">Sign in</Link>
          </p>
        </div>
      </Card>
    </main>
  );
}
