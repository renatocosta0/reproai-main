import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/pairing/status
// Returns the user's current pairing state, partner profile, and pending invitations
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "PATIENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { patientProfile: true }
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check for partner in current couple
    let partner = null;
    if (currentUser.coupleId) {
      const partnerUser = await prisma.user.findFirst({
        where: {
          coupleId: currentUser.coupleId,
          id: { not: currentUser.id },
          role: "PATIENT"
        },
        include: { patientProfile: true }
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

    // Pending sent invites
    const sentInvites = await prisma.pairingInvite.findMany({
      where: {
        senderId: currentUser.id,
        status: "PENDING",
        expiresAt: { gt: new Date() }
      },
      select: {
        id: true,
        recipientEmail: true,
        token: true,
        expiresAt: true,
        createdAt: true
      }
    });

    // Pending received invites
    const receivedInvites = await prisma.pairingInvite.findMany({
      where: {
        recipientEmail: currentUser.email.toLowerCase(),
        status: "PENDING",
        expiresAt: { gt: new Date() }
      },
      include: {
        sender: {
          select: {
            email: true,
            patientProfile: {
              select: { name: true, sex: true }
            }
          }
        }
      }
    });

    return NextResponse.json({
      isPaired: partner !== null,
      coupleId: currentUser.coupleId,
      partner,
      sentInvites,
      receivedInvites: receivedInvites.map((inv) => ({
        id: inv.id,
        token: inv.token,
        senderEmail: inv.sender.email,
        senderName: inv.sender.patientProfile?.name ?? null,
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt
      }))
    });
  } catch (error: any) {
    console.error("[GET /api/pairing/status] error:", error);
    return NextResponse.json({ error: error?.message ?? "Failed to fetch pairing status" }, { status: 500 });
  }
}
