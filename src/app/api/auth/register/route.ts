import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import type { Role } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }

    const { email, password, role } = body;
    if (!email || !password || (role !== "PATIENT" && role !== "CLINICIAN")) {
      return NextResponse.json(
        { error: "email, password and a valid role are required" },
        { status: 400 }
      );
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
      if (body.token) {
        // 1. Check clinician prescription invitation
        const inv = await prisma.invitation.findUnique({ where: { token: String(body.token) } });
        if (inv && inv.status === "PENDING") {
          coupleId = inv.coupleId;
          sex = sex || inv.sex || null;
          name = name || inv.name || null;
          await prisma.invitation.update({
            where: { id: inv.id },
            data: { status: "ACCEPTED", acceptedAt: new Date() }
          });
        } else {
          // 2. Check partner pairing invitation
          const pairInv = await prisma.pairingInvite.findUnique({
            where: { token: String(body.token) },
            include: { sender: true }
          });
          if (pairInv && pairInv.status === "PENDING" && new Date() <= pairInv.expiresAt) {
            coupleId = pairInv.sender.coupleId;
            await prisma.pairingInvite.update({
              where: { id: pairInv.id },
              data: { status: "ACCEPTED", acceptedAt: new Date() }
            });
          }
        }
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
          sex: sex || (body.token ? "female" : null),
          age: body.age ? Number(body.age) : null,
          bmi: body.bmi ? Number(body.bmi) : null,
          amh: body.amh ? Number(body.amh) : null,
          spermCount: body.sperm_count ? Number(body.sperm_count) : null,
          pcosHistory: body.pcos_history ? Boolean(body.pcos_history) : null,
          preservationIntent: body.preservation_intent ? Boolean(body.preservation_intent) : false
        }
      });
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
