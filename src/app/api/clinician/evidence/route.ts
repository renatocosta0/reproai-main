import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { clinicianCaseIds } from "@/lib/clinician-scope";
import { liveMetrics, simulationReport } from "@/lib/evaluation";
import { audit } from "@/lib/audit";
import ragEval from "@/lib/rag/eval-results.json";

// GET /api/clinician/evidence — live pathway metrics for this clinician's panel
// plus the labelled simulated-cohort report. Clinician only.
export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "CLINICIAN") {
      return NextResponse.json({ error: "Clinician access required" }, { status: 403 });
    }
    const caseIds = [...(await clinicianCaseIds(session.userId))];
    const [live, simulation] = await Promise.all([
      liveMetrics(caseIds),
      simulationReport().catch((e) => ({ error: e instanceof Error ? e.message : "Simulation unavailable" }))
    ]);
    await audit(session.userId, "evidence_viewed", `cases:${caseIds.length}`);
    // Offline evaluation of the grounded assistant (npm run rag:eval). Only
    // the questions it got wrong are sent, so the page can show them.
    const { rows, ...summary } = ragEval as unknown as { rows: Array<Record<string, any>> } & Record<string, unknown>;
    const misses = rows.filter((r) =>
      r.answerable ? r.hit === false || (r.status !== undefined && r.status !== "answered") : r.status !== undefined ? r.status !== "abstained" : r.retrievalAbstained === false
    ).map((r) => ({ q: r.q, kind: r.kind, answerable: r.answerable, retrieved: r.retrieved, status: r.status ?? null }));
    return NextResponse.json({ live, simulation, rag: { ...summary, misses }, generatedAt: new Date().toISOString() });
  } catch (error: any) {
    console.error("[GET /api/clinician/evidence] error:", error);
    return NextResponse.json({ error: error?.message ?? "Failed to compute evidence" }, { status: 500 });
  }
}
