import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Lists patients for the authenticated couple/clinician. Returns only persisted
// records; empty array when none exist. No mock records are injected.
export async function GET() {
  try {
    const patients = await prisma.patient.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ patients });
  } catch (error: any) {
    console.error("[GET /api/patients] error:", error);
    return NextResponse.json({ error: error?.message ?? "Failed to fetch patients" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.coupleId) {
      return NextResponse.json({ error: "coupleId is required" }, { status: 400 });
    }
    const patient = await prisma.patient.create({ data: body });
    return NextResponse.json({ patient }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/patients] error:", error);
    return NextResponse.json({ error: error?.message ?? "Failed to save patient" }, { status: 500 });
  }
}
