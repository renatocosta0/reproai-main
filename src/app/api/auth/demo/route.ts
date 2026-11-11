import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { audit } from "@/lib/audit";

// One-click demo sign-in for judges and walkthroughs. Disabled unless
// DEMO_LOGIN_ENABLED="true". It signs in fixed demo accounts without a password
// (created by `npm run demo:setup`), so only enable it on deployments where
// everything those accounts can see is demo data.

type DemoPersona = "CLINICIAN" | "FEMALE" | "MALE" | "COUPLE";

const DEMO_ACCOUNTS: Record<DemoPersona, { email: string; role: "CLINICIAN" | "PATIENT" }> = {
  CLINICIAN: { email: process.env.DEMO_CLINICIAN_EMAIL || "clinician@reproai.dev", role: "CLINICIAN" },
  FEMALE: { email: process.env.DEMO_FEMALE_EMAIL || "demo.female@reproai.dev", role: "PATIENT" },
  MALE: { email: process.env.DEMO_MALE_EMAIL || "demo.male@reproai.dev", role: "PATIENT" },
  COUPLE: { email: process.env.DEMO_COUPLE_EMAIL || "demo.couple@reproai.dev", role: "PATIENT" }
};

function enabled(): boolean {
  return process.env.DEMO_LOGIN_ENABLED === "true";
}

// GET /api/auth/demo -> { enabled }
export async function GET() {
  return NextResponse.json({ enabled: enabled() });
}

// POST /api/auth/demo { persona: "CLINICIAN" | "FEMALE" | "MALE" | "COUPLE" } -> { ok, role }
export async function POST(req: NextRequest) {
  if (!enabled()) {
    return NextResponse.json({ error: "Demo login is not enabled" }, { status: 404 });
  }
  try {
    const body = await req.json().catch(() => null);
    const persona = body?.persona as DemoPersona | undefined;
    const account = persona ? DEMO_ACCOUNTS[persona] : undefined;
    if (!account) {
      return NextResponse.json({ error: "persona must be CLINICIAN, FEMALE, MALE or COUPLE" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: account.email } });
    if (!user || user.role !== account.role) {
      return NextResponse.json(
        { error: "This demo account isn't set up on this deployment yet. Run `npm run demo:setup`." },
        { status: 409 }
      );
    }

    await createSession({ userId: user.id, role: account.role, coupleId: user.coupleId });
    await audit(user.id, "demo_login", `persona:${persona}:user:${user.id}`);
    return NextResponse.json({ ok: true, role: account.role });
  } catch (error: any) {
    console.error("[POST /api/auth/demo] error:", error);
    return NextResponse.json({ error: error?.message ?? "Demo login failed" }, { status: 500 });
  }
}
