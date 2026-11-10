import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calculateImpactMetrics } from "@/lib/impact-metrics";

// GET /api/clinician/couples
// Returns list of monitored patients and couples under clinical supervision,
// along with latest prediction scores, follow-up alerts, and economic impact metrics.
export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "CLINICIAN") {
      return NextResponse.json(
        { error: "Unauthorized: clinician access required" },
        { status: 403 }
      );
    }

    const couples = await prisma.couple.findMany({
      include: {
        patients: true,
        users: {
          select: {
            id: true,
            email: true,
            createdAt: true
          }
        },
        predictions: {
          orderBy: { createdAt: "desc" },
          take: 1
        },
        observations: {
          orderBy: { effectiveAt: "desc" },
          take: 5
        },
        followUps: {
          orderBy: { createdAt: "desc" },
          take: 1
        },
        invitations: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const predictionsList = couples.map((c) => c.predictions[0] ?? null);
    const metrics = calculateImpactMetrics(predictionsList);

    const formattedCouples = couples.map((c) => {
      const latestPrediction = c.predictions[0] ?? null;
      const latestFollowUp = c.followUps[0] ?? null;
      const invitation = c.invitations[0] ?? null;

      const femalePatient = c.patients.find((p) => p.sex === "female");
      const malePatient = c.patients.find((p) => p.sex === "male");

      const names = c.patients
        .map((p) => p.name)
        .filter(Boolean)
        .join(" & ");

      const displayName = names || (invitation?.name) || (femalePatient ? `Patient ${femalePatient.id.slice(0, 6)}` : `Case ${c.id.slice(0, 6)}`);

      return {
        id: c.id,
        displayName,
        createdAt: c.createdAt,
        scope: invitation?.scope ?? (c.patients.length > 1 ? "COUPLE" : "INDIVIDUAL"),
        patients: c.patients,
        users: c.users,
        latestPrediction: latestPrediction ? {
          id: latestPrediction.id,
          probability: latestPrediction.probability,
          confidenceLow: latestPrediction.confidenceLow,
          confidenceHigh: latestPrediction.confidenceHigh,
          tier: latestPrediction.tier,
          scope: latestPrediction.scope,
          factors: latestPrediction.factors ? JSON.parse(latestPrediction.factors) : null,
          createdAt: latestPrediction.createdAt
        } : null,
        activeAlert: latestFollowUp && latestFollowUp.status === "ALERT_RAISED" ? {
          id: latestFollowUp.id,
          status: latestFollowUp.status,
          note: latestFollowUp.note,
          createdAt: latestFollowUp.createdAt
        } : null,
        invitationStatus: invitation?.status ?? "ACTIVE"
      };
    });

    return NextResponse.json({
      couples: formattedCouples,
      totalCount: couples.length,
      impactMetrics: metrics
    });
  } catch (error: any) {
    console.error("[GET /api/clinician/couples] error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to fetch clinician patient directory" },
      { status: 500 }
    );
  }
}
