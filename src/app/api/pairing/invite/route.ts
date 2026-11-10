import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import crypto from "crypto";

// POST /api/pairing/invite
// Authenticated patient invites their partner to pair and unlock joint couple prognostics
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "PATIENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.recipientEmail || typeof body.recipientEmail !== "string") {
      return NextResponse.json({ error: "recipientEmail is required" }, { status: 400 });
    }

    const recipientEmail = body.recipientEmail.trim().toLowerCase();

    // Check if sending to self
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (user?.email.toLowerCase() === recipientEmail) {
      return NextResponse.json({ error: "Cannot invite your own email" }, { status: 400 });
    }

    // Generate secure pairing token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Revoke any previous pending invite from this user to this email
    await prisma.pairingInvite.updateMany({
      where: {
        senderId: session.userId,
        recipientEmail,
        status: "PENDING"
      },
      data: { status: "REVOKED" }
    });

    const invite = await prisma.pairingInvite.create({
      data: {
        senderId: session.userId,
        recipientEmail,
        token,
        status: "PENDING",
        expiresAt
      }
    });

    await audit(session.userId, "pairing_invite_sent", `to:${recipientEmail}`);

    return NextResponse.json({
      ok: true,
      invite: {
        id: invite.id,
        recipientEmail: invite.recipientEmail,
        token: invite.token,
        expiresAt: invite.expiresAt,
        inviteUrl: `/pair?token=${invite.token}`
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/pairing/invite] error:", error);
    return NextResponse.json({ error: error?.message ?? "Failed to send pairing invite" }, { status: 500 });
  }
}
