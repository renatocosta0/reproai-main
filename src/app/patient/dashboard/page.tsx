import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { buildRecommendations } from "@/lib/guidelines";

export const dynamic = "force-dynamic";

export default async function PatientDashboard() {
  const session = await getSession();
  const coupleId = session?.coupleId ?? null;

  // Load couple data: latest prediction + patient profiles
  const couple = coupleId
    ? await prisma.couple.findUnique({
        where: { id: coupleId },
        include: {
          predictions: { orderBy: { createdAt: "desc" }, take: 1 },
          patients: true
        }
      })
    : null;

  const latestPrediction = couple?.predictions[0] ?? null;
  const female = couple?.patients.find((p) => p.sex === "female") ?? null;

  // Lifestyle recommendations derived from persisted patient data
  const recs = female
    ? buildRecommendations({
        bmi: female.bmi ?? undefined,
        pcosHistory: female.pcosHistory ?? undefined
      })
    : [];

  // Parse stored factors JSON safely
  let factors: Array<{ feature: string; impact: number }> = [];
  if (latestPrediction?.factors) {
    try {
      factors = JSON.parse(latestPrediction.factors);
    } catch {
      factors = [];
    }
  }

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-semibold text-brand">Your fertility journey</h1>

      {/* ── Latest prediction ────────────────────────────────────────────── */}
      <Card title="Latest prediction">
        {latestPrediction ? (
          <div className="space-y-4">
            <div className="flex items-end gap-3">
              <span className="text-5xl font-bold text-brand">
                {latestPrediction.probability}%
              </span>
              {latestPrediction.confidenceLow != null &&
                latestPrediction.confidenceHigh != null && (
                  <span className="mb-1 text-sm text-gray-500">
                    95% CI: {latestPrediction.confidenceLow}–{latestPrediction.confidenceHigh}%
                  </span>
                )}
            </div>
            <p className="text-sm text-gray-500">
              Estimated IVF success probability based on your clinical profile.
              This is a decision-support estimate — not a medical diagnosis.
            </p>
            {factors.length > 0 && (
              <>
                <h3 className="text-sm font-semibold text-gray-700">Most influential factors</h3>
                <ul className="space-y-2">
                  {factors.map((f) => (
                    <li key={f.feature} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{f.feature}</span>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-brand"
                            style={{ width: `${Math.round(f.impact * 100)}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-xs text-gray-500">
                          {Math.round(f.impact * 100)}%
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <p className="text-xs text-gray-400">
              Model: {latestPrediction.modelVersion ?? "—"} ·{" "}
              {new Date(latestPrediction.createdAt).toLocaleDateString()}
            </p>
          </div>
        ) : (
          <EmptyState message="No prediction yet. Complete your data in 'My data' to generate your first personalized estimate." />
        )}
      </Card>

      {/* ── Fertility window shortcut ─────────────────────────────────────── */}
      <Card title="Fertility window">
        <p className="mb-3 text-sm text-gray-600">
          Calculate your estimated fertile days based on your cycle data.
        </p>
        <Link
          href="/patient/fertility-window"
          className="inline-block rounded-lg bg-brand px-5 py-2 text-sm text-white hover:opacity-90"
        >
          Open fertility window calculator →
        </Link>
      </Card>

      {/* ── Lifestyle guidance ───────────────────────────────────────────── */}
      <Card title="Lifestyle guidance">
        {recs.length > 0 ? (
          <div className="space-y-3">
            {recs.map((r) => (
              <div key={r.topic} className="rounded-lg bg-gray-50 p-3">
                <p className="text-sm font-medium text-gray-800">{r.topic}</p>
                <p className="text-sm text-gray-600">{r.message}</p>
                <p className="mt-1 text-xs text-gray-400">Source: {r.source}</p>
              </div>
            ))}
          </div>
        ) : (
          <>
            <EmptyState message="Personalized lifestyle guidance appears here once your data is entered." />
            <div className="mt-2 text-center">
              <Link href="/patient/lifestyle" className="text-sm text-brand hover:underline">
                Go to lifestyle guidance →
              </Link>
            </div>
          </>
        )}
      </Card>
    </main>
  );
}
