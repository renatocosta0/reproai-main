// Server-side loader for one person's record: profile, labs with provenance,
// assessments, wearable summary, consents and pathway options. The patient
// portal and the clinician record both read from here so they agree.

import { prisma } from "@/lib/db";
import { getConsents, type ConsentMap } from "@/lib/consent";
import { evaluatePathways, type PathwayContext, type PathwayOption } from "@/lib/pathways";
import { LABS, type LabCode, type LabPoint } from "@/lib/labs";
import { analyzeBbt, isSleep, isTemperature, series, sleepStats } from "@/lib/observation-analysis";
import type { ObservationRecord } from "@/types/patient";

export interface AssessmentView {
  id: string;
  scope: string;
  status: string;
  probability: number;
  confidenceLow: number | null;
  confidenceHigh: number | null;
  tier: string | null;
  percentile: number | null;
  completeness: number | null;
  missingOptional: string[];
  evidenceStatus: string | null;
  preservationGuidance: string | null;
  factors: { feature: string; impact: number; direction?: string; shapley_value?: number }[] | null;
  inputs: Record<string, unknown> | null;
  modelVersion: string | null;
  clinicianNote: string | null;
  reviewedAt: string | null;
  userId: string | null;
  createdAt: string;
}

export interface PersonRecord {
  userId: string;
  email: string;
  profile: NonNullable<Awaited<ReturnType<typeof prisma.patient.findUnique>>> | null;
  labs: LabPoint[];
  assessments: AssessmentView[];
  observationsSummary: { temperatureReadings: number; sleepNights: number; meanSleepHours: number | null; bbtStatus: string; bbtShift: number };
  consents: ConsentMap;
  options: PathwayOption[];
  isPaired: boolean;
}

const json = <T,>(s: string | null | undefined, fallback: T): T => {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
};

export function toAssessmentView(p: Awaited<ReturnType<typeof prisma.prediction.findFirst>> & object): AssessmentView {
  return {
    id: p.id,
    scope: p.scope,
    status: p.status,
    probability: p.probability,
    confidenceLow: p.confidenceLow,
    confidenceHigh: p.confidenceHigh,
    tier: p.tier,
    percentile: p.percentile,
    completeness: p.completeness,
    missingOptional: json<string[]>(p.missingOptional, []),
    evidenceStatus: p.evidenceStatus,
    preservationGuidance: p.preservationGuidance,
    factors: json(p.factors, null),
    inputs: json(p.inputs, null),
    modelVersion: p.modelVersion,
    clinicianNote: p.clinicianNote,
    reviewedAt: p.reviewedAt ? p.reviewedAt.toISOString() : null,
    userId: p.userId,
    createdAt: p.createdAt.toISOString()
  };
}

/** Labs from LabResult; older profile values are included once, labelled with an undocumented source. */
async function loadLabs(userId: string, profile: PersonRecord["profile"]): Promise<LabPoint[]> {
  const rows = await prisma.labResult.findMany({ where: { userId }, orderBy: { collectedAt: "asc" } });
  const labs: LabPoint[] = rows.map((r) => ({
    id: r.id,
    code: r.code as LabCode,
    value: r.value,
    unit: r.unit,
    collectedAt: r.collectedAt.toISOString(),
    source: r.source as LabPoint["source"]
  }));
  if (profile) {
    const legacy: [LabCode, number | null][] = [
      ["AMH", profile.amh],
      ["AFC", profile.antralFollicleCount],
      ["SPERM_CONCENTRATION", profile.spermCount]
    ];
    for (const [code, value] of legacy) {
      if (value !== null && !labs.some((l) => l.code === code)) {
        labs.push({ id: `profile-${code}`, code, value, unit: LABS[code].unit, collectedAt: profile.createdAt.toISOString(), source: "PROFILE" });
      }
    }
  }
  return labs;
}

/**
 * @param viewer "PATIENT" sees only released assessments; "CLINICIAN" sees drafts too.
 */
export async function loadPersonRecord(userId: string, viewer: "PATIENT" | "CLINICIAN"): Promise<PersonRecord | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { patientProfile: true } });
  if (!user) return null;
  const profile = user.patientProfile;
  const consents = await getConsents(userId);

  // Partner (for pairing context and joint assessments)
  const partner = user.coupleId
    ? await prisma.user.findFirst({ where: { coupleId: user.coupleId, id: { not: userId }, role: "PATIENT" } })
    : null;

  const labs = consents.LAB_RESULTS.granted ? await loadLabs(userId, profile) : [];

  const statusFilter = viewer === "PATIENT" ? { status: "RELEASED" } : { status: { in: ["DRAFT", "RELEASED"] } };
  const preds = await prisma.prediction.findMany({
    where: {
      AND: [
        statusFilter,
        { OR: [{ userId, scope: "INDIVIDUAL" }, ...(user.coupleId && partner ? [{ coupleId: user.coupleId, scope: "COUPLE" }] : [])] }
      ]
    },
    orderBy: { createdAt: "desc" },
    take: 30
  });

  const obsRows = consents.WEARABLES.granted
    ? await prisma.observation.findMany({ where: { userId }, orderBy: { effectiveAt: "desc" }, take: 120 })
    : [];
  const obs: ObservationRecord[] = obsRows.map((o) => ({ ...o, effectiveAt: o.effectiveAt.toISOString() }));
  const temps = series(obs, isTemperature);
  const bbt = analyzeBbt(temps);
  const sleep = sleepStats(series(obs, isSleep));

  const assessments = preds.map(toAssessmentView);
  const latestIndividual = assessments.find((a) => a.scope === "INDIVIDUAL" && a.status === "RELEASED");

  const ctx: PathwayContext = {
    sex: profile?.sex === "female" || profile?.sex === "male" ? profile.sex : null,
    age: profile?.age ?? null,
    bmi: profile?.bmi ?? null,
    isPaired: Boolean(partner),
    tryingToConceive: profile?.tryingToConceive ?? null,
    monthsTrying: profile?.infertilityDurationMonths ?? null,
    cycleRegularity: profile?.cycleRegularity ?? null,
    historyFlags: [...json<string[]>(profile?.historyFlags, []), ...(profile?.pcosHistory ? ["PCOS"] : [])],
    familyEarlyMenopause: profile?.familyEarlyMenopause ?? null,
    smoking: profile?.smoking ?? null,
    preservationIntent: profile?.preservationIntent ?? null,
    labs,
    amhPercentile: latestIndividual?.percentile ?? null,
    meanSleepHours: sleep?.mean ?? null,
    bbtMonophasic: bbt.status === "MONOPHASIC"
  };

  return {
    userId,
    email: user.email,
    profile,
    labs,
    assessments,
    observationsSummary: {
      temperatureReadings: temps.length,
      sleepNights: sleep?.nights ?? 0,
      meanSleepHours: sleep ? Number(sleep.mean.toFixed(2)) : null,
      bbtStatus: bbt.status,
      bbtShift: bbt.shift
    },
    consents,
    options: evaluatePathways(ctx),
    isPaired: Boolean(partner)
  };
}
