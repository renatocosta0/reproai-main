import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { canAccessCase } from "@/lib/clinician-scope";
import { hasConsent } from "@/lib/consent";
import { LABS, type LabCode } from "@/lib/labs";

// POST /api/clinician/cases/:id/labs { userId, code, value, collectedAt }
// Records a clinician-verified laboratory or ultrasound result for a member of
// this case. Requires the member's CLINICIAN_ACCESS and LAB_RESULTS consent.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session || session.role !== "CLINICIAN") {
      return NextResponse.json({ error: "Clinician access required" }, { status: 403 });
    }
    if (!(await canAccessCase(session.userId, params.id))) {
      return NextResponse.json({ error: "This case is not in your care list" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const code = body?.code as LabCode;
    const def = LABS[code];
    const value = Number(body?.value);
    const collectedAt = body?.collectedAt ? new Date(body.collectedAt) : null;
    if (!def || !Number.isFinite(value) || value < def.min || value > def.max) {
      return NextResponse.json({ error: `Enter a valid ${def?.label ?? "result"} between ${def?.min ?? 0} and ${def?.max ?? "–"}.` }, { status: 400 });
    }
    if (!collectedAt || Number.isNaN(collectedAt.getTime()) || collectedAt > new Date()) {
      return NextResponse.json({ error: "Enter the date the sample or scan was taken (not in the future)." }, { status: 400 });
    }

    const member = await prisma.user.findFirst({ where: { id: String(body.userId), coupleId: params.id, role: "PATIENT" } });
    if (!member) {
      return NextResponse.json({ error: "That person is not part of this case" }, { status: 400 });
    }
    if (!(await hasConsent(member.id, "CLINICIAN_ACCESS")) || !(await hasConsent(member.id, "LAB_RESULTS"))) {
      return NextResponse.json({ error: "The patient has not consented to sharing laboratory results." }, { status: 403 });
    }

    const lab = await prisma.labResult.create({
      data: {
        userId: member.id,
        code,
        value,
        unit: def.unit,
        collectedAt,
        source: "CLINICIAN_VERIFIED",
        enteredById: session.userId
      }
    });
    await audit(session.userId, "lab_result_recorded", `lab:${lab.id}:user:${member.id}:${code}`);
    return NextResponse.json({ lab }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/clinician/cases/:id/labs] error:", error);
    return NextResponse.json({ error: error?.message ?? "Failed to save result" }, { status: 500 });
  }
}
