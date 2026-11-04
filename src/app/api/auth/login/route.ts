import { NextRequest, NextResponse } from "next/server";
import { authenticate, createSession, AuthError } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "email and password are required" }, { status: 400 });
  }
  try {
    const session = await authenticate(email, password);
    await createSession(session);
    await audit(session.userId, "login", `user:${session.userId}`);
    return NextResponse.json({ ok: true, role: session.role });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
