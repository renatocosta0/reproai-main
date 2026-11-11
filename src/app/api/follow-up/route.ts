import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { FOLLOW_UP_STATUSES } from "@/lib/follow-up";
import { getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";

// Closed-loop follow-up records (clinician only). Operates only on persisted
// data; no records are fabricated.

async function requireClinician() {
  const session = await getSession();
  return session?.role === "CLINICIAN" ? session : null;
}

export async function GET() {
  try {
    const session = await requireClinician();
    if (!session) return NextResponse.json({ error: "Clinician access required" }, { status: 403 });

    const items = await prisma.followUp.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        couple: {
          select: {
            id: true,
            patients: { select: { name: true, sex: true } },
            users: { select: { email: true } },
            predictions: { orderBy: { createdAt: "desc" }, take: 1, select: { probability: true, scope: true } }
          }
        }
      }
    });
    return NextResponse.json({
      items: items.map(({ couple, ...f }) => ({
        ...f,
        caseId: couple.id,
        patients: couple.patients,
        emails: couple.users.map((u) => u.email),
        latestProbability: couple.predictions[0]?.probability ?? null
      }))
    });
  } catch (error: any) {
    console.error("[GET /api/follow-up] error:", error);
    return NextResponse.json({ error: error?.message ?? "Failed to fetch follow-ups" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireClinician();
    if (!session) return NextResponse.json({ error: "Clinician access required" }, { status: 403 });

    const body = await req.json().catch(() => null);
    if (!body || typeof body.coupleId !== "string") {
      return NextResponse.json({ error: "coupleId is required" }, { status: 400 });
    }
    const item = await prisma.followUp.create({
      data: { coupleId: body.coupleId, note: typeof body.note === "string" ? body.note.trim() || null : null }
    });
    await audit(session.userId, "follow_up_opened", `follow_up:${item.id}:couple:${body.coupleId}`);
    return NextResponse.json({ item }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/follow-up] error:", error);
    return NextResponse.json({ error: error?.message ?? "Failed to create follow-up" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireClinician();
    if (!session) return NextResponse.json({ error: "Clinician access required" }, { status: 403 });

    const body = await req.json().catch(() => null);
    if (!body || !body.id || !FOLLOW_UP_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "id and a valid status are required" }, { status: 400 });
    }
    const item = await prisma.followUp.update({
      where: { id: body.id },
      data: { status: body.status, ...(typeof body.note === "string" ? { note: body.note } : {}) }
    });

    await audit(session.userId, "status_transition", `follow_up:${body.id}:${body.status}`);
    return NextResponse.json({ item });
  } catch (error: any) {
    console.error("[PATCH /api/follow-up] error:", error);
    return NextResponse.json({ error: error?.message ?? "Failed to update follow-up" }, { status: 500 });
  }
}
