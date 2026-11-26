import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasConsent } from "@/lib/consent";
import { canAccessCase, canAccessUser } from "@/lib/clinician-scope";
import { PASSIVE_CODES, normaliseObservation } from "@/lib/observation-analysis";
import { analyseAndAlert } from "@/lib/observation-alerts";
import { audit } from "@/lib/audit";
import { resolveObservationSubject } from "@/lib/observation-subject";

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

    // Default: basal temperature and sleep (the charts). ?codes=a,b selects other
    // signals, e.g. passive wearable summaries; ?take= up to 400.
    const codesParam = req.nextUrl.searchParams.get("codes");
    const codes = codesParam ? codesParam.split(",").map((c) => c.trim()).filter(Boolean).slice(0, 12) : null;
    const take = Math.min(400, Math.max(1, Number(req.nextUrl.searchParams.get("take")) || 50));
    const observations = await prisma.observation.findMany({
      where: { ...where, ...(codes ? { code: { in: codes } } : { code: { notIn: [...PASSIVE_CODES] } }) },
      orderBy: { effectiveAt: "desc" },
      take
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
    // Patients always write into their own record. A clinician must name the
    // patient (userId) in a case in their scope; the reading is stored under that
    // patient, never under the clinician.
    const subject = await resolveObservationSubject(session, body.coupleId, body.userId);
    if (!subject.ok) {
      return NextResponse.json({ error: subject.error }, { status: subject.status });
    }

    const observation = await prisma.observation.create({
      data: {
        coupleId: subject.coupleId,
        userId: subject.userId,
        code: checked.code,
        value: checked.value,
        unit: checked.unit,
        source: "MANUAL"
      }
    });

    // Same longitudinal analysis and clinician-side alert as every other ingestion path.
    const { alertTriggered, analytics } = await analyseAndAlert(subject.userId, subject.coupleId);
    await audit(session.userId, "observation_recorded", `user:${subject.userId}:code:${checked.code}`);
    return NextResponse.json({ observation, alertTriggered, analytics }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/observations] error:", error);
    return NextResponse.json({ error: error?.message ?? "Failed to create observation" }, { status: 500 });
  }
}
