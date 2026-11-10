import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";

// Individual Profile Management API
// Supports viewing and updating the individual patient's own biological and lifestyle data
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "PATIENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch individual profile
    let profile = await prisma.patient.findUnique({
      where: { userId: session.userId }
    });

    // If profile doesn't exist yet (e.g. registered before migration), create or attach it
    if (!profile) {
      profile = await prisma.patient.findFirst({
        where: { coupleId: session.coupleId }
      });
      if (profile && !profile.userId) {
        profile = await prisma.patient.update({
          where: { id: profile.id },
          data: { userId: session.userId }
        });
      } else if (!profile) {
        profile = await prisma.patient.create({
          data: {
            userId: session.userId,
            coupleId: session.coupleId
          }
        });
      }
    }

    // 2. Determine pairing status
    let partner = null;
    if (session.coupleId) {
      const partnerUser = await prisma.user.findFirst({
        where: {
          coupleId: session.coupleId,
          id: { not: session.userId },
          role: "PATIENT"
        },
        select: {
          id: true,
          email: true,
          createdAt: true,
          patientProfile: {
            select: {
              name: true,
              sex: true,
              age: true
            }
          }
        }
      });
      if (partnerUser) {
        partner = {
          id: partnerUser.id,
          email: partnerUser.email,
          name: partnerUser.patientProfile?.name ?? null,
          sex: partnerUser.patientProfile?.sex ?? null,
          age: partnerUser.patientProfile?.age ?? null
        };
      }
    }

    // 3. Fetch latest individual prediction
    const latestPrediction = await prisma.prediction.findFirst({
      where: {
        OR: [
          { userId: session.userId },
          { coupleId: session.coupleId }
        ]
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({
      profile,
      isPaired: partner !== null,
      partner,
      latestPrediction: latestPrediction ? {
        id: latestPrediction.id,
        scope: latestPrediction.scope,
        probability: latestPrediction.probability,
        confidenceLow: latestPrediction.confidenceLow,
        confidenceHigh: latestPrediction.confidenceHigh,
        tier: latestPrediction.tier,
        preservationGuidance: latestPrediction.preservationGuidance,
        factors: latestPrediction.factors ? JSON.parse(latestPrediction.factors) : null,
        modelVersion: latestPrediction.modelVersion,
        createdAt: latestPrediction.createdAt
      } : null
    });
  } catch (error: any) {
    console.error("[GET /api/patient/profile] error:", error);
    return NextResponse.json({ error: error?.message ?? "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "PATIENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Upsert individual profile
    const existing = await prisma.patient.findUnique({
      where: { userId: session.userId }
    });

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name ? String(body.name).trim() : null;
    if (body.sex !== undefined) updateData.sex = body.sex ? String(body.sex).toLowerCase() : null;
    if (body.age !== undefined) updateData.age = body.age !== null ? Number(body.age) : null;
    if (body.bmi !== undefined) updateData.bmi = body.bmi !== null ? Number(body.bmi) : null;
    if (body.amh !== undefined) updateData.amh = body.amh !== null ? Number(body.amh) : null;
    if (body.sperm_count !== undefined) updateData.spermCount = body.sperm_count !== null ? Number(body.sperm_count) : null;
    if (body.spermCount !== undefined) updateData.spermCount = body.spermCount !== null ? Number(body.spermCount) : null;
    if (body.pcos_history !== undefined) updateData.pcosHistory = Boolean(body.pcos_history);
    if (body.pcosHistory !== undefined) updateData.pcosHistory = Boolean(body.pcosHistory);
    if (body.antral_follicle_count !== undefined) updateData.antralFollicleCount = body.antral_follicle_count !== null ? Number(body.antral_follicle_count) : null;
    if (body.cycle_regularity !== undefined) updateData.cycleRegularity = body.cycle_regularity ? String(body.cycle_regularity) : null;
    if (body.preservation_intent !== undefined) updateData.preservationIntent = Boolean(body.preservation_intent);
    if (body.infertility_duration_months !== undefined) updateData.infertilityDurationMonths = body.infertility_duration_months !== null ? Number(body.infertility_duration_months) : null;
    if (body.prior_cycles !== undefined) updateData.priorCycles = body.prior_cycles !== null ? Number(body.prior_cycles) : null;

    let profile;
    if (existing) {
      profile = await prisma.patient.update({
        where: { id: existing.id },
        data: updateData
      });
    } else {
      profile = await prisma.patient.create({
        data: {
          userId: session.userId,
          coupleId: session.coupleId,
          ...updateData
        }
      });
    }

    await audit(session.userId, "update_individual_profile", `user:${session.userId}`);
    return NextResponse.json({ ok: true, profile });
  } catch (error: any) {
    console.error("[PATCH /api/patient/profile] error:", error);
    return NextResponse.json({ error: error?.message ?? "Failed to update profile" }, { status: 500 });
  }
}
