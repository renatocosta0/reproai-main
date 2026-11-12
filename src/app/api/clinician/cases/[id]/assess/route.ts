import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { canAccessCase } from "@/lib/clinician-scope";
import { hasConsent } from "@/lib/consent";
import { predict, type PredictionInput } from "@/lib/ml-client";
import { latestByCode, type LabCode, type LabPoint } from "@/lib/labs";
import { toAssessmentView } from "@/lib/person-record";

// POST /api/clinician/cases/:id/assess  { userId } (individual) | { scope: "COUPLE" }
//
// Gated pipeline: consent → data completeness (ML service) → calculation →
// DRAFT. Inputs come only from the record (clinician-verified labs and the
// profile), each with its provenance. Nothing is typed in or assumed here.
// The draft is invisible to the patient until a clinician releases it.

type Provenanced = { value: number | boolean; source: string; date?: string };

async function memberInputs(userId: string) {
  const [profile, labRows] = await Promise.all([
    prisma.patient.findUnique({ where: { userId } }),
    prisma.labResult.findMany({ where: { userId } })
  ]);
  const labs: LabPoint[] = labRows.map((r) => ({
    id: r.id,
    code: r.code as LabCode,
    value: r.value,
    unit: r.unit,
    collectedAt: r.collectedAt.toISOString(),
    source: r.source as LabPoint["source"]
  }));
  const latest = latestByCode(labs);
  const lab = (code: LabCode): Provenanced | undefined =>
    latest[code] ? { value: latest[code]!.value, source: latest[code]!.source, date: latest[code]!.collectedAt } : undefined;
  const self = (v: number | boolean | null | undefined): Provenanced | undefined =>
    v === null || v === undefined ? undefined : { value: v, source: "SELF_REPORTED" };

  const flags: string[] = profile?.historyFlags ? JSON.parse(profile.historyFlags) : [];
  const pcos = profile?.pcosHistory ?? (profile?.intakeCompletedAt ? flags.includes("PCOS") : null);
  const duration = profile?.infertilityDurationMonths ?? (profile?.tryingToConceive === false ? 0 : null);

  return {
    sex: profile?.sex ?? null,
    age: self(profile?.age),
    bmi: self(profile?.bmi),
    amh: lab("AMH"),
    afc: lab("AFC"),
    sperm: lab("SPERM_CONCENTRATION"),
    pcos: self(pcos),
    duration: self(duration),
    priorCycles: self(profile?.priorCycles)
  };
}

const val = (p?: Provenanced) => (p ? (p.value as never) : null);

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session || session.role !== "CLINICIAN") {
      return NextResponse.json({ error: "Clinician access required" }, { status: 403 });
    }
    if (!(await canAccessCase(session.userId, params.id))) {
      return NextResponse.json({ error: "This case is not in your care list" }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const members = await prisma.user.findMany({ where: { coupleId: params.id, role: "PATIENT" } });

    // Gate 1: consent
    for (const m of members) {
      if (!(await hasConsent(m.id, "CLINICIAN_ACCESS"))) {
        return NextResponse.json({ error: `${m.email} has not shared their record with the care team.` }, { status: 403 });
      }
    }

    let input: PredictionInput;
    let used: Record<string, Provenanced | undefined>;
    let ownerId: string;
    let scope: "INDIVIDUAL" | "COUPLE";

    if (body?.scope === "COUPLE") {
      if (members.length < 2) {
        return NextResponse.json({ error: "A joint assessment needs two linked partners." }, { status: 400 });
      }
      for (const m of members) {
        if (!(await hasConsent(m.id, "PARTNER_SHARING"))) {
          return NextResponse.json({ error: `${m.email} has not agreed to joint assessments with their partner.` }, { status: 403 });
        }
      }
      const withInputs = await Promise.all(members.map(async (m) => ({ m, i: await memberInputs(m.id) })));
      const f = withInputs.find((x) => x.i.sex === "female");
      const male = withInputs.find((x) => x.i.sex === "male");
      if (!f || !male) {
        return NextResponse.json({ error: "A joint assessment needs one female and one male partner record." }, { status: 400 });
      }
      used = { age: f.i.age, amh: f.i.amh, sperm_count: male.i.sperm, bmi: f.i.bmi, pcos_history: f.i.pcos, infertility_duration_months: f.i.duration, prior_cycles: f.i.priorCycles };
      input = {
        scope: "COUPLE",
        sex: "female",
        age: val(used.age),
        amh: val(used.amh),
        sperm_count: val(used.sperm_count),
        bmi: val(used.bmi),
        pcos_history: val(used.pcos_history),
        infertility_duration_months: val(used.infertility_duration_months),
        prior_cycles: val(used.prior_cycles)
      };
      ownerId = f.m.id;
      scope = "COUPLE";
    } else {
      const member = members.find((m) => m.id === body?.userId);
      if (!member) {
        return NextResponse.json({ error: "Choose a member of this case." }, { status: 400 });
      }
      const i = await memberInputs(member.id);
      if (i.sex !== "female" && i.sex !== "male") {
        return NextResponse.json({ error: "Record the patient's biological sex first." }, { status: 400 });
      }
      used =
        i.sex === "female"
          ? { age: i.age, amh: i.amh, antral_follicle_count: i.afc, bmi: i.bmi, pcos_history: i.pcos, infertility_duration_months: i.duration }
          : { age: i.age, sperm_count: i.sperm, bmi: i.bmi };
      input = {
        scope: "INDIVIDUAL",
        sex: i.sex,
        age: val(used.age),
        amh: val(used.amh),
        antral_follicle_count: val(used.antral_follicle_count),
        sperm_count: val(used.sperm_count),
        bmi: val(used.bmi),
        pcos_history: val(used.pcos_history),
        infertility_duration_months: val(used.infertility_duration_months)
      };
      ownerId = member.id;
      scope = "INDIVIDUAL";
    }

    // Gates 2–3: data completeness and calculation (in the ML service)
    const result = await predict(input);
    await audit(session.userId, "assessment_run", `case:${params.id}:scope:${scope}:status:${result.status}`);

    if (result.status === "insufficient_data" || result.probability === null) {
      return NextResponse.json({
        status: "insufficient_data",
        missingRequired: result.missing_required,
        missingOptional: result.missing_optional,
        completeness: result.completeness,
        message: result.disclaimer
      });
    }

    const pred = await prisma.prediction.create({
      data: {
        userId: ownerId,
        coupleId: params.id,
        scope,
        status: "DRAFT",
        probability: result.probability,
        confidenceLow: result.confidence_low,
        confidenceHigh: result.confidence_high,
        tier: result.tier ?? null,
        preservationGuidance: result.preservation_guidance ?? null,
        factors: JSON.stringify(result.factors),
        modelVersion: result.model_version,
        completeness: result.completeness,
        percentile: result.age_adjusted_percentile ?? null,
        inputs: JSON.stringify(Object.fromEntries(Object.entries(used).filter(([, v]) => v !== undefined))),
        missingOptional: JSON.stringify(result.missing_optional),
        evidenceStatus: result.evidence_status,
        createdById: session.userId
      }
    });
    return NextResponse.json({ status: "ok", assessment: toAssessmentView(pred), disclaimer: result.disclaimer }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/clinician/cases/:id/assess] error:", error);
    const unreachable = /fetch failed|ECONNREFUSED|ML service/i.test(error?.message ?? "");
    return NextResponse.json(
      { error: unreachable ? "The assessment service is not reachable right now." : error?.message ?? "Assessment failed" },
      { status: unreachable ? 502 : 500 }
    );
  }
}
