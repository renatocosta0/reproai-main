import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { canAccessCase } from "@/lib/clinician-scope";
import { loadPersonRecord, toAssessmentView } from "@/lib/person-record";
import { PASSIVE_CODES } from "@/lib/observation-analysis";

// GET /api/clinician/cases/:id — the longitudinal record for one care case
// (one individual, or two paired partners). Clinician only, and only for cases
// the clinician prescribed. Each member's data is shown only if that member
// has granted CLINICIAN_ACCESS; wearable readings also need WEARABLES.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session || session.role !== "CLINICIAN") {
      return NextResponse.json({ error: "Clinician access required" }, { status: 403 });
    }
    if (!(await canAccessCase(session.userId, params.id))) {
      return NextResponse.json({ error: "This case is not in your care list" }, { status: 403 });
    }

    const c = await prisma.couple.findUnique({
      where: { id: params.id },
      include: {
        patients: true,
        users: { where: { role: "PATIENT" }, select: { id: true, email: true, createdAt: true, consentAt: true } },
        followUps: { orderBy: { createdAt: "desc" } },
        invitations: { orderBy: { createdAt: "desc" }, take: 1 }
      }
    });
    if (!c) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const members = await Promise.all(
      c.users.map(async (u) => {
        const record = await loadPersonRecord(u.id, "CLINICIAN");
        const access = record?.consents.CLINICIAN_ACCESS.granted ?? false;
        const observations =
          access && record?.consents.WEARABLES.granted
            ? (await prisma.observation.findMany({ where: { userId: u.id, code: { notIn: [...PASSIVE_CODES] } }, orderBy: { effectiveAt: "desc" }, take: 120 })).map((o) => ({
                ...o,
                effectiveAt: o.effectiveAt.toISOString()
              }))
            : [];
        return {
          userId: u.id,
          email: u.email,
          joinedAt: u.createdAt,
          consentAt: u.consentAt,
          clinicianAccess: access,
          name: record?.profile?.name ?? null,
          sex: record?.profile?.sex ?? null,
          profile: access ? record?.profile ?? null : null,
          labs: access ? record?.labs ?? [] : [],
          options: access ? record?.options ?? [] : [],
          consents: record?.consents ?? null,
          observationsSummary: access ? record?.observationsSummary ?? null : null,
          observations
        };
      })
    );

    // Assessments for members who share with the clinician, plus joint ones.
    const visible = members.filter((m) => m.clinicianAccess).map((m) => m.userId);
    const preds = await prisma.prediction.findMany({
      where: {
        status: { in: ["DRAFT", "RELEASED"] },
        OR: [
          ...(visible.length ? [{ userId: { in: visible }, scope: "INDIVIDUAL" }] : []),
          ...(visible.length === c.users.length && c.users.length > 1 ? [{ coupleId: c.id, scope: "COUPLE" }] : [])
        ]
      },
      orderBy: { createdAt: "desc" },
      take: 40
    });

    await audit(session.userId, "case_viewed", `couple:${c.id}`);

    return NextResponse.json({
      id: c.id,
      createdAt: c.createdAt,
      isCouple: c.users.length > 1 || c.invitations[0]?.scope === "COUPLE",
      invitation: c.invitations[0]
        ? {
            scope: c.invitations[0].scope,
            status: c.invitations[0].status,
            notes: c.invitations[0].notes,
            email: c.invitations[0].email,
            partnerEmail: c.invitations[0].partnerEmail,
            createdAt: c.invitations[0].createdAt,
            acceptedAt: c.invitations[0].acceptedAt
          }
        : null,
      members,
      assessments: preds.length ? preds.map(toAssessmentView) : [],
      followUps: c.followUps
    });
  } catch (error: any) {
    console.error("[GET /api/clinician/cases/:id] error:", error);
    return NextResponse.json({ error: error?.message ?? "Failed to load case" }, { status: 500 });
  }
}
