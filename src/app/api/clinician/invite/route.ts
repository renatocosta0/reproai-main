import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { randomBytes } from "node:crypto";
import { buildInvitationEmail, getEmailConfig, sendEmail } from "@/lib/email";

// Unified Clinician Digital Prescription / Invitation Endpoint
// Supports prescribing access for:
// 1) INDIVIDUAL patient (female or male: early screening, preservation, wearables)
// 2) COUPLE (bivariate assisted reproduction & natural conception tracking)
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "CLINICIAN") {
      return NextResponse.json(
        { error: "Unauthorized: only clinicians can prescribe access to patients or couples" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Flexible email extraction
    const primaryEmail = (body.email || body.femaleEmail || "").trim().toLowerCase();
    const partnerEmail = (body.partnerEmail || body.maleEmail || "").trim().toLowerCase() || null;

    if (!primaryEmail) {
      return NextResponse.json(
        { error: "An email address is required to prescribe digital care" },
        { status: 400 }
      );
    }

    // Determine scope: if partnerEmail is provided or scope is explicitly COUPLE, it's a couple
    const scope = (body.scope === "COUPLE" || partnerEmail) ? "COUPLE" : "INDIVIDUAL";
    const sex = body.sex ? String(body.sex).toLowerCase() : (body.femaleEmail ? "female" : null);
    const name = body.name ? String(body.name).trim() : null;
    const notes = body.notes ? String(body.notes).trim() : null;

    // Check if primary email is already registered as an active user
    const existingPrimary = await prisma.user.findUnique({ where: { email: primaryEmail } });
    if (existingPrimary) {
      return NextResponse.json(
        { error: `Patient with email ${primaryEmail} is already registered in the system` },
        { status: 409 }
      );
    }

    if (partnerEmail) {
      const existingPartner = await prisma.user.findUnique({ where: { email: partnerEmail } });
      if (existingPartner) {
        return NextResponse.json(
          { error: `Partner with email ${partnerEmail} is already registered in the system` },
          { status: 409 }
        );
      }
    }

    // Create the container entity for this care prescription
    const couple = await prisma.couple.create({ data: {} });

    // Generate secure single-use prescription token
    const token = `repro_inv_${randomBytes(24).toString("hex")}`;

    const invitation = await prisma.invitation.create({
      data: {
        coupleId: couple.id,
        scope,
        email: primaryEmail,
        partnerEmail,
        sex,
        name,
        femaleEmail: scope === "COUPLE" ? (sex === "female" ? primaryEmail : partnerEmail) : (sex === "female" ? primaryEmail : null),
        maleEmail: scope === "COUPLE" ? (sex === "male" ? primaryEmail : partnerEmail) : (sex === "male" ? primaryEmail : null),
        token,
        notes,
        invitedBy: session.userId,
        status: "PENDING"
      }
    });

    const action = scope === "INDIVIDUAL" ? "individual_prescribed" : "couple_prescribed";
    await audit(session.userId, action, `invitation:${invitation.id}:couple:${couple.id}`);

    // Email the activation link when email is configured. A failed send never
    // fails the prescription: the clinician still gets the link to share by hand.
    // Audit entries name the role (primary/partner), never the address.
    const inviteUrl = `/register?token=${token}`;
    const emailDelivery: { configured: boolean; sent: string[]; failed: string[] } = { configured: false, sent: [], failed: [] };
    if (getEmailConfig()) {
      emailDelivery.configured = true;
      const base = (process.env.APP_URL?.trim() || req.nextUrl.origin).replace(/\/$/, "");
      const content = buildInvitationEmail(`${base}${inviteUrl}`);
      const recipients = [{ role: "primary", to: primaryEmail }, ...(partnerEmail ? [{ role: "partner", to: partnerEmail }] : [])];
      for (const r of recipients) {
        const sent = await sendEmail({ ...content, to: r.to, idempotencyKey: `invitation-email/${invitation.id}-${r.role}` });
        if (sent.ok) {
          emailDelivery.sent.push(r.to);
          await audit(session.userId, "invitation_email_sent", `invitation:${invitation.id}:${r.role}`);
        } else {
          emailDelivery.failed.push(r.to);
          console.error(`[invite] email to ${r.role} failed: ${sent.error}`);
          await audit(session.userId, "invitation_email_failed", `invitation:${invitation.id}:${r.role}`);
        }
      }
    }

    return NextResponse.json(
      {
        ok: true,
        scope,
        invitationToken: token,
        invitationId: invitation.id,
        inviteUrl,
        recipientEmail: primaryEmail,
        partnerEmail,
        emailDelivery,
        message: `${scope === "INDIVIDUAL" ? "Individual" : "Couple"} prescription invitation successfully created under clinical supervision.`
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[POST /api/clinician/invite] error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to create clinician prescription invitation" },
      { status: 500 }
    );
  }
}

// GET /api/clinician/invite - List all invitations prescribed by this clinician
export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "CLINICIAN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const invitations = await prisma.invitation.findMany({
      where: { invitedBy: session.userId },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ invitations });
  } catch (error: any) {
    console.error("[GET /api/clinician/invite] error:", error);
    return NextResponse.json({ error: error?.message ?? "Failed to fetch invitations" }, { status: 500 });
  }
}

