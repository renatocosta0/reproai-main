"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";

export default function Onboarding() {
  const router = useRouter();
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    if (!consent) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/consent", { method: "POST" });
      if (!res.ok) throw new Error("Could not record consent.");
      router.push("/patient/data-entry");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-semibold text-brand">Welcome to ReproAI</h1>
      <Card title="Informed consent & data governance">
        <p className="text-sm text-gray-600">
          ReproAI processes sensitive health information to provide decision-support estimates.
          Your data is encrypted, access is logged, and you may withdraw consent at any time.
          ReproAI does not replace professional medical advice.
        </p>
        <label className="mt-4 flex items-start gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1"
          />
          <span>I give informed consent to the processing of my health data.</span>
        </label>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <button
          onClick={handleContinue}
          disabled={!consent || submitting}
          className="mt-4 rounded-lg bg-brand px-5 py-2 text-white disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Continue"}
        </button>
      </Card>
    </main>
  );
}
