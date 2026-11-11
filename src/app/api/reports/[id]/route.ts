import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { suggestProtocols } from "@/lib/protocols";
import { buildReportPdf } from "@/lib/pdf";

// Generates a PDF report for a couple from their real persisted data and latest
// prediction. Returns 404 when the couple does not exist and 409 when there is
// no prediction to report on — nothing is invented.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Patients may only download their own couple's report; clinicians any.
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (session.role !== "CLINICIAN" && session.coupleId !== params.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const couple = await prisma.couple.findUnique({
      where: { id: params.id },
      include: { patients: true, predictions: { orderBy: { createdAt: "desc" }, take: 1 } }
    });

    if (!couple) {
      return NextResponse.json({ error: "Couple not found" }, { status: 404 });
    }
    const latest = couple.predictions[0];
    if (!latest) {
      return NextResponse.json(
        { error: "No prediction available to generate a report" },
        { status: 409 }
      );
    }

    const female = couple.patients.find((p) => p.sex === "female");
    const male = couple.patients.find((p) => p.sex === "male");
    const coupleNames =
      female?.name && male?.name
        ? `${female.name} & ${male.name}`
        : female?.name || male?.name || undefined;

    const protocols = suggestProtocols(
      {
        age: female?.age ?? undefined,
        bmi: female?.bmi ?? undefined,
        spermCount: male?.spermCount ?? undefined,
        pcosHistory: female?.pcosHistory ?? undefined
      },
      latest.probability
    );

    const pdf = buildReportPdf({
      coupleId: couple.id,
      coupleNames,
      probability: latest.probability,
      modelVersion: latest.modelVersion ?? "unknown",
      createdAt: latest.createdAt.toISOString(),
      protocols
    });

    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="reproai-report-${couple.id.slice(0, 8)}.pdf"`
      }
    });
  } catch (error: any) {
    console.error("[GET /api/reports/:id] error:", error);
    return NextResponse.json({ error: error?.message ?? "Report generation failed" }, { status: 500 });
  }
}
