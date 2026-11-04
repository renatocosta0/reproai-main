import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// FHIR-aligned observations (e.g. wearable or manually entered vitals).
// Persists only real values supplied by the client.
export async function GET(req: NextRequest) {
  const coupleId = req.nextUrl.searchParams.get("coupleId");
  if (!coupleId) {
    return NextResponse.json({ error: "coupleId is required" }, { status: 400 });
  }
  const observations = await prisma.observation.findMany({
    where: { coupleId },
    orderBy: { effectiveAt: "desc" },
    take: 20
  });
  return NextResponse.json({ observations });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { coupleId, code, value, unit } = body;
  if (!coupleId || !code || typeof value !== "number") {
    return NextResponse.json(
      { error: "coupleId, code and numeric value are required" },
      { status: 400 }
    );
  }
  const observation = await prisma.observation.create({
    data: { coupleId, code, value, unit }
  });
  return NextResponse.json({ observation }, { status: 201 });
}
