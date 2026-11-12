// Population insight (Challenge 02, requirement R4): which groups would
// benefit from earlier advice. Built from the same deterministic pathway rules
// the patient and clinician see, so the numbers are explainable.
//
// Two scopes:
//  - Panel: the clinician's own patients who share their record (named, so the
//    clinician can act). Respects CLINICIAN_ACCESS.
//  - System: everyone across all clinics who opted in to POPULATION_ANALYTICS,
//    counts only, with small cells suppressed.

import { prisma } from "@/lib/db";
import { consentingUserIds } from "@/lib/consent";
import { evaluatePathways, type PathwayContext } from "@/lib/pathways";
import type { LabPoint } from "@/lib/labs";

export interface Cohort {
  id: string;
  title: string;
  why: string;
  action: string;
  rules: string[];
  source: string;
}

/** Cohorts are defined as sets of rule IDs from src/lib/pathways.ts. */
export const COHORTS: Cohort[] = [
  { id: "red-flags", title: "Red flags", why: "Irregular or absent periods, or a history that affects fertility", action: "Earlier specialist review, without waiting 12 months", rules: ["RF-CYCLE", "RF-HISTORY"], source: "Thiqa ART guideline; WHO 2025" },
  { id: "due-referral", title: "Due a specialist referral", why: "Trying ≥ 12 months, or > 35 and ≥ 6 months, or ≥ 40", action: "Refer both partners for assessment", rules: ["REF-12M", "REF-6M-35", "REF-40"], source: "WHO 2025; Thiqa ART guideline" },
  { id: "reduced-reserve", title: "Reduced ovarian reserve", why: "AMH < 1.1 ng/mL or AFC < 5", action: "Specialist discussion; preservation if not trying", rules: ["RES-LOW"], source: "Thiqa ART guideline; POSEIDON" },
  { id: "no-reserve-baseline", title: "No ovarian reserve baseline", why: "Women 30+ (or with family history of early menopause) without an AMH result", action: "Offer AMH testing with counselling", rules: ["TEST-AMH"], source: "ESHRE 2020; WHO 2025" },
  { id: "preservation-window", title: "In the preservation discussion window", why: "Not trying, 25–38, with interest, lower reserve or prior chemotherapy", action: "Preservation discussion (Thiqa social egg freezing pathway)", rules: ["PRES-DISCUSS"], source: "ESHRE 2020; Thiqa ART guideline" },
  { id: "male-factor", title: "Male factor not yet assessed or below reference", why: "Semen analysis missing while trying/paired, or below WHO reference", action: "Semen analysis or andrology referral", rules: ["TEST-SEMEN", "SEM-LOW"], source: "WHO 2025; WHO semen manual" },
  { id: "lifestyle", title: "Modifiable lifestyle factors", why: "Smoking, BMI 25–40, or under 7 hours' sleep", action: "Health optimisation support", rules: ["OPT-SMOKING", "OPT-WEIGHT", "BMI-35-40", "OPT-SLEEP"], source: "WHO 2025; Thiqa ART guideline" }
];

const SUPPRESS_BELOW = 5;

type UserWithData = Awaited<ReturnType<typeof loadUsers>>[number];

async function loadUsers(where: { coupleId?: { in: string[] }; id?: { in: string[] } }) {
  return prisma.user.findMany({
    where: { role: "PATIENT", ...where },
    include: { patientProfile: true, labResults: true, observations: { orderBy: { effectiveAt: "desc" }, take: 60 } }
  });
}

function contextFor(u: UserWithData): PathwayContext {
  const p = u.patientProfile;
  const labs: LabPoint[] = u.labResults.map((l) => ({
    id: l.id,
    code: l.code as LabPoint["code"],
    value: l.value,
    unit: l.unit,
    collectedAt: l.collectedAt.toISOString(),
    source: l.source as LabPoint["source"]
  }));
  const sleep = u.observations.filter((o) => o.code === "93832-4" || o.code.includes("sleep")).map((o) => o.value);
  return {
    sex: p?.sex === "female" || p?.sex === "male" ? p.sex : null,
    age: p?.age ?? null,
    bmi: p?.bmi ?? null,
    isPaired: false,
    tryingToConceive: p?.tryingToConceive ?? null,
    monthsTrying: p?.infertilityDurationMonths ?? null,
    cycleRegularity: p?.cycleRegularity ?? null,
    historyFlags: [...(p?.historyFlags ? (JSON.parse(p.historyFlags) as string[]) : []), ...(p?.pcosHistory ? ["PCOS"] : [])],
    familyEarlyMenopause: p?.familyEarlyMenopause ?? null,
    smoking: p?.smoking ?? null,
    preservationIntent: p?.preservationIntent ?? null,
    labs,
    amhPercentile: null,
    meanSleepHours: sleep.length ? sleep.reduce((a, b) => a + b, 0) / sleep.length : null,
    bbtMonophasic: false
  };
}

export interface PanelCohort extends Cohort {
  people: { userId: string; caseId: string | null; name: string; age: number | null; sex: string | null }[];
}

export async function panelInsights(caseIds: string[]): Promise<{ total: number; sharing: number; cohorts: PanelCohort[] }> {
  const users = await loadUsers({ coupleId: { in: caseIds } });
  const sharing = await consentingUserIds(users.map((u) => u.id), "CLINICIAN_ACCESS");
  const visible = users.filter((u) => sharing.has(u.id));
  const firedByUser = new Map(visible.map((u) => [u.id, new Set(evaluatePathways(contextFor(u)).map((o) => o.ruleId))]));
  return {
    total: users.length,
    sharing: visible.length,
    cohorts: COHORTS.map((c) => ({
      ...c,
      people: visible
        .filter((u) => c.rules.some((r) => firedByUser.get(u.id)!.has(r)))
        .map((u) => ({ userId: u.id, caseId: u.coupleId, name: u.patientProfile?.name ?? u.email, age: u.patientProfile?.age ?? null, sex: u.patientProfile?.sex ?? null }))
    }))
  };
}

export interface SystemCohort extends Cohort {
  count: number | null; // null = suppressed (< 5)
  bySex: { women: number | null; men: number | null };
}

export async function systemInsights(): Promise<{ consenting: number; suppressBelow: number; cohorts: SystemCohort[] }> {
  const all = await prisma.user.findMany({ where: { role: "PATIENT" }, select: { id: true } });
  const ids = [...(await consentingUserIds(all.map((u) => u.id), "POPULATION_ANALYTICS"))];
  const users = await loadUsers({ id: { in: ids } });
  const fired = users.map((u) => ({ sex: u.patientProfile?.sex ?? null, rules: new Set(evaluatePathways(contextFor(u)).map((o) => o.ruleId)) }));
  const cell = (n: number) => (n < SUPPRESS_BELOW ? null : n);
  return {
    consenting: users.length,
    suppressBelow: SUPPRESS_BELOW,
    cohorts: COHORTS.map((c) => {
      const inCohort = fired.filter((f) => c.rules.some((r) => f.rules.has(r)));
      return {
        ...c,
        count: cell(inCohort.length),
        bySex: { women: cell(inCohort.filter((f) => f.sex === "female").length), men: cell(inCohort.filter((f) => f.sex === "male").length) }
      };
    })
  };
}
