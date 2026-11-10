import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { randomBytes } from "node:crypto";

// Clinician-led Digital Prescription / Invitation for Couples.
// Enforces the B2B2C clinical governance model: couples enter the platform under
// clinician supervision rather than through unguided self-diagnosis.
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "CLINICIAN") {
      return NextResponse.json(
        { error: "Unauthorized: only clinicians can prescribe access to couples" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.femaleEmail) {
      return NextResponse.json(
        { error: "femaleEmail is required to invite a couple" },
        { status: 400 }
      );
    }

    const femaleEmail = String(body.femaleEmail).trim().toLowerCase();
    const maleEmail = body.maleEmail ? String(body.maleEmail).trim().toLowerCase() : null;
    const notes = body.notes ? String(body.notes).trim() : null;

    // Check if an existing user or active invitation is already registered with this email
    const existingUser = await prisma.user.findUnique({ where: { email: femaleEmail } });
    if (existingUser) {
      return NextResponse.json(
        { error: "A patient with this email is already registered in the system" },
        { status: 409 }
      );
    }

    // Create the new couple entity
    const couple = await prisma.couple.create({ data: {} });

    // Generate secure single-use invitation token
    const token = `repro_inv_${randomBytes(24).toString("hex")}`;

    const invitation = await prisma.invitation.create({
      data: {
        coupleId: couple.id,
        femaleEmail,
        maleEmail,
        token,
        notes,
        invitedBy: session.userId,
        status: "PENDING"
      }
    });

    await audit(session.userId, "couple_prescribed", `couple:${couple.id}`);

    return NextResponse.json(
      {
        ok: true,
        coupleId: couple.id,
        invitationToken: token,
        invitationId: invitation.id,
        inviteUrl: `/register?token=${token}&coupleId=${couple.id}`,
        message: "Couple invitation successfully created under clinical supervision."
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[POST /api/clinician/invite-couple] error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to create couple invitation" },
      { status: 500 }
    );
  }
}

