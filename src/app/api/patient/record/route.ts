import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { loadPersonRecord } from "@/lib/person-record";
import { INTENDED_USE } from "@/lib/pathways";
import { NON_DISCRIMINATION, PURPOSE_INFO } from "@/lib/consent";

// GET /api/patient/record — the signed-in patient's own longitudinal record:
// labs with provenance, clinician-released assessments only, pathway options,
// wearable summary and consent state. Drafts are never returned; the patient
// is told only that a result is with their clinician.
export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "PATIENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const record = await loadPersonRecord(session.userId, "PATIENT");
    if (!record) return NextResponse.json({ error: "Record not found" }, { status: 404 });

    const pendingReview = await prisma.prediction.count({
      where: {
        status: "DRAFT",
        OR: [{ userId: session.userId }, ...(session.coupleId ? [{ coupleId: session.coupleId, scope: "COUPLE" }] : [])]
      }
    });

    return NextResponse.json({
      ...record,
      pendingReview: pendingReview > 0,
      intendedUse: INTENDED_USE,
      nonDiscrimination: NON_DISCRIMINATION,
      purposeInfo: PURPOSE_INFO
    });
  } catch (error: any) {
    console.error("[GET /api/patient/record] error:", error);
    return NextResponse.json({ error: error?.message ?? "Failed to load record" }, { status: 500 });
  }
}
