"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { buildRecommendations, Recommendation } from "@/lib/guidelines";

export default function LifestylePage() {
  const [bmi, setBmi] = useState("");
  const [pcos, setPcos] = useState(false);
  const [recs, setRecs] = useState<Recommendation[] | null>(null);

  function compute() {
    setRecs(
      buildRecommendations({
        bmi: bmi ? Number(bmi) : undefined,
        pcosHistory: pcos
      })
    );
  }

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-semibold text-brand">Lifestyle guidance</h1>
      <Card title="Based on your data">
        <p className="mb-4 text-sm text-gray-600">
          Recommendations are generated only from the values you enter, following WHO guidance.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col text-sm text-gray-700">
            BMI
            <input
              type="number"
              value={bmi}
              onChange={(e) => setBmi(e.target.value)}
              className="mt-1 rounded border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={pcos} onChange={(e) => setPcos(e.target.checked)} />
            History of PCOS
          </label>
        </div>
        <button onClick={compute} className="mt-4 rounded-lg bg-brand px-5 py-2 text-white">
          Get guidance
        </button>
      </Card>

      {recs &&
        (recs.length > 0 ? (
          <div className="space-y-4">
            {recs.map((r) => (
              <Card key={r.topic} title={r.topic}>
                <p className="text-sm text-gray-700">{r.message}</p>
                <p className="mt-2 text-xs text-gray-400">Source: {r.source}</p>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState message="No specific guidance was triggered by the values you entered." />
        ))}
    </main>
  );
}
