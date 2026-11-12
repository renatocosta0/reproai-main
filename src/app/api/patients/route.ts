import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { clinicianCaseIds, canAccessCase } from "@/lib/clinician-scope";

// Lists patients. Clinicians may filter by coupleId or userId; patients only
// ever see their own profile.
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const where: { coupleId?: string | { in: string[] }; userId?: string } = {};
    if (session.role === "PATIENT") {
      where.userId = session.userId;
    } else {
      const coupleId = req.nextUrl.searchParams.get("coupleId");
      const userId = req.nextUrl.searchParams.get("userId");
      const inScope = [...(await clinicianCaseIds(session.userId))];
      where.coupleId = coupleId && inScope.includes(coupleId) ? coupleId : { in: coupleId ? [] : inScope };
      if (userId) where.userId = userId;
    }

    const patients = await prisma.patient.findMany({
      where,
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json({ patients });
  } catch (error: any) {
    console.error("[GET /api/patients] error:", error);
    return NextResponse.json({ error: error?.message ?? "Failed to fetch patients" }, { status: 500 });
  }
}

// Clinical fields a clinician may record for a patient. Anything else in the
// body is ignored (no mass assignment of ids or ownership).
const NUMBER_FIELDS = ["age", "bmi", "amh", "spermCount", "infertilityDurationMonths", "priorCycles", "antralFollicleCount"] as const;

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "CLINICIAN") {
      return NextResponse.json({ error: "Clinician access required" }, { status: 403 });
    }
    const body = await req.json().catch(() => null);
    if (!body || typeof body.coupleId !== "string") {
      return NextResponse.json({ error: "coupleId is required" }, { status: 400 });
    }
    if (!(await canAccessCase(session.userId, body.coupleId))) {
      return NextResponse.json({ error: "Not in your care list" }, { status: 403 });
    }

    const data: Record<string, unknown> = { coupleId: body.coupleId };
    if (typeof body.name === "string") data.name = body.name.trim() || null;
    if (body.sex === "female" || body.sex === "male") data.sex = body.sex;
    if (typeof body.pcosHistory === "boolean") data.pcosHistory = body.pcosHistory;
    for (const f of NUMBER_FIELDS) {
      if (typeof body[f] === "number" && Number.isFinite(body[f])) data[f] = body[f];
    }

    const patient = await prisma.patient.create({ data: data as any });
    return NextResponse.json({ patient }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/patients] error:", error);
    return NextResponse.json({ error: error?.message ?? "Failed to save patient" }, { status: 500 });
  }
}
