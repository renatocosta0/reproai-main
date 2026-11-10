import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calculateImpactMetrics } from "@/lib/impact-metrics";

// GET /api/clinician/couples
// Returns clinical directory with strict segregation between:
// 1) "couples": Paired couples undergoing preconception care or assisted reproduction (IVF/IUI)
// 2) "individuals": Single patients tracking reproductive potential across life course (ovarian reserve, semen health, preservation)
// Supports query filter: ?scope=INDIVIDUAL | ?scope=COUPLE
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "CLINICIAN") {
      return NextResponse.json(
        { error: "Unauthorized: clinician access required" },
        { status: 403 }
      );
    }

    const requestedScope = req.nextUrl.searchParams.get("scope")?.toUpperCase();

    const containers = await prisma.couple.findMany({
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
          take: 10
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

    const predictionsList = containers.map((c) => c.predictions[0] ?? null);
    const metrics = calculateImpactMetrics(predictionsList);

    const individuals: any[] = [];
    const couples: any[] = [];

    for (const c of containers) {
      const latestPrediction = c.predictions[0] ?? null;
      const latestFollowUp = c.followUps[0] ?? null;
      const invitation = c.invitations[0] ?? null;

      // Determine true clinical scope:
      // If invitation explicitly says INDIVIDUAL, or if there is only 1 patient/user and no partner
      const isExplicitIndividual = invitation?.scope === "INDIVIDUAL" || latestPrediction?.scope === "INDIVIDUAL";
      const isMultiPerson = c.patients.length > 1 || c.users.length > 1 || Boolean(invitation?.partnerEmail);
      const isCouple = !isExplicitIndividual && isMultiPerson;

      const scope = isCouple ? "COUPLE" : "INDIVIDUAL";

      const femalePatient = c.patients.find((p) => p.sex === "female");
      const malePatient = c.patients.find((p) => p.sex === "male");

      const names = c.patients
        .map((p) => p.name)
        .filter(Boolean)
        .join(" & ");

      const primaryPatient = c.patients[0] ?? null;
      const primaryUser = c.users[0] ?? null;

      let displayName = names || invitation?.name;
      if (!displayName) {
        if (isCouple) {
          displayName = `Couple ${c.id.slice(0, 6)}`;
        } else {
          displayName = primaryPatient?.name ?? (primaryUser ? primaryUser.email.split("@")[0] : `Patient ${c.id.slice(0, 6)}`);
        }
      }

      const caseItem = {
        id: c.id,
        displayName,
        createdAt: c.createdAt,
        scope,
        isPaired: isCouple,
        patients: c.patients,
        users: c.users,
        latestPrediction: latestPrediction ? {
          id: latestPrediction.id,
          probability: latestPrediction.probability,
          confidenceLow: latestPrediction.confidenceLow,
          confidenceHigh: latestPrediction.confidenceHigh,
          tier: latestPrediction.tier ?? (scope === "INDIVIDUAL" ? "OPTIMAL" : "COUPLE_BIVARIATE"),
          scope: latestPrediction.scope,
          preservationGuidance: latestPrediction.preservationGuidance,
          factors: latestPrediction.factors ? JSON.parse(latestPrediction.factors) : null,
          createdAt: latestPrediction.createdAt
        } : null,
        activeAlert: latestFollowUp && latestFollowUp.status === "ALERT_RAISED" ? {
          id: latestFollowUp.id,
          status: latestFollowUp.status,
          note: latestFollowUp.note,
          createdAt: latestFollowUp.createdAt
        } : null,
        recentObservationsCount: c.observations.length,
        invitationStatus: invitation?.status ?? "ACTIVE",
        invitationScope: invitation?.scope ?? scope
      };

      if (isCouple) {
        couples.push(caseItem);
      } else {
        individuals.push(caseItem);
      }
    }

    const activeAlertsCount = [...individuals, ...couples].filter((item) => item.activeAlert !== null).length;

    // Filter if specific scope requested
    if (requestedScope === "INDIVIDUAL") {
      return NextResponse.json({
        scope: "INDIVIDUAL",
        items: individuals,
        count: individuals.length,
        activeAlertsCount: individuals.filter((i) => i.activeAlert !== null).length,
        impactMetrics: metrics
      });
    }

    if (requestedScope === "COUPLE") {
      return NextResponse.json({
        scope: "COUPLE",
        items: couples,
        count: couples.length,
        activeAlertsCount: couples.filter((c) => c.activeAlert !== null).length,
        impactMetrics: metrics
      });
    }

    // Default response: fully segregated lists with summary counts
    return NextResponse.json({
      individuals,
      couples,
      counts: {
        total: containers.length,
        individuals: individuals.length,
        couples: couples.length,
        activeAlerts: activeAlertsCount
      },
      impactMetrics: metrics
    });
  } catch (error: any) {
    console.error("[GET /api/clinician/couples] error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to fetch clinician directory" },
      { status: 500 }
    );
  }
}
