import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { RiskBadge } from "@/components/clinician/RiskBadge";
import { calculateImpactMetrics, formatCurrency } from "@/lib/impact-metrics";

export const dynamic = "force-dynamic";

export default async function ClinicianDashboard() {
  const couples = await prisma.couple.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      patients: true,
      predictions: { orderBy: { createdAt: "desc" }, take: 1 }
    }
  });

  const predictions = couples.map((c) => c.predictions[0]);
  const metrics = calculateImpactMetrics(predictions);

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-semibold text-brand">Patients</h1>

      {/* Economic Impact Metrics */}
      <Card title="Economic impact">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs text-gray-500">Total couples analyzed</p>
            <p className="mt-1 text-2xl font-semibold text-brand">{metrics.totalCouples}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs text-gray-500">Low-response cases identified</p>
            <p className="mt-1 text-2xl font-semibold text-brand">{metrics.lowResponseCases}</p>
            <p className="mt-1 text-xs text-gray-500">Probability &lt; 25%</p>
          </div>
          <div className="rounded-lg bg-green-50 p-4">
            <p className="text-xs text-gray-500">Estimated healthcare savings</p>
            <p className="mt-1 text-2xl font-semibold text-green-700">{formatCurrency(metrics.estimatedSavingsUSD)}</p>
            <p className="mt-1 text-xs text-gray-500">{metrics.cyclesOptimized} IVF cycles optimized</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Based on {metrics.ivfCycleCost.toLocaleString()} USD average IVF cycle cost. Savings calculated by identifying
          low-response cases early, avoiding unnecessary treatment cycles.
        </p>
      </Card>

      <Card title="Registered couples">
        {couples.length === 0 ? (
          <EmptyState message="No patients registered yet. Records appear here once couples complete onboarding." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2">Couple</th>
                <th className="py-2">Patients</th>
                <th className="py-2">Latest prediction</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {couples.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="py-2 font-mono text-xs">{c.id.slice(0, 8)}</td>
                  <td className="py-2">{c.patients.length}</td>
                  <td className="py-2">
                    <RiskBadge probability={c.predictions[0]?.probability ?? null} />
                  </td>
                  <td className="py-2 text-right">
                    <Link href={`/clinician/patient/${c.id}`} className="text-brand hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </main>
  );
}
