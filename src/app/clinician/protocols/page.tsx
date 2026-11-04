import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { suggestProtocols } from "@/lib/protocols";

export const dynamic = "force-dynamic";

export default async function ProtocolsPage() {
  const couples = await prisma.couple.findMany({
    include: { patients: true, predictions: { orderBy: { createdAt: "desc" }, take: 1 } }
  });

  const rows = couples
    .map((c) => {
      const female = c.patients.find((p) => p.sex === "female");
      const male = c.patients.find((p) => p.sex === "male");
      const protocols = suggestProtocols(
        {
          age: female?.age ?? undefined,
          bmi: female?.bmi ?? undefined,
          spermCount: male?.spermCount ?? undefined,
          pcosHistory: female?.pcosHistory ?? undefined
        },
        c.predictions[0]?.probability
      );
      return { id: c.id, protocols };
    })
    .filter((r) => r.protocols.length > 0);

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-semibold text-brand">Protocol suggestions</h1>
      {rows.length === 0 ? (
        <EmptyState message="No protocol suggestions available. They appear once couples have clinical data and predictions." />
      ) : (
        rows.map((r) => (
          <Card key={r.id} title={`Couple ${r.id.slice(0, 8)}`}>
            <ul className="space-y-2 text-sm">
              {r.protocols.map((p) => (
                <li key={p.name}>
                  <span className="font-medium text-gray-800">{p.name}</span>
                  <span className="text-gray-600"> — {p.rationale}</span>
                </li>
              ))}
            </ul>
          </Card>
        ))
      )}
    </main>
  );
}
