import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { canAccessCase } from "@/lib/clinician-scope";
import { toAssessmentView } from "@/lib/person-record";
import { DISCARD_ACTION_PREFIX, isDiscardReason } from "@/lib/review-reasons";
import { dispatchCareNotification } from "@/lib/notifications";

// PATCH /api/clinician/assessments/:id { action: "RELEASE" | "DISCARD", note, reason }
// Clinician sign-off: a DRAFT becomes visible to the patient only when a
// clinician releases it with their note. Discarded drafts are kept for audit,
// and a discard must say why (src/lib/review-reasons.ts).
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

      // Dispatch real-time lock screen & in-app notification to the patient
      await dispatchCareNotification({
        caseId: pred.coupleId,
        targetUserId: pred.userId ?? undefined,
        actorId: session.userId,
        type: "ASSESSMENT_RELEASED",
        title: "ReproAI · Dr. Fatima",
        body: "Your clinician reviewed your fertility results and shared new guidance. Tap to view.",
        url: "/patient/assessment"
      }).catch((e) => console.error("Notification dispatch failed:", e));

      return NextResponse.json({ assessment: toAssessmentView(updated) });
    }
    if (body?.action === "DISCARD") {
      if (!isDiscardReason(body?.reason)) {
        return NextResponse.json({ error: "Choose why you are discarding this draft." }, { status: 400 });
      }
      if (body.reason === "OTHER" && note.length < 10) {
        return NextResponse.json({ error: "Add a short note (at least 10 characters) explaining the reason." }, { status: 400 });
      }
      const updated = await prisma.prediction.update({
        where: { id: pred.id },
        data: { status: "DISCARDED", clinicianNote: note || null, reviewedById: session.userId, reviewedAt: new Date() }
      });
      await audit(session.userId, `${DISCARD_ACTION_PREFIX}:${body.reason}`, `prediction:${pred.id}`);
      return NextResponse.json({ assessment: toAssessmentView(updated) });
    }
    return NextResponse.json({ error: "action must be RELEASE or DISCARD" }, { status: 400 });
  } catch (error: any) {
    console.error("[PATCH /api/clinician/assessments/:id] error:", error);
    return NextResponse.json({ error: error?.message ?? "Review failed" }, { status: 500 });
  }
}
