import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { resolveInviteToken } from "@/lib/invites";
import { PURPOSES, PURPOSE_INFO, setConsent } from "@/lib/consent";
import type { Role } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }

    const { password, role } = body;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || !password || (role !== "PATIENT" && role !== "CLINICIAN")) {
      return NextResponse.json(
        { error: "email, password and a valid role are required" },
        { status: 400 }
      );
    }

    // Clinician accounts are provisioned by the organisation, never self-registered.
    // ALLOW_CLINICIAN_SIGNUP="true" exists only to bootstrap a fresh deployment.
    if (role === "CLINICIAN" && process.env.ALLOW_CLINICIAN_SIGNUP !== "true") {
      return NextResponse.json({ error: "Clinician accounts are provisioned by your organisation." }, { status: 403 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    // Patients get an individual record and a couple container so both partners
    // can share one record when paired, or link to an existing couple invited by a clinician.
    let coupleId: string | null = null;
    let sex: string | null = body.sex ?? null;
    let name: string | null = body.name ?? null;

    if (role === "PATIENT") {
      // B2B2C rule: patients can only register with a valid clinician prescription
      // or partner pairing token, and only with the email the invite was issued to.
      const invite = body.token ? await resolveInviteToken(String(body.token)) : null;
      if (!invite) {
        return NextResponse.json(
          { error: "A valid clinic prescription or partner invitation is required to register." },
          { status: 403 }
        );
      }
      if (invite.allowedEmails.length > 0 && !invite.allowedEmails.includes(email)) {
        return NextResponse.json(
          { error: "This invitation was issued to a different email address." },
          { status: 403 }
        );
      }

      // The invitation's name/sex describe the primary invitee only, not a partner.
      if (invite.kind === "CLINIC" && email === invite.allowedEmails[0]) {
        sex = sex || invite.sex || null;
        name = name || invite.name || null;
      }
      // Validate before consuming the token so a bad request doesn't burn the invite.
      if (sex !== "female" && sex !== "male") {
        return NextResponse.json({ error: "Biological sex (female or male) is required." }, { status: 400 });
      }

      if (invite.kind === "CLINIC") {
        coupleId = invite.coupleId;
        // A couple prescription covers two emails: keep it open until both have
        // registered, so the second partner joins the same shared record.
        const others = invite.allowedEmails.filter((e) => e !== email);
        const othersRegistered = others.length
          ? await prisma.user.count({ where: { email: { in: others } } })
          : 0;
        if (othersRegistered >= others.length) {
          await prisma.invitation.update({
            where: { id: invite.id },
            data: { status: "ACCEPTED", acceptedAt: new Date() }
          });
        }
      } else {
        coupleId = invite.coupleId;
        await prisma.pairingInvite.update({
          where: { id: invite.id },
          data: { status: "ACCEPTED", acceptedAt: new Date() }
        });
      }

      if (!coupleId) {
        const couple = await prisma.couple.create({ data: {} });
        coupleId = couple.id;
      }
    }

    const user = await prisma.user.create({
      data: {
        email,
        password: await hashPassword(password),
        role: role as Role,
        coupleId
      }
    });

    // Individual-First: Create dedicated Patient profile directly linked to user
    if (role === "PATIENT") {
      await prisma.patient.create({
        data: {
          userId: user.id,
          coupleId: user.coupleId,
          name: name ? name.trim() : null,
          sex,
          age: body.age ? Number(body.age) : null,
          // Laboratory values are never self-registered: clinicians record them with provenance.
          preservationIntent: body.preservation_intent ? Boolean(body.preservation_intent) : false
        }
      });

      // Granular consent chosen at activation (defaults apply to anything not sent).
      const choices = typeof body.consents === "object" && body.consents ? body.consents : {};
      for (const purpose of PURPOSES) {
        const granted = typeof choices[purpose] === "boolean" ? choices[purpose] : PURPOSE_INFO[purpose].defaultGranted;
        await setConsent(user.id, purpose, granted);
      }
      await prisma.user.update({ where: { id: user.id }, data: { consentAt: new Date() } });
    }

    await createSession({ userId: user.id, role: user.role as Role, coupleId: user.coupleId });
    await audit(user.id, "register", `user:${user.id}`);

    return NextResponse.json({ ok: true, role: user.role, userId: user.id, coupleId: user.coupleId }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/auth/register] error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Registration failed due to a server error" },
      { status: 500 }
    );
  }
}
