// Menstrual cycle engine (pure functions, shared by server and screens).
//
// Evidence status of each rule is stated next to it:
//  [Validated]   FIGO AUB System 1 (2018) normal limits; Roetzer / Sensiplan
//                3-over-6 temperature rule; fertile window O-5..O+1 (Wilcox
//                1995, ACOG); short luteal phase < 10 days (ASRM 2012).
//  [Heuristic]   symptom-based ovulation estimates (LH, mucus peak), the
//                exponential average of cycle length, the PMS pattern check
//                (ACOG timing criteria, shown as a pattern, never a diagnosis).
// Dates are calendar days "YYYY-MM-DD" (UTC midnight), so time zones never
// move a log to another day.

import { FEVER_THRESHOLD_C, findRoetzerShift, type Point } from "./observation-analysis";

export const FLOWS = ["NONE", "SPOTTING", "LIGHT", "MEDIUM", "HEAVY"] as const;
export const MUCUS = ["DRY", "STICKY", "CREAMY", "WATERY", "EGG_WHITE"] as const;
export const LH_TESTS = ["NOT_TAKEN", "NEGATIVE", "POSITIVE", "PEAK"] as const;
export const CONFOUNDERS = ["NONE", "FEVER", "ILLNESS", "POOR_SLEEP", "ALCOHOL", "TRAVEL"] as const;
export const SYMPTOMS = ["CRAMPS", "BLOATING", "HEADACHE", "BREAST_TENDERNESS", "BACK_PAIN", "ACNE", "FATIGUE", "NAUSEA", "DYSPEPSIA", "PMS"] as const;
export const MOODS = ["CALM", "HAPPY", "ANXIOUS", "IRRITABLE", "SAD", "FATIGUED"] as const;
export const TRACKING_MODES = ["TRYING_TO_CONCEIVE", "HEALTH_TRACKING", "HORMONAL_CONTRACEPTION", "POSTPARTUM", "PERIMENOPAUSE"] as const;

export type Flow = (typeof FLOWS)[number];
export type Mucus = (typeof MUCUS)[number];
export type LhTest = (typeof LH_TESTS)[number];
export type Confounder = (typeof CONFOUNDERS)[number];
export type Symptom = (typeof SYMPTOMS)[number];
export type Mood = (typeof MOODS)[number];
export type TrackingMode = (typeof TRACKING_MODES)[number];

/** Modes in which ovulation predictions and anovulation alerts are paused. */
export const PAUSED_MODES: TrackingMode[] = ["HORMONAL_CONTRACEPTION", "POSTPARTUM", "PERIMENOPAUSE"];

export interface DayLog {
  date: string;
  flow?: Flow | null;
  mucus?: Mucus | null;
  lh?: LhTest | null;
  bbt?: number | null;
  confounder?: Confounder | null;
  sleepMinutes?: number | null;
  waterMl?: number | null;
  symptoms?: string[];
  mood?: string[];
}

export interface CycleInput {
  id?: string;
  startDate: string;
  /** Start of the next period, when known (cycle completed). */
  nextStartDate?: string | null;
}

// ── Calendar helpers ──────────────────────────────────────────────────────────

const DAY_MS = 86_400_000;
export const dayKey = (d: Date | string): string => (typeof d === "string" ? d.slice(0, 10) : d.toISOString().slice(0, 10));
export const toDate = (key: string): Date => new Date(`${key.slice(0, 10)}T00:00:00.000Z`);
export const addDays = (key: string, n: number): string => dayKey(new Date(toDate(key).getTime() + n * DAY_MS));
export const diffDays = (a: string, b: string): number => Math.round((toDate(a).getTime() - toDate(b).getTime()) / DAY_MS);
/** Cycle day of `date` in a cycle starting `start` (day 1 = start). */
export const cycleDay = (start: string, date: string): number => diffDays(date, start) + 1;

const isBleeding = (f?: Flow | null) => f === "LIGHT" || f === "MEDIUM" || f === "HEAVY";
const isFertileMucus = (m?: Mucus | null) => m === "WATERY" || m === "EGG_WHITE";
const isLhPositive = (t?: LhTest | null) => t === "POSITIVE" || t === "PEAK";

function logsBetween(logs: DayLog[], from: string, toExclusive: string | null): DayLog[] {
  return logs
    .filter((l) => l.date >= from && (toExclusive === null || l.date < toExclusive))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ── Period length ─────────────────────────────────────────────────────────────

/** Days of real flow from day 1 (a single dry day inside the period is bridged). Spotting does not count. */
export function periodLength(start: string, logs: DayLog[]): number | null {
  const byDate = new Map(logs.map((l) => [l.date, l]));
  if (!isBleeding(byDate.get(start)?.flow) && !byDate.has(start)) return null;
  let last = 0;
  let gap = 0;
  for (let d = 0; d < 15; d++) {
    const log = byDate.get(addDays(start, d));
    if (isBleeding(log?.flow) || (d === 0 && !log?.flow)) {
      last = d + 1;
      gap = 0;
    } else if (++gap > 1) break;
  }
  return last || null;
}

// ── Ovulation (temperature, LH, mucus) ────────────────────────────────────────

export type OvulationMethod = "BBT_ROETZER" | "LH_SURGE" | "MUCUS_PEAK" | "CALENDAR" | "UNCONFIRMED";

export interface OvulationResult {
  date: string | null;
  method: OvulationMethod;
  /** confirmed = retrospective temperature rule; probable = LH; possible = mucus only. */
  confidence: "confirmed" | "probable" | "possible" | "none";
  bbtRiseDate: string | null;
  coverline: number | null;
  lhPositiveDate: string | null;
  mucusPeakDate: string | null;
  validTemperatures: number;
  /** LH / mucus agree with the temperature rule within 2 days. */
  corroborated: boolean;
}

/** Temperatures for one cycle, leaving out fever readings and days marked with a confounder. */
export function cycleTemperatures(start: string, end: string | null, logs: DayLog[], temps: Point[]): { date: string; value: number }[] {
  const confounded = new Set(logs.filter((l) => l.confounder && l.confounder !== "NONE").map((l) => l.date));
  const byDay = new Map<string, number>();
  for (const l of logs) if (typeof l.bbt === "number") byDay.set(l.date, l.bbt);
  for (const p of temps) {
    const k = dayKey(p.date);
    if (!byDay.has(k)) byDay.set(k, p.value);
  }
  return [...byDay.entries()]
    .filter(([d, v]) => d >= start && (end === null || d < end) && v < FEVER_THRESHOLD_C && !confounded.has(d))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }));
}

export function detectOvulation(cycle: CycleInput, logs: DayLog[], temps: Point[]): OvulationResult {
  const end = cycle.nextStartDate ?? null;
  const inCycle = logsBetween(logs, cycle.startDate, end);
  const t = cycleTemperatures(cycle.startDate, end, logs, temps);
  const rise = findRoetzerShift(t.map((x) => x.value));
  const bbtRiseDate = rise ? t[rise.index].date : null;

  // LH: first positive test of the last surge in the cycle.
  let lhPositiveDate: string | null = null;
  for (let i = inCycle.length - 1; i >= 0; i--) {
    if (isLhPositive(inCycle[i].lh)) {
      lhPositiveDate = inCycle[i].date;
      while (i > 0 && isLhPositive(inCycle[i - 1].lh) && diffDays(inCycle[i].date, inCycle[i - 1].date) === 1) lhPositiveDate = inCycle[--i].date;
      break;
    }
  }

  // Mucus peak (Billings): last day of fertile-type mucus, confirmed by a later non-fertile observation.
  let mucusPeakDate: string | null = null;
  for (let i = 0; i < inCycle.length; i++) {
    if (!isFertileMucus(inCycle[i].mucus)) continue;
    const later = inCycle.slice(i + 1).find((l) => l.mucus);
    if (later && !isFertileMucus(later.mucus)) mucusPeakDate = inCycle[i].date;
  }

  const base = { bbtRiseDate, coverline: rise?.coverline ?? null, lhPositiveDate, mucusPeakDate, validTemperatures: t.length };
  if (bbtRiseDate) {
    const date = addDays(bbtRiseDate, -1);
    const near = (d: string | null, guess: string) => d !== null && Math.abs(diffDays(d, guess)) <= 2;
    const corroborated = near(lhPositiveDate ? addDays(lhPositiveDate, 1) : null, date) || near(mucusPeakDate, date);
    return { ...base, date, method: "BBT_ROETZER", confidence: "confirmed", corroborated };
  }
  if (lhPositiveDate) return { ...base, date: addDays(lhPositiveDate, 1), method: "LH_SURGE", confidence: "probable", corroborated: false };
  if (mucusPeakDate) return { ...base, date: mucusPeakDate, method: "MUCUS_PEAK", confidence: "possible", corroborated: false };
  return { ...base, date: null, method: "UNCONFIRMED", confidence: "none", corroborated: false };
}

// ── Completed-cycle summary ───────────────────────────────────────────────────

export interface CycleSummary {
  id?: string;
  startDate: string;
  nextStartDate: string | null;
  lengthDays: number | null;
  periodDays: number | null;
  ovulation: OvulationResult;
  lutealDays: number | null;
  regularity: "REGULAR" | "SHORT" | "LONG" | "PROLONGED_BLEEDING" | null;
  /** ≥ 10 valid temperatures and no confirmed rise: possible anovulatory cycle. */
  noRiseWithData: boolean;
  status: "OPEN" | "COMPLETED";
}

export const FIGO = { shortCycle: 24, longCycle: 38, prolongedBleeding: 8, amenorrhoeaDays: 90 } as const;
export const SHORT_LUTEAL_DAYS = 10;
const MIN_TEMPS_FOR_JUDGEMENT = 10;

export function summariseCycle(cycle: CycleInput, logs: DayLog[], temps: Point[]): CycleSummary {
  const end = cycle.nextStartDate ?? null;
  const lengthDays = end ? diffDays(end, cycle.startDate) : null;
  const periodDays = periodLength(cycle.startDate, logs);
  const ovulation = detectOvulation(cycle, logs, temps);
  const lutealDays = end && ovulation.date && ovulation.confidence !== "possible" ? diffDays(end, ovulation.date) : null;
  const regularity =
    periodDays !== null && periodDays > FIGO.prolongedBleeding
      ? "PROLONGED_BLEEDING"
      : lengthDays === null
        ? null
        : lengthDays < FIGO.shortCycle
          ? "SHORT"
          : lengthDays > FIGO.longCycle
            ? "LONG"
            : "REGULAR";
  return {
    id: cycle.id,
    startDate: cycle.startDate,
    nextStartDate: end,
    lengthDays,
    periodDays,
    ovulation,
    lutealDays,
    regularity,
    noRiseWithData: !ovulation.bbtRiseDate && ovulation.validTemperatures >= MIN_TEMPS_FOR_JUDGEMENT && end !== null,
    status: end ? "COMPLETED" : "OPEN"
  };
}

// ── FIGO regularity across cycles ─────────────────────────────────────────────

export interface FigoFinding {
  code: "SHORT_CYCLES" | "LONG_CYCLES" | "IRREGULAR_VARIATION" | "PROLONGED_BLEEDING" | "AMENORRHOEA";
  /** Clinician escalation (P1) or one-off observation (P2). */
  level: "P1" | "P2";
  detail: string;
}

export interface FigoAssessment {
  status: "NORMAL" | "ATTENTION" | "INSUFFICIENT_DATA";
  cyclesAnalysed: number;
  meanLength: number | null;
  shortest: number | null;
  longest: number | null;
  variationDays: number | null;
  variationLimit: number;
  findings: FigoFinding[];
}

/** FIGO 2018: normal variation (shortest to longest) ≤ 7–9 days depending on age. */
export function variationLimit(age: number | null | undefined): number {
  if (age === null || age === undefined) return 7;
  return age <= 25 || age >= 42 ? 9 : 7;
}

export function assessFigo(cycles: CycleSummary[], today: string, age?: number | null): FigoAssessment {
  const done = cycles.filter((c) => c.status === "COMPLETED" && c.lengthDays !== null).slice(-6);
  const lengths = done.map((c) => c.lengthDays!) ;
  const limit = variationLimit(age);
  const findings: FigoFinding[] = [];
  const open = cycles.find((c) => c.status === "OPEN");
  const lastStart = open?.startDate ?? cycles[cycles.length - 1]?.startDate ?? null;

  if (lastStart && diffDays(today, lastStart) > FIGO.amenorrhoeaDays) {
    findings.push({ code: "AMENORRHOEA", level: "P1", detail: `No period recorded for ${diffDays(today, lastStart)} days (> ${FIGO.amenorrhoeaDays}).` });
  }
  const short = done.filter((c) => c.lengthDays! < FIGO.shortCycle).length;
  const long = done.filter((c) => c.lengthDays! > FIGO.longCycle).length;
  const prolonged = done.filter((c) => (c.periodDays ?? 0) > FIGO.prolongedBleeding).length;
  if (short) findings.push({ code: "SHORT_CYCLES", level: short >= 2 ? "P1" : "P2", detail: `${short} of ${done.length} cycles shorter than ${FIGO.shortCycle} days.` });
  if (long) findings.push({ code: "LONG_CYCLES", level: long >= 2 ? "P1" : "P2", detail: `${long} of ${done.length} cycles longer than ${FIGO.longCycle} days.` });
  if (prolonged) findings.push({ code: "PROLONGED_BLEEDING", level: prolonged >= 2 ? "P1" : "P2", detail: `${prolonged} period(s) longer than ${FIGO.prolongedBleeding} days.` });

  const variation = lengths.length >= 3 ? Math.max(...lengths) - Math.min(...lengths) : null;
  if (variation !== null && variation > limit) {
    findings.push({ code: "IRREGULAR_VARIATION", level: "P1", detail: `Cycle length varies by ${variation} days across ${lengths.length} cycles (FIGO limit ${limit}).` });
  }
  const status = findings.length ? "ATTENTION" : lengths.length >= 3 ? "NORMAL" : "INSUFFICIENT_DATA";
  return {
    status,
    cyclesAnalysed: lengths.length,
    meanLength: lengths.length ? Math.round((lengths.reduce((a, b) => a + b, 0) / lengths.length) * 10) / 10 : null,
    shortest: lengths.length ? Math.min(...lengths) : null,
    longest: lengths.length ? Math.max(...lengths) : null,
    variationDays: variation,
    variationLimit: limit,
    findings
  };
}

// ── Luteal phase and anovulation across cycles ────────────────────────────────

export interface OvulatoryAssessment {
  confirmedCycles: number;
  shortLutealCycles: number;
  medianLutealDays: number | null;
  /** Completed cycles in a row (newest first) with ≥ 10 temperatures and no confirmed rise. */
  consecutiveNoRise: number;
  findings: { code: "SHORT_LUTEAL" | "NO_RISE"; level: "P1" | "P2"; detail: string }[];
}

export function assessOvulatory(cycles: CycleSummary[]): OvulatoryAssessment {
  const recent = cycles.filter((c) => c.status === "COMPLETED").slice(-6);
  const confirmed = recent.filter((c) => c.lutealDays !== null && (c.ovulation.confidence === "confirmed" || c.ovulation.confidence === "probable"));
  const short = confirmed.filter((c) => c.lutealDays! < SHORT_LUTEAL_DAYS);
  const luteals = confirmed.map((c) => c.lutealDays!).sort((a, b) => a - b);
  const median = luteals.length ? luteals[Math.floor((luteals.length - 1) / 2)] : null;
  let consecutive = 0;
  for (let i = recent.length - 1; i >= 0 && recent[i].noRiseWithData; i--) consecutive++;
  const findings: OvulatoryAssessment["findings"] = [];
  if (short.length) {
    findings.push({ code: "SHORT_LUTEAL", level: short.length >= 2 ? "P1" : "P2", detail: `Luteal phase under ${SHORT_LUTEAL_DAYS} days in ${short.length} of ${confirmed.length} ovulatory cycles.` });
  }
  if (consecutive) {
    findings.push({ code: "NO_RISE", level: consecutive >= 2 ? "P1" : "P2", detail: `${consecutive} completed cycle(s) in a row with no confirmed temperature rise.` });
  }
  return { confirmedCycles: confirmed.length, shortLutealCycles: short.length, medianLutealDays: median, consecutiveNoRise: consecutive, findings };
}

// ── Prediction for the open cycle ─────────────────────────────────────────────

export type Phase = "MENSTRUAL" | "FOLLICULAR" | "FERTILE" | "LUTEAL" | "LATE" | "UNKNOWN";

export interface CyclePrediction {
  paused: boolean;
  cycleDay: number | null;
  phase: Phase;
  expectedLength: number;
  lengthConfidence: "low" | "medium" | "high";
  lutealEstimate: number;
  /** Hidden (null) in variable-cycle mode: no fixed "ovulation day" pin. */
  predictedOvulation: string | null;
  windowStart: string | null;
  windowEnd: string | null;
  nextPeriod: string | null;
  method: "CALENDAR_ONLY" | "SYMPTOM_CALIBRATED" | "BBT_CONFIRMED";
  variableMode: boolean;
  fertileSignsToday: boolean;
}

/** Exponentially weighted mean (α = 0.4, newest weighted most) of the last 6 lengths. */
export function expectedCycleLength(lengths: number[], reported?: number | null): { value: number; confidence: "low" | "medium" | "high" } {
  const valid = lengths.filter((l) => l >= 15 && l <= 90).slice(-6);
  if (valid.length >= 3) {
    let ewma = valid[0];
    for (const l of valid.slice(1)) ewma = 0.4 * l + 0.6 * ewma;
    return { value: Math.round(ewma), confidence: valid.length >= 6 ? "high" : "medium" };
  }
  return { value: reported && reported >= 21 && reported <= 45 ? reported : 28, confidence: "low" };
}

export function predictOpenCycle(params: {
  open: CycleSummary | null;
  history: CycleSummary[];
  logs: DayLog[];
  today: string;
  reportedLength?: number | null;
  trackingMode?: string | null;
  pcos?: boolean | null;
}): CyclePrediction {
  const { open, history, logs, today } = params;
  const lengths = history.filter((c) => c.lengthDays !== null).map((c) => c.lengthDays!);
  const exp = expectedCycleLength(lengths, params.reportedLength);
  const luteals = history.filter((c) => c.lutealDays !== null && c.ovulation.confidence === "confirmed").map((c) => c.lutealDays!).sort((a, b) => a - b);
  const lutealEstimate = luteals.length >= 2 ? Math.min(17, Math.max(10, luteals[Math.floor((luteals.length - 1) / 2)])) : 14;
  const sd = lengths.length >= 3 ? Math.sqrt(lengths.reduce((a, l) => a + (l - lengths.reduce((x, y) => x + y, 0) / lengths.length) ** 2, 0) / lengths.length) : 0;
  const paused = Boolean(params.trackingMode && (PAUSED_MODES as string[]).includes(params.trackingMode));
  const variableMode = sd > 4 || Boolean(params.pcos);
  const empty: CyclePrediction = {
    paused, cycleDay: null, phase: "UNKNOWN", expectedLength: exp.value, lengthConfidence: exp.confidence, lutealEstimate,
    predictedOvulation: null, windowStart: null, windowEnd: null, nextPeriod: null, method: "CALENDAR_ONLY", variableMode, fertileSignsToday: false
  };
  if (!open) return empty;

  const day = cycleDay(open.startDate, today);
  const todayLog = logs.find((l) => l.date === today);
  const recent = logsBetween(logs, addDays(today, -2), addDays(today, 1));
  const fertileSignsToday = recent.some((l) => isFertileMucus(l.mucus) || isLhPositive(l.lh));
  const nextPeriod = addDays(open.startDate, exp.value);
  const inPeriod = (open.periodDays !== null && day <= open.periodDays) || isBleeding(todayLog?.flow);

  let ovulation: string | null = null;
  let method: CyclePrediction["method"] = "CALENDAR_ONLY";
  if (open.ovulation.confidence === "confirmed") {
    ovulation = open.ovulation.date;
    method = "BBT_CONFIRMED";
  } else if (open.ovulation.confidence === "probable" || open.ovulation.confidence === "possible" || fertileSignsToday) {
    ovulation = open.ovulation.date ?? today;
    method = "SYMPTOM_CALIBRATED";
  } else {
    ovulation = addDays(open.startDate, exp.value - lutealEstimate);
  }

  if (paused) {
    return { ...empty, cycleDay: day, phase: inPeriod ? "MENSTRUAL" : "UNKNOWN", nextPeriod };
  }

  const windowStart = ovulation ? addDays(ovulation, -5) : null;
  const windowEnd = ovulation ? addDays(ovulation, 1) : null;
  let phase: Phase;
  if (inPeriod) phase = "MENSTRUAL";
  else if (method === "BBT_CONFIRMED" && ovulation && today > addDays(ovulation, 1)) phase = "LUTEAL";
  else if (fertileSignsToday || (windowStart && windowEnd && today >= windowStart && today <= windowEnd)) phase = "FERTILE";
  else if (windowEnd && today > windowEnd) phase = day > exp.value + 3 ? "LATE" : "LUTEAL";
  else phase = "FOLLICULAR";

  return {
    paused,
    cycleDay: day,
    phase,
    expectedLength: exp.value,
    lengthConfidence: exp.confidence,
    lutealEstimate,
    // Calendar-only pins are hidden when cycles vary a lot or with PCOS.
    predictedOvulation: variableMode && method === "CALENDAR_ONLY" ? null : ovulation,
    windowStart: variableMode && method === "CALENDAR_ONLY" ? null : windowStart,
    windowEnd: variableMode && method === "CALENDAR_ONLY" ? null : windowEnd,
    nextPeriod,
    method,
    variableMode,
    fertileSignsToday
  };
}

// ── PMS pattern (observational heuristic, ACOG timing) ────────────────────────

const PMS_SYMPTOMS = new Set(["PMS", "BLOATING", "BREAST_TENDERNESS", "HEADACHE", "CRAMPS", "IRRITABLE", "ANXIOUS", "SAD", "FATIGUED", "FATIGUE"]);
const hasPms = (l: DayLog) => [...(l.symptoms ?? []), ...(l.mood ?? [])].some((s) => PMS_SYMPTOMS.has(s));

export interface PmsPattern {
  status: "PATTERN" | "NO_PATTERN" | "INSUFFICIENT_DATA";
  cyclesAnalysed: number;
  cyclesMatching: number;
  /** Most frequent premenstrual symptoms. */
  topSymptoms: string[];
}

/**
 * ACOG timing: symptoms in the 5 days before a period, relieved within 4 days
 * of its onset and absent until at least cycle day 13. Needs ≥ 3 logged days in
 * each window and ≥ 2 analysed cycles. A pattern, never a PMS/PMDD diagnosis.
 */
export function assessPmsPattern(cycles: CycleSummary[], logs: DayLog[]): PmsPattern {
  const byDate = new Map(logs.map((l) => [l.date, l]));
  const counts = new Map<string, number>();
  let analysed = 0;
  let matching = 0;
  for (const c of cycles.filter((x) => x.status === "COMPLETED" && x.nextStartDate).slice(-6)) {
    const next = c.nextStartDate!;
    const pre = Array.from({ length: 5 }, (_, i) => byDate.get(addDays(next, -5 + i))).filter((l): l is DayLog => Boolean(l));
    const post = Array.from({ length: 9 }, (_, i) => byDate.get(addDays(next, 4 + i))).filter((l): l is DayLog => Boolean(l));
    if (pre.length < 3 || post.length < 3) continue;
    analysed++;
    const preDays = pre.filter(hasPms);
    const postDays = post.filter(hasPms).length;
    if (preDays.length >= 2 && postDays <= 1) {
      matching++;
      for (const l of preDays) for (const s of [...(l.symptoms ?? []), ...(l.mood ?? [])]) if (PMS_SYMPTOMS.has(s)) counts.set(s, (counts.get(s) ?? 0) + 1);
    }
  }
  const topSymptoms = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([s]) => s);
  return {
    status: analysed < 2 ? "INSUFFICIENT_DATA" : matching >= 2 ? "PATTERN" : "NO_PATTERN",
    cyclesAnalysed: analysed,
    cyclesMatching: matching,
    topSymptoms
  };
}

// ── Lab timing against the cycle ──────────────────────────────────────────────

export interface LabAlignment {
  labId: string;
  code: string;
  collectedOn: string;
  cycleStart: string | null;
  cycleDay: number | null;
  /** Days after the estimated ovulation (progesterone). */
  daysAfterOvulation: number | null;
  timing: "IN_WINDOW" | "OUT_OF_WINDOW" | "UNKNOWN" | "NOT_CYCLE_DEPENDENT";
  expected: string | null;
}

const EARLY_FOLLICULAR = new Set(["FSH", "LH", "ESTRADIOL"]);

/** Where each lab sample falls in the cycle: day 2–4 hormones and mid-luteal progesterone (≈ 7 days after ovulation). */
export function alignLabs(labs: { id: string; code: string; collectedAt: string }[], cycles: CycleSummary[]): LabAlignment[] {
  const sorted = [...cycles].sort((a, b) => a.startDate.localeCompare(b.startDate));
  return labs.map((l) => {
    const day = dayKey(l.collectedAt);
    const c = [...sorted].reverse().find((x) => x.startDate <= day && (!x.nextStartDate || day < x.nextStartDate)) ?? null;
    const base = { labId: l.id, code: l.code, collectedOn: day, cycleStart: c?.startDate ?? null, cycleDay: c ? cycleDay(c.startDate, day) : null, daysAfterOvulation: null as number | null };
    if (EARLY_FOLLICULAR.has(l.code)) {
      if (!c) return { ...base, timing: "UNKNOWN" as const, expected: "Cycle day 2–4" };
      return { ...base, timing: base.cycleDay! >= 2 && base.cycleDay! <= 4 ? ("IN_WINDOW" as const) : ("OUT_OF_WINDOW" as const), expected: "Cycle day 2–4" };
    }
    if (l.code === "PROGESTERONE") {
      if (!c?.ovulation.date) return { ...base, timing: "UNKNOWN" as const, expected: "About 7 days after ovulation (5–9)" };
      const after = diffDays(day, c.ovulation.date);
      return { ...base, daysAfterOvulation: after, timing: after >= 5 && after <= 9 ? ("IN_WINDOW" as const) : ("OUT_OF_WINDOW" as const), expected: "About 7 days after ovulation (5–9)" };
    }
    return { ...base, timing: "NOT_CYCLE_DEPENDENT" as const, expected: null };
  });
}

// ── Whole-record analysis ─────────────────────────────────────────────────────

export interface CycleAnalysis {
  cycles: CycleSummary[];
  open: CycleSummary | null;
  figo: FigoAssessment;
  ovulatory: OvulatoryAssessment;
  pms: PmsPattern;
  prediction: CyclePrediction;
  /** Clinician escalation reasons (P1), empty when none. Paused modes raise none. */
  escalations: string[];
}

export function analyseCycles(params: {
  cycles: CycleInput[];
  logs: DayLog[];
  temps: Point[];
  today: string;
  age?: number | null;
  reportedLength?: number | null;
  trackingMode?: string | null;
  pcos?: boolean | null;
}): CycleAnalysis {
  const sorted = [...params.cycles].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const chained: CycleInput[] = sorted.map((c, i) => ({ ...c, nextStartDate: sorted[i + 1]?.startDate ?? null }));
  const summaries = chained.map((c) => summariseCycle(c, params.logs, params.temps));
  const open = summaries.find((s) => s.status === "OPEN") ?? null;
  const history = summaries.filter((s) => s.status === "COMPLETED");
  const figo = assessFigo(summaries, params.today, params.age);
  const ovulatory = assessOvulatory(summaries);
  const pms = assessPmsPattern(summaries, params.logs);
  const prediction = predictOpenCycle({ open, history, logs: params.logs, today: params.today, reportedLength: params.reportedLength, trackingMode: params.trackingMode, pcos: params.pcos });
  const paused = prediction.paused;
  const escalations = paused
    ? []
    : [...figo.findings.filter((f) => f.level === "P1").map((f) => `Cycle (FIGO): ${f.detail}`), ...ovulatory.findings.filter((f) => f.level === "P1").map((f) => `Ovulation: ${f.detail}`)];
  return { cycles: summaries, open, figo, ovulatory, pms, prediction, escalations };
}
