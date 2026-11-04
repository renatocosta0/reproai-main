import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";

// Records informed consent for the authenticated user and writes an audit entry.
export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const consentAt = new Date();
  await prisma.user.update({ where: { id: session.userId }, data: { consentAt } });
  await audit(session.userId, "consent", `user:${session.userId}`);
  return NextResponse.json({ ok: true, consentAt: consentAt.toISOString() });
}
