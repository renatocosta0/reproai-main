import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
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

export default async function ProtocolsPage() {
  const couples = await prisma.couple.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      patients: true,
      predictions: { orderBy: { createdAt: "desc" }, take: 1 }
    }
  });

  const coupleProtocols = couples.map((c) => {
    const female = c.patients.find((p) => p.sex === "female");
    const male = c.patients.find((p) => p.sex === "male");
    const prob = c.predictions[0]?.probability;

    const dynamicProtocols = suggestProtocols(
      {
        age: female?.age ?? undefined,
        bmi: female?.bmi ?? undefined,
        amh: female?.amh ?? undefined,
        spermCount: male?.spermCount ?? undefined,
        pcosHistory: female?.pcosHistory ?? undefined
      },
      prob
    );

    const items = dynamicProtocols.map((p) => [p.name, p.rationale] as [string, string]);

    const tone: "emerald" | "amber" | "rose" | "slate" =
      prob != null ? (prob >= 50 ? "emerald" : prob >= 25 ? "amber" : "rose") : "slate";

    return {
      couple: c,
      coupleNames: formatCoupleNames(c.patients),
      prob,
      tone,
      items
    };
  });

  return (
    <main className="page-main">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">Clinician workspace</p>
          <h1>Protocols</h1>
          <p style={{ marginTop: 4, color: "#64748b", fontSize: 13 }}>
            Evidence-informed suggestions for each couple, designed to support—not replace—clinical judgment.
          </p>
        </div>
      </div>

      {couples.length === 0 ? (
        <Card style={{ padding: "40px", textAlign: "center" }}>
          <p style={{ fontWeight: 600, color: "#0f172a" }}>No registered couples</p>
          <p style={{ color: "#64748b", fontSize: "13px", marginTop: "4px" }}>
            Protocol suggestions will appear here once patient couples register and enter clinical variables.
          </p>
        </Card>
      ) : (
        <div className="protocol-grid">
          {coupleProtocols.map(({ couple, coupleNames, prob, tone, items }) => (
            <Card className="protocol-card" key={couple.id}>
              <div className="protocol-card-header">
                <div>
                  <span>Couple ID</span>
                  <h2>{couple.id.slice(0, 6)}</h2>
                  <small style={{ color: "#64748b", fontSize: 12 }}>{coupleNames}</small>
                </div>
                <StatusBadge tone={tone}>
                  {prob != null ? `${prob}%` : "No data"}
                </StatusBadge>
              </div>
              <div className="protocol-list">
                {items.length > 0 ? (
                  items.map(([title, text]) => (
                    <div key={title}>
                      <strong>{title}</strong>
                      <p>{text}</p>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: "18px 0", color: "#64748b", fontSize: "13px" }}>
                    No specific clinical protocols triggered based on currently recorded variables.
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
