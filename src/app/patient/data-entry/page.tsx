"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { PredictionOutput } from "@/lib/ml-client";

type FormState = {
  age: string;
  bmi: string;
  sperm_count: string;
  amh: string;
  pcos_history: boolean;
  infertility_duration_months: string;
  prior_cycles: string;
};

const initial: FormState = {
  age: "",
  bmi: "",
  sperm_count: "",
  amh: "",
  pcos_history: false,
  infertility_duration_months: "",
  prior_cycles: ""
};

export default function DataEntry() {
  const [form, setForm] = useState<FormState>(initial);
  const [result, setResult] = useState<PredictionOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const payload = {
        age: Number(form.age),
        bmi: Number(form.bmi),
        sperm_count: Number(form.sperm_count),
        amh: Number(form.amh),
        pcos_history: form.pcos_history,
        infertility_duration_months: Number(form.infertility_duration_months),
        prior_cycles: Number(form.prior_cycles)
      };
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Prediction failed");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const field = (label: string, key: keyof FormState, type = "number") => (
    <label className="flex flex-col text-sm text-gray-700">
      {label}
      <input
        type={type}
        value={String(form[key])}
        onChange={(e) => update(key, e.target.value as never)}
        className="mt-1 rounded border border-gray-300 px-3 py-2"
      />
    </label>
  );

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-semibold text-brand">My data</h1>
      <Card title="Clinical information">
        <p className="mb-4 text-sm text-gray-600">
          Enter your own clinical values. Nothing is pre-filled. A prediction is only produced
          from the data you provide.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {field("Female age (years)", "age")}
          {field("BMI", "bmi")}
          {field("Sperm concentration (million/mL)", "sperm_count")}
          {field("AMH (ng/mL)", "amh")}
          {field("Infertility duration (months)", "infertility_duration_months")}
          {field("Prior cycles", "prior_cycles")}
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.pcos_history}
              onChange={(e) => update("pcos_history", e.target.checked)}
            />
            History of PCOS
          </label>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <button
          onClick={submit}
          disabled={loading}
          className="mt-4 rounded-lg bg-brand px-5 py-2 text-white disabled:opacity-50"
        >
          {loading ? "Analyzing…" : "Generate prediction"}
        </button>
      </Card>

      {result && (
        <Card title="Predicted success probability">
          <p className="text-3xl font-bold text-brand">{result.probability}%</p>
          <p className="mt-2 text-xs text-gray-500">{result.disclaimer}</p>
          <h3 className="mt-4 text-sm font-semibold text-gray-700">Most influential factors</h3>
          <ul className="mt-2 space-y-1 text-sm text-gray-600">
            {result.factors.map((f) => (
              <li key={f.feature} className="flex justify-between">
                <span>{f.feature}</span>
                <span>{(f.impact * 100).toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </main>
  );
}
