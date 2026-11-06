import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// FHIR-aligned observations (e.g. wearable or manually entered vitals).
// Persists only real values supplied by the client.
export async function GET(req: NextRequest) {
  try {
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
  } catch (error: any) {
    console.error("[GET /api/observations] error:", error);
    return NextResponse.json({ error: error?.message ?? "Failed to fetch observations" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }
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
  } catch (error: any) {
    console.error("[POST /api/observations] error:", error);
    return NextResponse.json({ error: error?.message ?? "Failed to create observation" }, { status: 500 });
  }
}
