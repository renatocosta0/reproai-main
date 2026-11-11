import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";

// GET /api/clinician/cases/:id — full longitudinal record for one care case
// (a couple container: one individual, or two paired partners). Clinician only.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session || session.role !== "CLINICIAN") {
      return NextResponse.json({ error: "Clinician access required" }, { status: 403 });
    }

    const c = await prisma.couple.findUnique({
      where: { id: params.id },
      include: {
        patients: true,
        users: { select: { id: true, email: true, createdAt: true, consentAt: true } },
        followUps: { orderBy: { createdAt: "desc" } },
        invitations: { orderBy: { createdAt: "desc" }, take: 1 }
      }
    });
    if (!c) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    // Members' records may predate pairing and live under their earlier
    // container, so include anything owned by a current member as well.
    const memberIds = c.users.map((u) => u.id);
    const scope = { OR: [{ coupleId: c.id }, ...(memberIds.length ? [{ userId: { in: memberIds } }] : [])] };
    const [predictions, observations] = await Promise.all([
      prisma.prediction.findMany({ where: scope, orderBy: { createdAt: "desc" }, take: 30 }),
      prisma.observation.findMany({ where: scope, orderBy: { effectiveAt: "desc" }, take: 200 })
    ]);

    await audit(session.userId, "case_viewed", `couple:${c.id}`);

    return NextResponse.json({
      id: c.id,
      createdAt: c.createdAt,
      patients: c.patients,
      users: c.users,
      predictions: predictions.map((p) => ({ ...p, factors: p.factors ? JSON.parse(p.factors) : null })),
      observations,
      followUps: c.followUps,
      invitation: c.invitations[0]
        ? {
            scope: c.invitations[0].scope,
            status: c.invitations[0].status,
            notes: c.invitations[0].notes,
            createdAt: c.invitations[0].createdAt,
            acceptedAt: c.invitations[0].acceptedAt
          }
        : null
    });
  } catch (error: any) {
    console.error("[GET /api/clinician/cases/:id] error:", error);
    return NextResponse.json({ error: error?.message ?? "Failed to load case" }, { status: 500 });
  }
}
