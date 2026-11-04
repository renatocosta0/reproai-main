import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { RiskBadge } from "@/components/clinician/RiskBadge";
import { suggestProtocols } from "@/lib/protocols";

export const dynamic = "force-dynamic";

export default async function PatientDetail({ params }: { params: { id: string } }) {
  const couple = await prisma.couple.findUnique({
    where: { id: params.id },
    include: {
      patients: true,
      predictions: { orderBy: { createdAt: "desc" }, take: 1 },
      observations: { orderBy: { effectiveAt: "desc" }, take: 10 }
    }
  });

  if (!couple) {
    return (
      <main className="space-y-4">
        <EmptyState message="This couple was not found." />
        <Link href="/clinician/dashboard" className="text-brand hover:underline">
          Back to patients
        </Link>
      </main>
    );
  }

  const latest = couple.predictions[0];
  const factors = latest?.factors ? (JSON.parse(latest.factors) as { feature: string; impact: number }[]) : [];
  const female = couple.patients.find((p) => p.sex === "female");
  const male = couple.patients.find((p) => p.sex === "male");
  const protocols = suggestProtocols(
    {
      age: female?.age ?? undefined,
      bmi: female?.bmi ?? undefined,
      amh: female?.amh ?? undefined,
      spermCount: male?.spermCount ?? undefined,
      pcosHistory: female?.pcosHistory ?? undefined
    },
    latest?.probability
  );

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-brand">Couple {couple.id.slice(0, 8)}</h1>
        <Link href="/clinician/dashboard" className="text-sm text-brand hover:underline">
          Back
        </Link>
      </div>

      <Card title="Latest prediction">
        {latest ? (
          <>
            <div className="flex items-center gap-4">
              <span className="text-3xl font-bold text-brand">{latest.probability}%</span>
              <RiskBadge probability={latest.probability} />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-gray-700">Most influential factors</h3>
            {factors.length > 0 ? (
              <ul className="mt-2 space-y-1 text-sm text-gray-600">
                {factors.map((f) => (
                  <li key={f.feature} className="flex justify-between">
                    <span>{f.feature}</span>
                    <span>{(f.impact * 100).toFixed(1)}%</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-gray-400">No factor breakdown stored for this prediction.</p>
            )}

            <div className="mt-5 flex flex-wrap gap-3 pt-2">
              <a
                href={`/api/reports/${couple.id}`}
                className="inline-block rounded-lg border border-brand px-4 py-2 text-sm text-brand hover:bg-brand/5 transition-colors"
              >
                Download PDF report
              </a>
              <a
                href={`/api/fhir/export?coupleId=${couple.id}`}
                target="_blank"
                rel="noreferrer"
                className="inline-block rounded-lg border border-teal-600 bg-teal-50 px-4 py-2 text-sm font-medium text-teal-800 hover:bg-teal-100 transition-colors"
              >
                Export FHIR R4 Bundle (Malafi) ↗
              </a>
            </div>
          </>
        ) : (
          <EmptyState message="No prediction has been generated for this couple yet." />
        )}
      </Card>

      <Card title="Wearables &amp; Vital Signs (FHIR Observations)">
        {couple.observations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs uppercase text-gray-400">
                  <th className="pb-2">Metric Code (LOINC)</th>
                  <th className="pb-2">Value</th>
                  <th className="pb-2">Recorded At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {couple.observations.map((obs) => (
                  <tr key={obs.id} className="text-gray-700">
                    <td className="py-2.5 font-mono text-xs text-gray-800">
                      {obs.code === "8310-5"
                        ? "Body temperature (8310-5)"
                        : obs.code === "93832-4"
                        ? "Sleep duration (93832-4)"
                        : obs.code === "8867-4"
                        ? "Heart rate (8867-4)"
                        : obs.code}
                    </td>
                    <td className="py-2.5 font-semibold text-brand">
                      {obs.value} {obs.unit}
                    </td>
                    <td className="py-2.5 text-xs text-gray-500">
                      {new Date(obs.effectiveAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState message="No wearable observations recorded for this couple yet." />
        )}
      </Card>

      <Card title="Suggested protocols">
        {protocols.length > 0 ? (
          <ul className="space-y-3">
            {protocols.map((p) => (
              <li key={p.name}>
                <p className="font-medium text-gray-800">{p.name}</p>
                <p className="text-sm text-gray-600">{p.rationale}</p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState message="No protocol suggestions from the available data. Complete the clinical record to see options." />
        )}
      </Card>
    </main>
  );
}
