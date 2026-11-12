import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { clinicianCaseIds } from "@/lib/clinician-scope";
import { liveMetrics, simulationReport } from "@/lib/evaluation";
import { audit } from "@/lib/audit";

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
    return NextResponse.json({ live, simulation, generatedAt: new Date().toISOString() });
  } catch (error: any) {
    console.error("[GET /api/clinician/evidence] error:", error);
    return NextResponse.json({ error: error?.message ?? "Failed to compute evidence" }, { status: 500 });
  }
}
