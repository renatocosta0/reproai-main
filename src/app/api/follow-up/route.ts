import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { FOLLOW_UP_STATUSES } from "@/lib/follow-up";

// Lists and updates closed-loop follow-up records. Operates only on persisted
// data; no records are fabricated.
export async function GET() {
  try {
    const items = await prisma.followUp.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ items });
  } catch (error: any) {
    console.error("[GET /api/follow-up] error:", error);
    return NextResponse.json({ error: error?.message ?? "Failed to fetch follow-ups" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.coupleId) {
      return NextResponse.json({ error: "coupleId is required" }, { status: 400 });
    }
    const item = await prisma.followUp.create({ data: { coupleId: body.coupleId } });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/follow-up] error:", error);
    return NextResponse.json({ error: error?.message ?? "Failed to create follow-up" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.id || !FOLLOW_UP_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "id and a valid status are required" }, { status: 400 });
    }
    const item = await prisma.followUp.update({
      where: { id: body.id },
      data: { status: body.status, note: body.note }
    });
    return NextResponse.json({ item });
  } catch (error: any) {
    console.error("[PATCH /api/follow-up] error:", error);
    return NextResponse.json({ error: error?.message ?? "Failed to update follow-up" }, { status: 500 });
  }
}
