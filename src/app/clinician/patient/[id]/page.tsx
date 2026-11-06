import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { DataTable } from "@/components/ui/DataTable";
import { Icon, IconName } from "@/components/ui/Icons";
import { suggestProtocols } from "@/lib/protocols";

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

function VitalChart({ points }: { points?: string }) {
  const polylinePoints = points || "25,101 72,95 119,105 166,92 213,97 260,89 307,91 354,61 401,55 448,49 495,53 542,40 595,35";
  return (
    <div className="vital-chart">
      <svg viewBox="0 0 620 150" aria-label="Basal temperature trend">
        <g className="grid-lines">
          <path d="M25 25h570M25 70h570M25 115h570" />
        </g>
        <polyline
          className="chart-line"
          points={polylinePoints}
        />
      </svg>
    </div>
  );
}

export default async function PatientDetail({ params }: { params: { id: string } }) {
  const couple = await prisma.couple.findUnique({
    where: { id: params.id },
    include: {
      patients: true,
      predictions: { orderBy: { createdAt: "desc" }, take: 1 },
      observations: { orderBy: { effectiveAt: "desc" }, take: 20 }
    }
  });

  if (!couple) {
    return (
      <main className="page-main">
        <div className="empty-state">
          <h3>This couple was not found</h3>
          <p>Please return to the patients directory.</p>
          <Link href="/clinician/dashboard" className="button button-primary" style={{ marginTop: 12 }}>
            ← Back to patients
          </Link>
        </div>
      </main>
    );
  }

  const latest = couple.predictions[0];
  let factors: Array<{ feature: string; impact: number }> = [];
  if (latest?.factors) {
    try {
      factors = JSON.parse(latest.factors);
    } catch {
      factors = [];
    }
  }

  const female = couple.patients.find((p) => p.sex === "female");
  const male = couple.patients.find((p) => p.sex === "male");
  const coupleNames = formatCoupleNames(couple.patients);

  const dynamicProtocols = suggestProtocols(
    {
      age: female?.age ?? undefined,
      bmi: female?.bmi ?? undefined,
      amh: female?.amh ?? undefined,
      spermCount: male?.spermCount ?? undefined,
      pcosHistory: female?.pcosHistory ?? undefined
    },
    latest?.probability
  );

  const protocolsToDisplay = dynamicProtocols.map((p, idx) => ({
    icon: (idx === 0 ? "person" : idx === 1 ? "heart" : "info") as IconName,
    title: p.name,
    text: p.rationale
  }));

  const prob = latest?.probability;
  const tone: "emerald" | "amber" | "rose" | "slate" =
    prob != null ? (prob >= 50 ? "emerald" : prob >= 25 ? "amber" : "rose") : "slate";
  const toneLabel =
    prob != null
      ? (tone === "rose" ? "Low response" : tone === "amber" ? "Moderate" : "Favourable")
      : "No prediction";

  // LOINC label mapping
  const metricLabels: Record<string, string> = {
    "8310-5": "Body temperature",
    "93832-4": "Sleep duration",
    "8867-4": "Heart rate",
    "55423-8": "Step count"
  };

  const obsRows = couple.observations.map((o) => ({
    metric: metricLabels[o.code] || "Observation",
    value: `${o.value} ${o.unit ?? ""}`.trim(),
    date: new Date(o.effectiveAt).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    })
  }));

  const hasTempObs = couple.observations.some((o) => o.code === "8310-5");

  return (
    <main className="page-main">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">Clinician workspace</p>
          <h1>
            Couple {couple.id.slice(0, 6)} · {coupleNames}
          </h1>
        </div>
        <Link href="/clinician/dashboard" className="button button-ghost">
          ← Back to patients
        </Link>
      </div>

      <div className="detail-grid">
        <Card className="detail-prediction-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Model output</p>
              <h2>Latest prediction</h2>
            </div>
            <StatusBadge tone={tone}>{toneLabel}</StatusBadge>
          </div>

          {prob != null ? (
            <>
              <div className="detail-value">{prob}%</div>
              {factors.length > 0 ? (
                <div className="detail-impact-list">
                  {factors.map((item) => (
                    <div key={item.feature} className="progress-item">
                      <div>
                        <span>{item.feature}</span>
                        <strong>{Math.round(item.impact * 100)}%</strong>
                      </div>
                      <div className="progress-track">
                        <span style={{ width: `${Math.round(item.impact * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: "#64748b", fontSize: "13px", marginTop: "16px" }}>
                  No feature breakdown available for this prediction.
                </p>
              )}
            </>
          ) : (
            <div style={{ padding: "32px 0", textAlign: "center", color: "#64748b" }}>
              <p style={{ fontWeight: 600, color: "#0f172a" }}>No prediction generated yet</p>
              <p style={{ fontSize: "13px", marginTop: "4px" }}>
                Prediction estimates will be calculated once the couple submits their data.
              </p>
            </div>
          )}

          <div className="report-actions">
            <a
              href={`/api/reports/${couple.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="button button-primary"
            >
              <Icon name="download" size={16} />
              Download PDF report
            </a>
            <a
              href={`/api/fhir/export?coupleId=${couple.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="button button-secondary"
            >
              Export FHIR R4 Bundle (Malafi)
              <Icon name="external" size={15} />
            </a>
          </div>
        </Card>

        <Card className="protocol-summary-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Clinical support</p>
              <h2>Suggested protocols</h2>
            </div>
          </div>
          {protocolsToDisplay.length > 0 ? (
            protocolsToDisplay.map((p) => (
              <div className="protocol-row" key={p.title}>
                <span>
                  <Icon name={p.icon} />
                </span>
                <div>
                  <strong>{p.title}</strong>
                  <p>{p.text}</p>
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: "28px 0", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
              <p>No specific protocols triggered.</p>
              <p style={{ marginTop: "4px", fontSize: "12px", color: "#94a3b8" }}>
                Protocols are suggested automatically when clinical thresholds (e.g. PCOS, low AMH, sperm concentration) are met.
              </p>
            </div>
          )}
        </Card>
      </div>

      <Card className="vitals-card">
        <div className="card-heading">
          <div>
            <p className="eyebrow">Connected health data</p>
            <h2>Wearables &amp; Vital Signs (FHIR Observations)</h2>
          </div>
          <Badge>{obsRows.length > 0 ? "Live FHIR feed" : "No readings"}</Badge>
        </div>
        <div className="vitals-layout">
          {hasTempObs ? (
            <VitalChart />
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "32px", border: "1px dashed #cbd5e1", borderRadius: "8px", color: "#64748b", fontSize: "13px" }}>
              No temperature trend data recorded yet.
            </div>
          )}

          <DataTable columns={["Metric", "Value", "Date / time"]}>
            {obsRows.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ textAlign: "center", padding: "28px 16px", color: "#64748b" }}>
                  No wearable observations recorded for this couple.
                </td>
              </tr>
            ) : (
              obsRows.map((row, i) => (
                <tr key={`${row.metric}-${i}`}>
                  <td>{row.metric}</td>
                  <td>
                    <strong>{row.value}</strong>
                  </td>
                  <td>{row.date}</td>
                </tr>
              ))
            )}
          </DataTable>
        </div>
      </Card>
    </main>
  );
}
