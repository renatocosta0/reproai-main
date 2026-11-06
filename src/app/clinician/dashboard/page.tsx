import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { DataTable } from "@/components/ui/DataTable";
import { Icon } from "@/components/ui/Icons";
import { calculateImpactMetrics } from "@/lib/impact-metrics";

export const dynamic = "force-dynamic";

function formatCoupleNames(patients: Array<{ sex: string | null; name: string | null }>): string {
  const female = patients.find((p) => p.sex === "female")?.name;
  const male = patients.find((p) => p.sex === "male")?.name;
  if (female && male) return `${female} & ${male}`;
  if (female) return female;
  if (male) return male;
  const named = patients.map((p) => p.name).filter(Boolean);
  if (named.length > 0) return named.join(" & ");
  return "Unnamed Couple";
}

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

  // Calculate risk percentages strictly from real database predictions
  const validPreds = predictions.filter(Boolean);
  const totalAnalyzed = validPreds.length;
  const favourableCount = validPreds.filter((p) => (p?.probability ?? 0) >= 50).length;
  const moderateCount = validPreds.filter((p) => (p?.probability ?? 0) >= 25 && (p?.probability ?? 0) < 50).length;
  const lowCount = validPreds.filter((p) => (p?.probability ?? 0) < 25).length;

  const favPct = totalAnalyzed > 0 ? Math.round((favourableCount / totalAnalyzed) * 100) : 0;
  const modPct = totalAnalyzed > 0 ? Math.round((moderateCount / totalAnalyzed) * 100) : 0;
  const lowPct = totalAnalyzed > 0 ? Math.round((lowCount / totalAnalyzed) * 100) : 0;

  return (
    <main className="page-main">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">Clinician workspace</p>
          <h1>Patients</h1>
        </div>
      </div>

      <Card className="economic-card">
        <div className="card-heading">
          <div>
            <p className="eyebrow">Population overview</p>
            <h2>Economic Impact</h2>
          </div>
          <span className="icon-tile">
            <Icon name="chart" />
          </span>
        </div>
        <div className="impact-layout">
          <div className="stat-grid">
            <div className="stat-card">
              <span>Total couples analyzed</span>
              <strong>{metrics.totalCouples}</strong>
            </div>
            <div className="stat-card">
              <span>Low-response cases identified (&lt;25%)</span>
              <strong>{metrics.lowResponseCases}</strong>
            </div>
            <div className="stat-card">
              <span>Estimated healthcare savings</span>
              <strong>${metrics.estimatedSavingsUSD.toLocaleString()}</strong>
              <small>{metrics.cyclesOptimized} IVF cycles optimized</small>
            </div>
          </div>

          <div className="risk-distribution">
            <div className="donut-chart">
              <span>
                <strong>{metrics.totalCouples}</strong>
                couples
              </span>
            </div>
            <div className="donut-legend">
              <span>
                <i className="emerald" />
                Favourable <strong>{favPct}%</strong>
              </span>
              <span>
                <i className="amber" />
                Moderate <strong>{modPct}%</strong>
              </span>
              <span>
                <i className="rose" />
                Low response <strong>{lowPct}%</strong>
              </span>
            </div>
          </div>
        </div>
        <p className="impact-footnote">
          Estimate based on a regional average cost of $4,000 per IVF cycle.
        </p>
      </Card>

      <Card className="table-card">
        <div className="card-heading">
          <div>
            <p className="eyebrow">Care population</p>
            <h2>Registered couples</h2>
          </div>
          <Badge>{couples.length} couples</Badge>
        </div>
        <DataTable columns={["Couple ID", "Patients", "Latest prediction", ""]}>
          {couples.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ textAlign: "center", padding: "36px 16px", color: "#64748b" }}>
                No registered couples yet. When patient couples register and complete their profiles, they will appear here.
              </td>
            </tr>
          ) : (
            couples.map((couple) => {
              const prob = couple.predictions[0]?.probability;
              const tone: "emerald" | "amber" | "rose" | "slate" =
                prob != null ? (prob >= 50 ? "emerald" : prob >= 25 ? "amber" : "rose") : "slate";

              return (
                <tr key={couple.id}>
                  <td>
                    <code>{couple.id.slice(0, 6)}</code>
                  </td>
                  <td>{formatCoupleNames(couple.patients)}</td>
                  <td>
                    <StatusBadge tone={tone}>
                      {prob != null ? `${prob}%` : "No data"}
                    </StatusBadge>
                  </td>
                  <td>
                    <Link href={`/clinician/patient/${couple.id}`} className="inline-link">
                      View <Icon name="arrow" size={15} />
                    </Link>
                  </td>
                </tr>
              );
            })
          )}
        </DataTable>
      </Card>
    </main>
  );
}
