// Evidence of earlier action (Challenge 02, requirement R6).
//
// Two clearly separated parts:
//  1. Live pathway metrics computed from the app's own records for a
//     clinician's panel (alerts, follow-up transitions in the audit log,
//     released assessments, baseline coverage), with Wilson 95% intervals.
//  2. A simulated cohort (fixed seed) that checks the *pipeline and reporting*:
//     false reassurance of the reduced-reserve rule under AMH test variability,
//     and a pipeline self-check of the model against an age-based reference curve
//     that shares some of its assumptions (not an independent validation). It is labelled synthetic everywhere and makes no clinical claim.

import { prisma } from "@/lib/db";
import { predictBatch } from "@/lib/ml-client";
import { evaluatePathways } from "@/lib/pathways";
import type { LabPoint } from "@/lib/labs";
import { PASSIVE_CODES, analyzeBbt, isSleep, isTemperature, sleepStats, type Point } from "@/lib/observation-analysis";

// ── Statistics ────────────────────────────────────────────────────────────────

export interface Proportion {
  numerator: number;
  denominator: number;
  rate: number | null;
  low: number | null;
  high: number | null;
}

/** Wilson score interval for a binomial proportion (95%). */
export function wilson(k: number, n: number, z = 1.96): Proportion {
  if (n === 0) return { numerator: k, denominator: n, rate: null, low: null, high: null };
  const p = k / n;
  const denom = 1 + (z * z) / n;
  const centre = (p + (z * z) / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom;
  return { numerator: k, denominator: n, rate: p, low: Math.max(0, centre - half), high: Math.min(1, centre + half) };
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const DAY = 86_400_000;

// ── 1. Live pathway metrics ───────────────────────────────────────────────────

export interface GroupRow {
  group: string;
  people: number;
  baseline: Proportion;
  flagged: number;
  actedOn: Proportion;
}

export interface LiveMetrics {
  people: number;
  signals: number;
  daysSignalToAppointment: { median: number | null; n: number };
  daysSignalToClosed: { median: number | null; n: number };
  signalsProgressed: Proportion;
  baselineCoverage: Proportion;
  intakeCompletion: Proportion;
  flaggedForReferral: number;
  referralActedOn: Proportion;
  daysAssessmentToRelease: { median: number | null; n: number };
  byGroup: GroupRow[];
}

function ageBand(age: number | null): string {
  if (age === null) return "Age not recorded";
  if (age < 30) return "Under 30";
  if (age < 35) return "30–34";
  if (age < 40) return "35–39";
  return "40 and over";
}

export async function liveMetrics(caseIds: string[]): Promise<LiveMetrics> {
  const users = await prisma.user.findMany({
    where: { coupleId: { in: caseIds }, role: "PATIENT" },
    include: {
      patientProfile: true,
      labResults: true,
      observations: { where: { code: { notIn: [...PASSIVE_CODES] } }, orderBy: { effectiveAt: "desc" }, take: 240 },
      predictions: { where: { scope: "INDIVIDUAL", status: "RELEASED" }, orderBy: { createdAt: "desc" }, take: 1 }
    }
  });
  // Alerts closed automatically by the wearable analysis are not clinician
  // action, so they are left out of the signal → action metrics.
  const allFollowUps = await prisma.followUp.findMany({ where: { coupleId: { in: caseIds } } });
  const autoResolved = allFollowUps.length
    ? new Set(
        (
          await prisma.auditLog.findMany({
            where: { action: "follow_up_auto_resolved", OR: allFollowUps.map((f) => ({ resource: { startsWith: `follow_up:${f.id}:` } })) },
            select: { resource: true }
          })
        ).map((a) => a.resource.split(":")[1])
      )
    : new Set<string>();
  const followUps = allFollowUps.filter((f) => !autoResolved.has(f.id));
  const transitions = followUps.length
    ? await prisma.auditLog.findMany({
        where: { action: "status_transition", OR: followUps.map((f) => ({ resource: { startsWith: `follow_up:${f.id}:` } })) },
        orderBy: { createdAt: "asc" }
      })
    : [];
  const preds = await prisma.prediction.findMany({
    where: { coupleId: { in: caseIds }, status: "RELEASED", reviewedAt: { not: null }, createdById: { not: null } }
  });

  // Signal → appointment / closure, from audit-logged transitions.
  const toAppt: number[] = [];
  const toClosed: number[] = [];
  let progressed = 0;
  for (const f of followUps) {
    const t = transitions.filter((x) => x.resource.startsWith(`follow_up:${f.id}:`));
    const appt = t.find((x) => /:(APPOINTMENT_SCHEDULED|IN_FOLLOW_UP|CLOSED)$/.test(x.resource));
    const closed = t.find((x) => x.resource.endsWith(":CLOSED"));
    if (appt) toAppt.push((+appt.createdAt - +f.createdAt) / DAY);
    if (closed) toClosed.push((+closed.createdAt - +f.createdAt) / DAY);
    if (appt || f.status !== "ALERT_RAISED") progressed++;
  }

  // Per person: baseline on record, pathway flag, acted on.
  const perPerson = users.map((u) => {
    const p = u.patientProfile;
    const labs: LabPoint[] = u.labResults.map((l) => ({ id: l.id, code: l.code as LabPoint["code"], value: l.value, unit: l.unit, collectedAt: l.collectedAt.toISOString(), source: l.source as LabPoint["source"] }));
    const sex = p?.sex === "female" || p?.sex === "male" ? p.sex : null;
    const hasBaseline =
      sex === "female" ? labs.some((l) => l.code === "AMH") || p?.amh != null : sex === "male" ? labs.some((l) => l.code === "SPERM_CONCENTRATION") || p?.spermCount != null : false;
    const oldestFirst = [...u.observations].reverse();
    const toPoint = (o: { effectiveAt: Date; value: number }): Point => ({ date: new Date(o.effectiveAt), value: o.value });
    const bbt = analyzeBbt(oldestFirst.filter((o) => isTemperature(o.code)).map(toPoint));
    const sleep = sleepStats(oldestFirst.filter((o) => isSleep(o.code)).map(toPoint));
    const options = evaluatePathways({
      sex,
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
      amhPercentile: u.predictions[0]?.percentile ?? null,
      meanSleepHours: sleep?.mean ?? null,
      bbtMonophasic: bbt.status === "MONOPHASIC"
    });
    const flagged = options.some((o) => o.priority === 1 && (o.kind === "REFER" || o.kind === "RED_FLAG"));
    const caseFollowUps = followUps.filter((f) => f.coupleId === u.coupleId);
    const actedOn = flagged && caseFollowUps.some((f) => f.status !== "ALERT_RAISED");
    return { group: `${sex === "female" ? "Women" : sex === "male" ? "Men" : "Sex not recorded"} · ${ageBand(p?.age ?? null)}`, hasBaseline, flagged, actedOn, intake: Boolean(p?.intakeCompletedAt) };
  });

  const groups = Array.from(new Set(perPerson.map((x) => x.group))).sort();
  const byGroup: GroupRow[] = groups.map((g) => {
    const rows = perPerson.filter((x) => x.group === g);
    const flagged = rows.filter((x) => x.flagged);
    return {
      group: g,
      people: rows.length,
      baseline: wilson(rows.filter((x) => x.hasBaseline).length, rows.length),
      flagged: flagged.length,
      actedOn: wilson(flagged.filter((x) => x.actedOn).length, flagged.length)
    };
  });

  const flagged = perPerson.filter((x) => x.flagged);
  return {
    people: users.length,
    signals: followUps.length,
    daysSignalToAppointment: { median: median(toAppt), n: toAppt.length },
    daysSignalToClosed: { median: median(toClosed), n: toClosed.length },
    signalsProgressed: wilson(progressed, followUps.length),
    baselineCoverage: wilson(perPerson.filter((x) => x.hasBaseline).length, perPerson.length),
    intakeCompletion: wilson(perPerson.filter((x) => x.intake).length, perPerson.length),
    flaggedForReferral: flagged.length,
    referralActedOn: wilson(flagged.filter((x) => x.actedOn).length, flagged.length),
    daysAssessmentToRelease: {
      median: median(preds.map((p) => (+p.reviewedAt! - +p.createdAt) / DAY)),
      n: preds.length
    },
    byGroup
  };
}

// ── 2. Simulated cohort ───────────────────────────────────────────────────────

/** Deterministic PRNG so every run of the simulation is identical. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function normal(rand: () => number): number {
  const u = Math.max(rand(), 1e-12);
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Reference curve for a PIPELINE SELF-CHECK, not an independent validation:
 * the simulated AMH below reuses the model's typical-AMH-for-age formula, so
 * agreement with the model would be partly circular. Approximate live-birth
 * rate per IVF cycle by age band, in the shape of published national registry
 * summaries, with a modest adjustment for very low ovarian reserve.
 */
function referenceRate(age: number, trueAmh: number): number {
  const base = age < 35 ? 0.33 : age < 38 ? 0.26 : age < 40 ? 0.19 : age < 43 ? 0.11 : 0.04;
  return Math.min(0.6, base * (trueAmh < 0.5 ? 0.6 : trueAmh < 1.1 ? 0.8 : 1.0));
}

export interface SimulationReport {
  n: number;
  seed: number;
  amhTestCv: number;
  reserveRule: {
    referencePositive: number;
    sensitivity: Proportion;
    specificity: Proportion;
    falseReassurance: Proportion;
    falseReferral: Proportion;
  };
  calibration: {
    bins: { predictedMean: number; observed: Proportion }[];
    brier: number;
    calibrationInTheLarge: number;
    meanPredicted: number;
    meanObserved: number;
  };
}

export async function simulationReport(n = 400, seed = 2026): Promise<SimulationReport> {
  const rand = mulberry32(seed);
  const AMH_CV = 0.2; // within-person AMH test variability (coefficient of variation)
  const records = Array.from({ length: n }, () => {
    const age = Math.round(25 + rand() * 19); // 25–44
    const expected = Math.max(0.4, 3.2 * Math.exp(-0.075 * Math.max(0, age - 25)));
    const trueAmh = Math.max(0.05, expected * Math.exp(0.6 * normal(rand)));
    const measuredAmh = Math.max(0.05, trueAmh * Math.exp(AMH_CV * normal(rand)));
    const bmi = Math.round((19 + rand() * 16) * 10) / 10;
    const outcome = rand() < referenceRate(age, trueAmh) ? 1 : 0;
    return { age, trueAmh, measuredAmh: Math.round(measuredAmh * 100) / 100, bmi, outcome };
  });

  // Reduced-reserve rule (AMH < 1.1) applied to the measured value vs the true value.
  const refPos = records.filter((r) => r.trueAmh < 1.1);
  const refNeg = records.filter((r) => r.trueAmh >= 1.1);
  const tp = refPos.filter((r) => r.measuredAmh < 1.1).length;
  const tn = refNeg.filter((r) => r.measuredAmh >= 1.1).length;
  const flaggedNeg = refNeg.length - tn;
  const flaggedAll = tp + flaggedNeg;

  // Calibration of the model (individual female scope) against the reference outcomes.
  const results = await predictBatch(
    records.map((r) => ({ scope: "INDIVIDUAL", sex: "female", age: r.age, amh: r.measuredAmh, bmi: r.bmi, pcos_history: false, infertility_duration_months: 0, antral_follicle_count: null }))
  );
  const scored = records
    .map((r, i) => ({ ...r, p: results[i].probability !== null ? results[i].probability! / 100 : null }))
    .filter((r): r is typeof r & { p: number } => r.p !== null)
    .sort((a, b) => a.p - b.p);
  const bins: SimulationReport["calibration"]["bins"] = [];
  const binSize = Math.ceil(scored.length / 10);
  for (let i = 0; i < scored.length; i += binSize) {
    const chunk = scored.slice(i, i + binSize);
    bins.push({
      predictedMean: chunk.reduce((a, r) => a + r.p, 0) / chunk.length,
      observed: wilson(chunk.filter((r) => r.outcome === 1).length, chunk.length)
    });
  }
  const meanPredicted = scored.reduce((a, r) => a + r.p, 0) / scored.length;
  const meanObserved = scored.reduce((a, r) => a + r.outcome, 0) / scored.length;

  return {
    n,
    seed,
    amhTestCv: AMH_CV,
    reserveRule: {
      referencePositive: refPos.length,
      sensitivity: wilson(tp, refPos.length),
      specificity: wilson(tn, refNeg.length),
      falseReassurance: wilson(refPos.length - tp, refPos.length),
      falseReferral: wilson(flaggedNeg, flaggedAll)
    },
    calibration: {
      bins,
      brier: scored.reduce((a, r) => a + (r.p - r.outcome) ** 2, 0) / scored.length,
      calibrationInTheLarge: meanObserved - meanPredicted,
      meanPredicted,
      meanObserved
    }
  };
}
