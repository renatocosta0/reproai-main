import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";

// POST /api/pairing/revoke
// Pillar 5: Granular and revocable consent.
// Either individual can revoke couple pairing at any time.
// Crucially, all historical observations, biomarkers, and health data remain
// 100% intact under the individual's userId — nothing is deleted.
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "PATIENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentCoupleId = session.coupleId;
    if (!currentCoupleId) {
      return NextResponse.json({ error: "User is not currently paired" }, { status: 400 });
    }

    // Check if there are other users in this couple
    const partnersInCouple = await prisma.user.findMany({
      where: { coupleId: currentCoupleId }
    });

    // Create a new independent individual container for the revoking user
    const independentCouple = await prisma.couple.create({ data: {} });

    // Update revoking user to independent container
    await prisma.user.update({
      where: { id: session.userId },
      data: { coupleId: independentCouple.id }
    });

    // Update revoking user's individual patient profile to independent container
    await prisma.patient.updateMany({
      where: { userId: session.userId },
      data: { coupleId: independentCouple.id }
    });

    // Update revoking user's observations to point to independent container
    await prisma.observation.updateMany({
      where: { userId: session.userId },
      data: { coupleId: independentCouple.id }
    });

    // Update revoking user's individual predictions to point to independent container
    await prisma.prediction.updateMany({
      where: { userId: session.userId, scope: "INDIVIDUAL" },
      data: { coupleId: independentCouple.id }
    });

    // Revoke any pending pairing invites involving this user
    await prisma.pairingInvite.updateMany({
      where: {
        OR: [
          { senderId: session.userId, status: "PENDING" },
          { recipientEmail: (await prisma.user.findUnique({ where: { id: session.userId } }))?.email ?? "", status: "PENDING" }
        ]
      },
      data: { status: "REVOKED" }
    });

    await audit(session.userId, "pairing_revoked", `couple:${currentCoupleId}:newCouple:${independentCouple.id}`);

    return NextResponse.json({
      ok: true,
      message: "Pairing revoked successfully. Individual health records and observations remain private and intact.",
      individualCoupleId: independentCouple.id
    });
  } catch (error: any) {
    console.error("[POST /api/pairing/revoke] error:", error);
    return NextResponse.json({ error: error?.message ?? "Failed to revoke pairing" }, { status: 500 });
  }
}

