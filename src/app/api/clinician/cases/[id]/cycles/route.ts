import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { canAccessCase } from "@/lib/clinician-scope";
import { hasConsent } from "@/lib/consent";
import { alignLabs } from "@/lib/cycle";
import { loadCycleRecord } from "@/lib/cycle-server";

// GET /api/clinician/cases/:id/cycles?userId=… → multi-cycle view with lab timing.
// Needs CLINICIAN_ACCESS and CYCLE_TRACKING consent. Notes and the private
// intimacy log are never included.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session || session.role !== "CLINICIAN") return NextResponse.json({ error: "Clinician access required" }, { status: 403 });
    if (!(await canAccessCase(session.userId, params.id))) return NextResponse.json({ error: "This case is not in your care list" }, { status: 403 });
    const userId = req.nextUrl.searchParams.get("userId");
    const member = userId ? await prisma.user.findFirst({ where: { id: userId, coupleId: params.id, role: "PATIENT" } }) : null;
    if (!member) return NextResponse.json({ error: "That person is not part of this case" }, { status: 400 });
    if (!(await hasConsent(member.id, "CLINICIAN_ACCESS"))) return NextResponse.json({ shared: false, reason: "CLINICIAN_ACCESS" });
    if (!(await hasConsent(member.id, "CYCLE_TRACKING"))) return NextResponse.json({ shared: false, reason: "CYCLE_TRACKING" });

    const record = await loadCycleRecord(member.id, "CLINICIAN");
    const labs = (await hasConsent(member.id, "LAB_RESULTS"))
      ? await prisma.labResult.findMany({ where: { userId: member.id }, orderBy: { collectedAt: "asc" } })
      : [];
    const labPoints = labs.map((l) => ({ id: l.id, code: l.code, value: l.value, unit: l.unit, collectedAt: l.collectedAt.toISOString(), source: l.source }));
    const alignment = alignLabs(labPoints, record.analysis.cycles);
    await audit(session.userId, "cycle_record_viewed", `user:${member.id}:case:${params.id}`);
    return NextResponse.json({ shared: true, ...record, labs: labPoints, alignment });
  } catch (error: any) {
    console.error("[GET /api/clinician/cases/:id/cycles] error:", error);
    return NextResponse.json({ error: "The cycle record could not be loaded." }, { status: 500 });
  }
}
