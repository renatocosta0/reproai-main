import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";

// POST /api/pairing/accept
// Authenticated recipient accepts a pairing invitation, linking both individuals into a shared couple
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "PATIENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.token || typeof body.token !== "string") {
      return NextResponse.json({ error: "token is required" }, { status: 400 });
    }

    const token = body.token.trim();
    const invite = await prisma.pairingInvite.findUnique({
      where: { token },
      include: { sender: true }
    });

    if (!invite || invite.status !== "PENDING") {
      return NextResponse.json({ error: "Invalid or expired pairing invite" }, { status: 404 });
    }

    if (new Date() > invite.expiresAt) {
      await prisma.pairingInvite.update({
        where: { id: invite.id },
        data: { status: "EXPIRED" }
      });
      return NextResponse.json({ error: "Pairing invite has expired" }, { status: 410 });
    }

    if (invite.senderId === session.userId) {
      return NextResponse.json({ error: "Cannot accept your own pairing invitation" }, { status: 400 });
    }

    // Determine target Couple container:
    // If the sender already has a coupleId, use it. Otherwise, create a shared one.
    let sharedCoupleId = invite.sender.coupleId;
    if (!sharedCoupleId) {
      const newCouple = await prisma.couple.create({ data: {} });
      sharedCoupleId = newCouple.id;
      await prisma.user.update({
        where: { id: invite.senderId },
        data: { coupleId: sharedCoupleId }
      });
    }

    // Link the accepting user to the shared couple
    await prisma.user.update({
      where: { id: session.userId },
      data: { coupleId: sharedCoupleId }
    });

    // Link both individual Patient profiles to the shared coupleId
    await prisma.patient.updateMany({
      where: { userId: invite.senderId },
      data: { coupleId: sharedCoupleId }
    });

    await prisma.patient.updateMany({
      where: { userId: session.userId },
      data: { coupleId: sharedCoupleId }
    });

    // Mark invite accepted
    await prisma.pairingInvite.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() }
    });

    await audit(session.userId, "pairing_accepted", `couple:${sharedCoupleId}:sender:${invite.senderId}`);

    return NextResponse.json({
      ok: true,
      message: "Pairing successful. Bivariate couple evaluation enabled.",
      coupleId: sharedCoupleId
    });
  } catch (error: any) {
    console.error("[POST /api/pairing/accept] error:", error);
    return NextResponse.json({ error: error?.message ?? "Failed to accept pairing invite" }, { status: 500 });
  }
}

