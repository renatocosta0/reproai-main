import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Returns the current session for client-side components, plus the account
// email for display. Client components can't read next/headers directly.
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ session: null }, { status: 401 });
    }
    const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { email: true } });
    return NextResponse.json({ session, email: user?.email ?? null });
  } catch (error: any) {
    console.error("[GET /api/auth/session] error:", error);
    return NextResponse.json({ session: null, error: error?.message }, { status: 401 });
  }
}
