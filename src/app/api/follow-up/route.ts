import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { FOLLOW_UP_STATUSES } from "@/lib/follow-up";

// Lists and updates closed-loop follow-up records. Operates only on persisted
// data; no records are fabricated.
export async function GET() {
  const items = await prisma.followUp.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.coupleId) {
    return NextResponse.json({ error: "coupleId is required" }, { status: 400 });
  }
  const item = await prisma.followUp.create({ data: { coupleId: body.coupleId } });
  return NextResponse.json({ item }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  if (!body.id || !FOLLOW_UP_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "id and a valid status are required" }, { status: 400 });
  }
  const item = await prisma.followUp.update({
    where: { id: body.id },
    data: { status: body.status, note: body.note }
  });
  return NextResponse.json({ item });
}
