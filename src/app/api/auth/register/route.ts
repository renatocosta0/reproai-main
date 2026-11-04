import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import type { Role } from "@/types";

export async function POST(req: NextRequest) {
  const { email, password, role } = await req.json();
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

  // Patients get a couple created so both partners can share one record.
  const couple = role === "PATIENT" ? await prisma.couple.create({ data: {} }) : null;

  const user = await prisma.user.create({
    data: {
      email,
      password: await hashPassword(password),
      role: role as Role,
      coupleId: couple?.id ?? null
    }
  });

  await createSession({ userId: user.id, role: user.role as Role, coupleId: user.coupleId });
  await audit(user.id, "register", `user:${user.id}`);

  return NextResponse.json({ ok: true, role: user.role }, { status: 201 });
}
