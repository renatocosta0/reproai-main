"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/Card";

type ObservationForm = {
  code: string;
  value: string;
  unit: string;
};

interface ObservationRecord {
  id: string;
  code: string;
  value: number;
  unit: string | null;
  effectiveAt: string;
}

const LOINC_CODES = [
  { code: "8310-5", label: "Body temperature (BBT)", unit: "Cel", placeholder: "36.5" },
  { code: "93832-4", label: "Sleep duration", unit: "h", placeholder: "7.5" },
  { code: "8867-4", label: "Heart rate", unit: "/min", placeholder: "72" }
];

export default function WearablesPage() {
  const [form, setForm] = useState<ObservationForm>({
    code: "8310-5",
    value: "",
    unit: "Cel"
  });
  const [history, setHistory] = useState<ObservationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fetchHistory = useCallback(async () => {
    try {
      const sessionRes = await fetch("/api/auth/session");
      const sessionData = await sessionRes.json();
      if (!sessionRes.ok || !sessionData.session?.coupleId) return;

      const res = await fetch(`/api/observations?coupleId=${sessionData.session.coupleId}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.observations || []);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  async function submit() {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const sessionRes = await fetch("/api/auth/session");
      const sessionData = await sessionRes.json();
      if (!sessionRes.ok || !sessionData.session?.coupleId) {
        throw new Error("You must be part of a couple to record observations");
      }

      const res = await fetch("/api/observations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coupleId: sessionData.session.coupleId,
          code: form.code,
          value: Number(form.value),
          unit: form.unit
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to record observation");

      setSuccess(true);
      setForm({ ...form, value: "" });
      await fetchHistory();
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const selectedCode = LOINC_CODES.find((c) => c.code === form.code);

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-semibold text-brand">Wearables & Vital Signs</h1>
      <p className="text-sm text-gray-600">
        Record vital signs from wearables or manual entry. Observations are stored in
        FHIR-compliant format and can be synced with regional health platforms (Malafi &amp; Sahhatna).
      </p>

      <Card title="Record observation">
        <div className="space-y-4">
          <label className="flex flex-col text-sm text-gray-700">
            Observation type (LOINC standard)
            <select
              value={form.code}
              onChange={(e) => {
                const selected = LOINC_CODES.find((c) => c.code === e.target.value);
                setForm({
                  code: e.target.value,
                  value: "",
                  unit: selected?.unit || ""
                });
              }}
              className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
            >
              {LOINC_CODES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label} ({c.code})
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col text-sm text-gray-700">
            Value ({selectedCode?.unit})
            <input
              type="number"
              step="0.1"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              placeholder={selectedCode?.placeholder}
              className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && (
            <p className="text-sm text-green-600">Observation recorded and stored in FHIR format!</p>
          )}

          <button
            onClick={submit}
            disabled={loading || !form.value}
            className="rounded-lg bg-brand px-5 py-2 text-sm font-medium text-white disabled:opacity-50 hover:opacity-95"
          >
            {loading ? "Recording..." : "Save observation"}
          </button>
        </div>
      </Card>

      {history.length > 0 && (
        <Card title="Recent logged observations">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase text-gray-400">
                  <th className="pb-2">Metric</th>
                  <th className="pb-2">LOINC Code</th>
                  <th className="pb-2">Value</th>
                  <th className="pb-2">Recorded At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.map((h) => {
                  const meta = LOINC_CODES.find((c) => c.code === h.code);
                  return (
                    <tr key={h.id} className="text-gray-700">
                      <td className="py-2.5 font-medium">{meta?.label ?? h.code}</td>
                      <td className="py-2.5 font-mono text-xs text-gray-500">{h.code}</td>
                      <td className="py-2.5 font-semibold text-brand">
                        {h.value} {h.unit}
                      </td>
                      <td className="py-2.5 text-xs text-gray-500">
                        {new Date(h.effectiveAt).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card title="About this data &amp; Abu Dhabi Health Integration">
        <div className="space-y-2 text-sm text-gray-600">
          <p>
            <strong>Body temperature:</strong> Basal body temperature tracking helps identify ovulation
            patterns. Record first thing in the morning before getting out of bed.
          </p>
          <p>
            <strong>Sleep duration:</strong> Quality sleep is essential for hormonal balance and
            fertility. Track nightly sleep hours to identify patterns.
          </p>
          <p>
            <strong>Heart rate:</strong> Resting heart rate can indicate stress levels and overall
            health, which may impact fertility.
          </p>
          <p className="mt-3 text-xs text-gray-500 border-t border-gray-100 pt-2">
            All observations are stored in <strong>FHIR R4</strong> format (Fast Healthcare Interoperability
            Resources) and ready for automated integration with the <strong>Malafi</strong> HIE platform and
            the <strong>Sahhatna</strong> citizen app.
          </p>
        </div>
      </Card>
    </main>
  );
}
