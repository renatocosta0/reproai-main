import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canAccessCase } from "@/lib/clinician-scope";

// GET /api/reports/:caseId — kept so old links keep working. The case report is
// now a printable page for clinicians (released information only, estimate
// with its 95% interval, provenance and limitations). Patients never receive
// a report from here: drafts and probabilities are not shown to patients.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (session.role !== "CLINICIAN") return NextResponse.json({ error: "Clinician access required" }, { status: 403 });
  if (!(await canAccessCase(session.userId, params.id))) {
    return NextResponse.json({ error: "This case is not in your care list" }, { status: 403 });
  }
  return NextResponse.redirect(new URL(`/clinician/patient/${encodeURIComponent(params.id)}/report`, req.url), 303);
}
