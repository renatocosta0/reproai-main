import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// Lists patients. Supports filtering by coupleId or userId.
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    const coupleId = req.nextUrl.searchParams.get("coupleId");
    const userId = req.nextUrl.searchParams.get("userId");

    const where: any = {};
    if (coupleId) where.coupleId = coupleId;
    if (userId) where.userId = userId;

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

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }

    const coupleId = body.coupleId ?? session?.coupleId ?? null;
    const userId = body.userId ?? session?.userId ?? null;

    const patient = await prisma.patient.create({
      data: {
        ...body,
        coupleId,
        userId
      }
    });
    return NextResponse.json({ patient }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/patients] error:", error);
    return NextResponse.json({ error: error?.message ?? "Failed to save patient" }, { status: 500 });
  }
}
