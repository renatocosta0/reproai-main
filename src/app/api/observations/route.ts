import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasConsent } from "@/lib/consent";
import { canAccessCase, canAccessUser } from "@/lib/clinician-scope";
import { normaliseObservation } from "@/lib/observation-analysis";

// FHIR-aligned observations (wearables or manually entered vitals).
// Patients only ever see their own records (individual-first privacy, even when
// paired). Clinicians may query by coupleId or userId.
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    let where: { userId?: string; coupleId?: string };
    if (session.role === "PATIENT") {
      where = { userId: session.userId };
    } else {
      const queryCoupleId = req.nextUrl.searchParams.get("coupleId");
      const queryUserId = req.nextUrl.searchParams.get("userId");
      if (!queryCoupleId && !queryUserId) {
        return NextResponse.json({ error: "coupleId or userId is required" }, { status: 400 });
      }
      const allowed = queryUserId ? await canAccessUser(session.userId, queryUserId) : await canAccessCase(session.userId, queryCoupleId!);
      if (!allowed) return NextResponse.json({ error: "Not in your care list" }, { status: 403 });
      where = queryUserId ? { userId: queryUserId } : { coupleId: queryCoupleId! };
    }

    const observations = await prisma.observation.findMany({
      where,
      orderBy: { effectiveAt: "desc" },
      take: 50
    });
    return NextResponse.json({ observations });
  } catch (error: any) {
    console.error("[GET /api/observations] error:", error);
    return NextResponse.json({ error: error?.message ?? "Failed to fetch observations" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (session.role === "PATIENT" && !(await hasConsent(session.userId, "WEARABLES"))) {
      return NextResponse.json({ error: "Turn on 'Store my temperature and sleep readings' in Privacy & consent to log readings." }, { status: 403 });
    }
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }
    const checked = normaliseObservation(body.code, body.value);
    if (!checked.ok) {
      return NextResponse.json({ error: checked.error }, { status: 400 });
    }
    // Patients always write into their own record; only clinicians may target a couple.
    const coupleId = session.role === "CLINICIAN" ? body.coupleId ?? null : session.coupleId ?? null;
    // Clinicians may write only into cases in their scope (prescribed or assigned).
    if (session.role === "CLINICIAN" && (!coupleId || !(await canAccessCase(session.userId, String(coupleId))))) {
      return NextResponse.json({ error: "Forbidden: this case is not in your scope" }, { status: 403 });
    }

    const observation = await prisma.observation.create({
      data: {
        coupleId,
        userId: session.userId,
        code: checked.code,
        value: checked.value,
        unit: checked.unit,
        source: "MANUAL"
      }
    });
    return NextResponse.json({ observation }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/observations] error:", error);
    return NextResponse.json({ error: error?.message ?? "Failed to create observation" }, { status: 500 });
  }
}
