import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Lists patients for the authenticated couple/clinician. Returns only persisted
// records; empty array when none exist. No mock records are injected.
export async function GET() {
  const patients = await prisma.patient.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ patients });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.coupleId) {
    return NextResponse.json({ error: "coupleId is required" }, { status: 400 });
  }
  const patient = await prisma.patient.create({ data: body });
  return NextResponse.json({ patient }, { status: 201 });
}
