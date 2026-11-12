import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { hasConsent } from "@/lib/consent";

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
        // Partner details are shown only if the partner consents to partner sharing.
        const shares = await hasConsent(partnerUser.id, "PARTNER_SHARING");
        partner = {
          id: partnerUser.id,
          email: partnerUser.email,
          name: shares ? partnerUser.patientProfile?.name ?? null : null,
          sex: shares ? partnerUser.patientProfile?.sex ?? null : null,
          age: shares ? partnerUser.patientProfile?.age ?? null : null
        };
      }
    }

    // 3. Latest prediction: the user's own, or a joint one for their current couple.
    // A partner's INDIVIDUAL predictions share the coupleId but stay private to them.
    const latestPrediction = await prisma.prediction.findFirst({
      where: {
        OR: [
          { userId: session.userId, scope: "INDIVIDUAL", status: "RELEASED" },
          ...(session.coupleId ? [{ coupleId: session.coupleId, scope: "COUPLE", status: "RELEASED" }] : [])
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

    // Self-reported intake only. Laboratory values (AMH, AFC, semen analysis)
    // and sex are recorded by clinicians with provenance and are not editable here.
    const updateData: Record<string, unknown> = {};
    const n = (x: unknown, min: number, max: number) => {
      const v = Number(x);
      return Number.isFinite(v) && v >= min && v <= max ? v : undefined;
    };
    if (body.name !== undefined) updateData.name = body.name ? String(body.name).trim().slice(0, 80) : null;
    if (body.age !== undefined) updateData.age = n(body.age, 18, 55) ?? null;
    if (body.heightCm !== undefined && body.weightKg !== undefined) {
      const h = n(body.heightCm, 120, 230);
      const w = n(body.weightKg, 30, 250);
      if (h && w) updateData.bmi = Math.round((w / (h / 100) ** 2) * 10) / 10;
    }
    if (body.tryingToConceive !== undefined) updateData.tryingToConceive = body.tryingToConceive === null ? null : Boolean(body.tryingToConceive);
    if (body.monthsTrying !== undefined) updateData.infertilityDurationMonths = body.monthsTrying === null ? null : n(body.monthsTrying, 0, 240) ?? null;
    if (body.cycleRegularity !== undefined) {
      updateData.cycleRegularity = ["REGULAR", "IRREGULAR", "AMENORRHEA"].includes(body.cycleRegularity) ? body.cycleRegularity : null;
    }
    if (body.historyFlags !== undefined && Array.isArray(body.historyFlags)) {
      const flags = body.historyFlags.filter((f: unknown) => typeof f === "string").slice(0, 20);
      updateData.historyFlags = JSON.stringify(flags);
      updateData.pcosHistory = flags.includes("PCOS");
    }
    if (body.familyEarlyMenopause !== undefined) updateData.familyEarlyMenopause = body.familyEarlyMenopause === null ? null : Boolean(body.familyEarlyMenopause);
    if (body.smoking !== undefined) updateData.smoking = ["NEVER", "FORMER", "CURRENT"].includes(body.smoking) ? body.smoking : null;
    if (body.preservationIntent !== undefined) updateData.preservationIntent = Boolean(body.preservationIntent);
    if (body.priorCycles !== undefined) updateData.priorCycles = body.priorCycles === null ? null : n(body.priorCycles, 0, 30) ?? null;
    if (body.completeIntake === true) updateData.intakeCompletedAt = new Date();

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

