import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { clinicianCaseIds } from "@/lib/clinician-scope";
import { panelInsights, systemInsights } from "@/lib/insights";

// GET /api/clinician/insights — who would benefit from earlier advice.
// Panel: named people in this clinician's care who share their record.
// System: anonymous counts across clinics from people who opted in.
export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "CLINICIAN") {
      return NextResponse.json({ error: "Clinician access required" }, { status: 403 });
    }
    const caseIds = [...(await clinicianCaseIds(session.userId))];
    const [panel, system] = await Promise.all([panelInsights(caseIds), systemInsights()]);
    await audit(session.userId, "insights_viewed", `cases:${caseIds.length}`);
    return NextResponse.json({ panel, system });
  } catch (error: any) {
    console.error("[GET /api/clinician/insights] error:", error);
    return NextResponse.json({ error: error?.message ?? "Failed to compute insights" }, { status: 500 });
  }
}
