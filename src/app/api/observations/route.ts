import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// FHIR-aligned observations (wearables or manually entered vitals).
// Supports individual-level and couple-level queries with full backwards compatibility.
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    const queryCoupleId = req.nextUrl.searchParams.get("coupleId");
    const queryUserId = req.nextUrl.searchParams.get("userId");

    const effectiveCoupleId = queryCoupleId ?? session?.coupleId ?? undefined;
    const effectiveUserId = queryUserId ?? (effectiveCoupleId ? undefined : session?.userId);

    if (!effectiveCoupleId && !effectiveUserId) {
      return NextResponse.json({ error: "coupleId or userId is required" }, { status: 400 });
    }

    const where: any = {};
    if (effectiveCoupleId) {
      where.coupleId = effectiveCoupleId;
    } else if (effectiveUserId) {
      where.userId = effectiveUserId;
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
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }
    const { code, value, unit } = body;
    const coupleId = body.coupleId ?? session?.coupleId ?? null;
    const userId = session?.userId ?? null;

    if (!code || typeof value !== "number") {
      return NextResponse.json(
        { error: "code and numeric value are required" },
        { status: 400 }
      );
    }
    const observation = await prisma.observation.create({
      data: {
        coupleId,
        userId,
        code,
        value,
        unit
      }
    });
    return NextResponse.json({ observation }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/observations] error:", error);
    return NextResponse.json({ error: error?.message ?? "Failed to create observation" }, { status: 500 });
  }
}
