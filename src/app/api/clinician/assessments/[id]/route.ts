import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { canAccessCase } from "@/lib/clinician-scope";
import { toAssessmentView } from "@/lib/person-record";

// PATCH /api/clinician/assessments/:id { action: "RELEASE" | "DISCARD", note }
// Clinician sign-off: a DRAFT becomes visible to the patient only when a
// clinician releases it with their note. Discarded drafts are kept for audit.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session || session.role !== "CLINICIAN") {
      return NextResponse.json({ error: "Clinician access required" }, { status: 403 });
    }
    const pred = await prisma.prediction.findUnique({ where: { id: params.id } });
    if (!pred || !pred.coupleId || !(await canAccessCase(session.userId, pred.coupleId))) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }
    if (pred.status !== "DRAFT") {
      return NextResponse.json({ error: "Only draft assessments can be reviewed." }, { status: 409 });
    }

    const body = await req.json().catch(() => null);
    const note = typeof body?.note === "string" ? body.note.trim().slice(0, 2000) : "";
    if (body?.action === "RELEASE") {
      if (note.length < 10) {
        return NextResponse.json({ error: "Add a short note for the patient (at least 10 characters) before releasing." }, { status: 400 });
      }
      const updated = await prisma.prediction.update({
        where: { id: pred.id },
        data: { status: "RELEASED", clinicianNote: note, reviewedById: session.userId, reviewedAt: new Date() }
      });
      await audit(session.userId, "assessment_released", `prediction:${pred.id}`);
      return NextResponse.json({ assessment: toAssessmentView(updated) });
    }
    if (body?.action === "DISCARD") {
      const updated = await prisma.prediction.update({
        where: { id: pred.id },
        data: { status: "DISCARDED", clinicianNote: note || null, reviewedById: session.userId, reviewedAt: new Date() }
      });
      await audit(session.userId, "assessment_discarded", `prediction:${pred.id}`);
      return NextResponse.json({ assessment: toAssessmentView(updated) });
    }
    return NextResponse.json({ error: "action must be RELEASE or DISCARD" }, { status: 400 });
  } catch (error: any) {
    console.error("[PATCH /api/clinician/assessments/:id] error:", error);
    return NextResponse.json({ error: error?.message ?? "Review failed" }, { status: 500 });
  }
}
