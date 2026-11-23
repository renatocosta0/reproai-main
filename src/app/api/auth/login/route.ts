import { NextRequest, NextResponse } from "next/server";
import { authenticate, createMobileAccessToken, createSession, AuthError } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }

    const { email, password } = body;
    if (!email || !password) {
      return NextResponse.json({ error: "email and password are required" }, { status: 400 });
    }

    const session = await authenticate(email, password);
    if (req.headers.get("x-reproai-client") === "capacitor") {
      if (session.role !== "PATIENT") {
        return NextResponse.json({ error: "The mobile health app is for patient accounts." }, { status: 403 });
      }
      const accessToken = await createMobileAccessToken(session);
      await audit(session.userId, "login", `user:${session.userId}:client:capacitor`);
      return NextResponse.json({ ok: true, role: session.role, accessToken });
    }

    await createSession(session);
    await audit(session.userId, "login", `user:${session.userId}`);
    return NextResponse.json({ ok: true, role: session.role });
  } catch (e: any) {
    console.error("[POST /api/auth/login] error:", e);
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    return NextResponse.json({ error: e?.message ?? "Login failed" }, { status: 500 });
  }
}
