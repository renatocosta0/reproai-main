// Views over real observations from /api/observations. The same functions run
// on the server (src/lib/observation-alerts.ts) and in the charts, so the
// clinician alerts and what people see always agree.

import type { ObservationRecord } from "@/types/patient";

export const CODES = {
  temperature: { code: "8310-5", unit: "Cel" },
  sleep: { code: "93832-4", unit: "h" },
  // Passive wearable signals (daily summaries). Context only: never used for
  // ovulation confirmation or clinical alerts until validated.
  restingHeartRate: { code: "40443-4", unit: "/min" },
  hrv: { code: "80404-7", unit: "ms" },
  wristTemperature: { code: "wrist-temperature", unit: "Cel" },
  steps: { code: "55423-8", unit: "steps" },
  exercise: { code: "exercise-minutes", unit: "min" },
  water: { code: "water-intake", unit: "mL" }
} as const;

/** Passive signal codes (not basal temperature, not sleep). */
export const PASSIVE_CODES = new Set<string>([CODES.restingHeartRate.code, CODES.hrv.code, CODES.wristTemperature.code, CODES.steps.code, CODES.exercise.code, CODES.water.code]);

/**
 * The only observation codes the API accepts, with plausible ranges. Lab values
 * never travel this path: they are clinician-entered LabResults. Legacy aliases
 * map to their LOINC code; the unit is always set by the server.
 */
const ACCEPTED_OBSERVATIONS: Record<string, { unit: string; min: number; max: number; label: string }> = {
  "8310-5": { unit: "Cel", min: 34, max: 40, label: "Basal body temperature (°C)" },
  "93832-4": { unit: "h", min: 0, max: 16, label: "Sleep duration (hours)" },
  "40443-4": { unit: "/min", min: 25, max: 200, label: "Resting heart rate (bpm)" },
  "80404-7": { unit: "ms", min: 1, max: 400, label: "Heart rate variability, SDNN (ms)" },
  "wrist-temperature": { unit: "Cel", min: 30, max: 42, label: "Sleeping wrist temperature (°C)" },
  "55423-8": { unit: "steps", min: 0, max: 150000, label: "Steps per day" },
  "exercise-minutes": { unit: "min", min: 0, max: 1440, label: "Exercise minutes per day" },
  "water-intake": { unit: "mL", min: 0, max: 10000, label: "Water intake (mL)" }
};
const OBSERVATION_ALIASES: Record<string, string> = { "body-temperature": "8310-5", "sleep-hours": "93832-4" };

export function normaliseObservation(
  code: unknown,
  value: unknown
): { ok: true; code: string; unit: string; value: number } | { ok: false; error: string } {
  const raw = typeof code === "string" ? code.trim() : "";
  const loinc = OBSERVATION_ALIASES[raw] ?? raw;
  const def = ACCEPTED_OBSERVATIONS[loinc];
  if (!def) {
    return { ok: false, error: `Unsupported reading "${raw || "(none)"}". Accepted: basal body temperature (8310-5), sleep (93832-4), resting heart rate (40443-4), HRV (80404-7), wrist temperature, steps (55423-8), exercise minutes and water intake.` };
  }
  if (typeof value !== "number" || !Number.isFinite(value) || value < def.min || value > def.max) {
    return { ok: false, error: `${def.label} must be a number between ${def.min} and ${def.max}.` };
  }
  return { ok: true, code: loinc, unit: def.unit, value };
}

export const MIN_BBT_READINGS = 10; // same threshold the server uses before judging a curve
export const SHIFT_THRESHOLD_C = 0.3; // WHO / Roetzer biphasic criterion shown to users

/** Basal body temperature (wrist temperature is a separate, passive signal). */
export function isTemperature(code: string): boolean {
  if (PASSIVE_CODES.has(code)) return false;
  return code === "8310-5" || code === "body-temperature" || code.toLowerCase().includes("temp");
}

export function isSleep(code: string): boolean {
  if (PASSIVE_CODES.has(code)) return false;
  return code === "93832-4" || code === "sleep-hours" || code.toLowerCase().includes("sleep");
}

export interface Point {
  date: Date;
  value: number;
}

/** Oldest-first series of one signal. */
export function series(obs: ObservationRecord[], match: (code: string) => boolean): Point[] {
  return obs
    .filter((o) => match(o.code))
    .map((o) => ({ date: new Date(o.effectiveAt), value: o.value }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

// ── Basal body temperature: cycle-aware Roetzer / Sensiplan analysis ─────────
//
// Validated rule (Roetzer; Sensiplan "3 over 6"): a temperature shift is
// confirmed on the first of three consecutive readings that are all above the
// coverline (the highest of the six readings before them), the third at least
// 0.2 °C above it. Sensiplan exception: if the third is above the coverline but
// less than 0.2 °C higher, a fourth reading above the coverline confirms it.
//
// Readings are split into cycles so that a rise in an earlier cycle cannot hide
// a flat curve now (that was a false-reassurance bug when the largest rise over
// 60 readings was used). Fever readings (≥ 37.8 °C) are kept on record but left
// out of the curve.

export const FEVER_THRESHOLD_C = 37.8;
export const ROETZER_THIRD_RISE_C = 0.2;
/** A gap between readings this long (days) starts a new segment: the curve cannot be read across it. */
export const BBT_GAP_DAYS = 10;
/** FIGO AUB System 1 (2018): cycles longer than 38 days are outside the normal range. */
export const LONG_CYCLE_DAYS = 38;
/** A segment without a rise is judged monophasic only once it spans this many days (ovulation is usually earlier). */
export const MIN_MONOPHASIC_SPAN_DAYS = 21;
const DAY_MS = 86_400_000;

export interface RoetzerShift {
  /** Index of the first raised reading. */
  index: number;
  /** Highest of the six readings before the rise, °C. */
  coverline: number;
}

/** First Roetzer 3-over-6 rise in a series of values, or null. */
export function findRoetzerShift(values: number[]): RoetzerShift | null {
  for (let i = 6; i + 2 < values.length; i++) {
    const coverline = Math.max(...values.slice(i - 6, i));
    const [a, b, c] = [values[i], values[i + 1], values[i + 2]];
    if (!(a > coverline && b > coverline && c > coverline)) continue;
    if (c >= coverline + ROETZER_THIRD_RISE_C - 1e-9) return { index: i, coverline };
    if (i + 3 < values.length && values[i + 3] > coverline) return { index: i, coverline };
  }
  return null;
}

export interface BbtCycleSegment {
  /** Indices into the input series (first reading, last reading inclusive). */
  firstIndex: number;
  lastIndex: number;
  readings: number;
  startDate: string;
  endDate: string;
  spanDays: number;
  shift: RoetzerShift | null;
  /** How the segment ended; null for the current (open) segment. */
  closedBy: "PERIOD_START" | "TEMPERATURE_DROP" | "GAP" | null;
}

/** Valid (non-fever) temperature readings, oldest first, with their index in the input. */
function validTemperatures(points: Point[]) {
  const all = points
    .map((p, index) => ({ ...p, index }))
    .filter((p) => Number.isFinite(p.value) && !Number.isNaN(p.date.getTime()))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  const valid = all.filter((p) => p.value < FEVER_THRESHOLD_C);
  return { valid, excludedFever: all.length - valid.length };
}

/**
 * Split temperature readings into cycles. Boundaries, in order of preference:
 * a recorded period start, a sustained drop after a confirmed rise (three
 * readings in a row below the midpoint between the coverline and the raised
 * phase), or a gap of BBT_GAP_DAYS.
 */
export function segmentBbtCycles(points: Point[], periodStarts: Date[] = []): BbtCycleSegment[] {
  const { valid } = validTemperatures(points);
  const starts = periodStarts.map((d) => d.getTime()).filter(Number.isFinite).sort((a, b) => a - b);
  const segments: BbtCycleSegment[] = [];
  const n = valid.length;
  let s = 0;
  while (s < n) {
    let e = s + 1;
    let closedBy: BbtCycleSegment["closedBy"] = null;
    let shift: RoetzerShift | null = null;
    for (; e < n; e++) {
      const prev = valid[e - 1].date.getTime();
      const cur = valid[e].date.getTime();
      if (cur - prev > BBT_GAP_DAYS * DAY_MS) { closedBy = "GAP"; break; }
      if (starts.some((t) => t > prev && t <= cur)) { closedBy = "PERIOD_START"; break; }
      if (!shift) {
        const found = findRoetzerShift(valid.slice(s, e + 1).map((p) => p.value));
        if (found) shift = { index: found.index + s, coverline: found.coverline };
      } else if (e - 2 > shift.index + 2) {
        // Sustained return to the low phase: three readings in a row below the
        // midpoint between the coverline and the mean of the raised phase.
        const raised = valid.slice(shift.index, e - 2).map((p) => p.value);
        const raisedMean = raised.reduce((a, b) => a + b, 0) / raised.length;
        const midpoint = (shift.coverline + raisedMean) / 2;
        if (![e - 2, e - 1, e].every((k) => valid[k].value < midpoint)) continue;
        e = e - 2;
        closedBy = "TEMPERATURE_DROP";
        break;
      }
    }
    const first = valid[s];
    const last = valid[e - 1];
    segments.push({
      firstIndex: first.index,
      lastIndex: last.index,
      readings: e - s,
      startDate: first.date.toISOString(),
      endDate: last.date.toISOString(),
      spanDays: Math.round((last.date.getTime() - first.date.getTime()) / DAY_MS) + 1,
      shift: shift ? { index: valid[shift.index].index, coverline: shift.coverline } : null,
      closedBy
    });
    s = e;
  }
  return segments;
}

export interface BbtAnalysis {
  status: "INSUFFICIENT_DATA" | "BIPHASIC" | "MONOPHASIC";
  /** Valid readings in the cycle the status refers to. */
  readings: number;
  /** Rise of the 3-reading mean over the preceding 6-reading mean at the shift (or the largest such rise in the cycle), °C. */
  shift: number;
  /** Index in the input series of the first raised reading. */
  shiftIndex: number | null;
  /** Roetzer coverline: highest of the six readings before the rise. */
  coverline: number | null;
  /** Which cycle the status describes. LAST_COMPLETED_CYCLE when the current one is too young to judge. */
  basis: "CURRENT_CYCLE" | "LAST_COMPLETED_CYCLE" | null;
  /** Valid readings and span of the current (open) cycle. */
  currentCycleReadings: number;
  currentCycleSpanDays: number;
  /** Readings left out because they were at or above FEVER_THRESHOLD_C. */
  excludedFever: number;
  /** Consecutive judgeable cycles without a confirmed rise, counted back from the most recent. */
  consecutiveMonophasicCycles: number;
  /** Current cycle has no rise and already spans more than LONG_CYCLE_DAYS. */
  longCycleWithoutRise: boolean;
  totalReadings: number;
  cycles: BbtCycleSegment[];
}

function meanShiftAt(values: number[], i: number): number {
  const base = values.slice(i - 6, i).reduce((a, b) => a + b, 0) / 6;
  const post = values.slice(i, i + 3).reduce((a, b) => a + b, 0) / 3;
  return post - base;
}

function segmentValues(points: Point[], seg: BbtCycleSegment): { values: number[]; indices: number[] } {
  const { valid } = validTemperatures(points);
  const inSeg = valid.filter((p) => {
    const t = p.date.getTime();
    return t >= new Date(seg.startDate).getTime() && t <= new Date(seg.endDate).getTime();
  });
  return { values: inSeg.map((p) => p.value), indices: inSeg.map((p) => p.index) };
}

function judgeable(seg: BbtCycleSegment): boolean {
  return seg.readings >= MIN_BBT_READINGS && (seg.spanDays >= MIN_MONOPHASIC_SPAN_DAYS || seg.closedBy === "PERIOD_START");
}

export function analyzeBbt(points: Point[], periodStarts: Date[] = []): BbtAnalysis {
  const { valid, excludedFever } = validTemperatures(points);
  const cycles = segmentBbtCycles(points, periodStarts);
  const current = cycles[cycles.length - 1];
  const empty: BbtAnalysis = {
    status: "INSUFFICIENT_DATA",
    readings: current?.readings ?? 0,
    shift: 0,
    shiftIndex: null,
    coverline: null,
    basis: null,
    currentCycleReadings: current?.readings ?? 0,
    currentCycleSpanDays: current?.spanDays ?? 0,
    excludedFever,
    consecutiveMonophasicCycles: 0,
    longCycleWithoutRise: false,
    totalReadings: valid.length,
    cycles
  };
  if (!current) return empty;

  // Consecutive cycles without a rise, newest first. A young current cycle is
  // skipped (not yet judgeable); an older unjudgeable one stops the count.
  let consecutive = 0;
  for (let k = cycles.length - 1; k >= 0; k--) {
    const c = cycles[k];
    if (c.shift) break;
    if (judgeable(c)) { consecutive++; continue; }
    if (k === cycles.length - 1) continue;
    break;
  }
  empty.consecutiveMonophasicCycles = consecutive;
  empty.longCycleWithoutRise = !current.shift && current.readings >= MIN_BBT_READINGS && current.spanDays > LONG_CYCLE_DAYS;

  const describe = (seg: BbtCycleSegment, basis: BbtAnalysis["basis"]): BbtAnalysis => {
    const { values, indices } = segmentValues(points, seg);
    if (seg.shift) {
      const local = indices.indexOf(seg.shift.index);
      const shift = local >= 6 && local + 2 < values.length ? meanShiftAt(values, local) : 0;
      return { ...empty, status: "BIPHASIC", readings: seg.readings, shift: Number(shift.toFixed(2)), shiftIndex: seg.shift.index, coverline: seg.shift.coverline, basis };
    }
    let largest = 0;
    for (let i = 6; i + 2 < values.length; i++) largest = Math.max(largest, meanShiftAt(values, i));
    return { ...empty, status: "MONOPHASIC", readings: seg.readings, shift: Number(largest.toFixed(2)), basis };
  };

  if (current.shift) return describe(current, "CURRENT_CYCLE");
  if (judgeable(current)) return describe(current, "CURRENT_CYCLE");
  // Current cycle too young to judge: report the last completed cycle, if it was judgeable.
  const previous = cycles[cycles.length - 2];
  if (previous && (previous.shift || judgeable(previous))) return describe(previous, "LAST_COMPLETED_CYCLE");
  return empty;
}

export interface SleepStats {
  nights: number;
  mean: number;
  sd: number;
  last: number | null;
  /** 7-night trailing mean aligned with the input series (null until 7 nights). */
  movingAverage: (number | null)[];
  /** Short or irregular sleep over the recent window (see SLEEP_* constants). */
  disrupted: boolean;
  /** Mean of the recent window below SLEEP_SHORT_H. */
  short: boolean;
  /** Night-to-night SD of the recent window above SLEEP_IRREGULAR_SD_H. */
  irregular: boolean;
  /** Nights in the recent window the flags are based on. */
  recentNights: number;
  recentMean: number | null;
}

/** Recent window for sleep flags: a 14-night mean filters isolated atypical nights (travel, one late night). */
export const SLEEP_RECENT_NIGHTS = 14;
export const SLEEP_MIN_NIGHTS = 7;
/** AASM/SRS consensus (Watson et al., Sleep 2015): adults need 7 or more hours per night. */
export const SLEEP_SHORT_H = 7;
/** Team assumption, not a guideline value: a night-to-night SD above 2 h suggests irregular timing. */
export const SLEEP_IRREGULAR_SD_H = 2.0;

export function sleepStats(points: Point[]): SleepStats | null {
  if (points.length === 0) return null;
  const v = points.map((p) => p.value);
  const mean = v.reduce((a, b) => a + b, 0) / v.length;
  const sd = Math.sqrt(v.reduce((s, x) => s + (x - mean) ** 2, 0) / v.length);
  const movingAverage = v.map((_, i) =>
    i < 6 ? null : v.slice(i - 6, i + 1).reduce((a, b) => a + b, 0) / 7
  );
  const recent = v.slice(-SLEEP_RECENT_NIGHTS);
  const enough = recent.length >= SLEEP_MIN_NIGHTS;
  const recentMean = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : null;
  const recentSd = recentMean === null ? 0 : Math.sqrt(recent.reduce((acc, x) => acc + (x - recentMean) ** 2, 0) / recent.length);
  const short = enough && recentMean !== null && recentMean < SLEEP_SHORT_H;
  const irregular = enough && recentSd > SLEEP_IRREGULAR_SD_H;
  return {
    nights: v.length,
    mean,
    sd,
    last: v[v.length - 1] ?? null,
    movingAverage,
    disrupted: short || irregular,
    short,
    irregular,
    recentNights: recent.length,
    recentMean
  };
}

// ── Wearable signal triage (shared by every ingestion path) ──────────────────
//
// P1 — clinician escalation (opens a care-team follow-up): no confirmed
//      Roetzer rise in ≥ 2 consecutive judgeable cycles, or a current cycle
//      longer than 38 days without a rise (FIGO upper limit).
// P2 — advice only (pathway options BBT-MONO / OPT-SLEEP, no follow-up):
//      a single cycle without a rise, or short / irregular sleep.
// A confirmed rise in the most recent judgeable cycle resolves an earlier
// temperature alert. None of this is a diagnosis.

export type WearableAlertLevel = "P1" | "P2" | "NONE";

export interface WearableSignals {
  level: WearableAlertLevel;
  /** Clinician-facing reason when level is P1. */
  clinicianReason: string | null;
  /** Advice-level notes (P2). */
  advice: string[];
  /** A confirmed rise now: an open temperature alert can be resolved. */
  temperatureResolved: boolean;
  /** Sleep is no longer short or irregular (or there is too little to judge). */
  sleepSettled: boolean;
  bbt: BbtAnalysis;
  sleep: SleepStats | null;
}

export function assessWearableSignals(temps: Point[], sleepPoints: Point[], periodStarts: Date[] = []): WearableSignals {
  const bbt = analyzeBbt(temps, periodStarts);
  const sleep = sleepStats(sleepPoints);
  const advice: string[] = [];
  let clinicianReason: string | null = null;

  const fever = bbt.excludedFever ? ` ${bbt.excludedFever} fever reading(s) ≥ ${FEVER_THRESHOLD_C} °C were left out.` : "";
  if (bbt.status === "MONOPHASIC" && bbt.basis === "CURRENT_CYCLE") {
    if (bbt.consecutiveMonophasicCycles >= 2) {
      clinicianReason = `Temperature: no confirmed rise (Roetzer 3-over-6) in ${bbt.consecutiveMonophasicCycles} consecutive cycles (${bbt.readings} valid readings in the current one).${fever} Not a diagnosis; consider ovulation confirmation (e.g. mid-luteal progesterone).`;
    } else if (bbt.longCycleWithoutRise) {
      clinicianReason = `Temperature: current cycle spans ${bbt.currentCycleSpanDays} days (> ${LONG_CYCLE_DAYS}) with no confirmed rise (Roetzer 3-over-6) across ${bbt.readings} valid readings.${fever} Not a diagnosis; consider ovulation confirmation and cycle review (FIGO).`;
    } else {
      advice.push(`No confirmed temperature rise yet in this cycle (${bbt.readings} valid readings).`);
    }
  }
  if (sleep?.short) advice.push(`Sleep: ${sleep.recentMean!.toFixed(1)} h per night over the last ${sleep.recentNights} nights (under ${SLEEP_SHORT_H} h).`);
  if (sleep?.irregular) advice.push(`Sleep: night-to-night variation above ${SLEEP_IRREGULAR_SD_H} h over the last ${sleep.recentNights} nights (team threshold).`);

  return {
    level: clinicianReason ? "P1" : advice.length ? "P2" : "NONE",
    clinicianReason,
    advice,
    temperatureResolved: bbt.status === "BIPHASIC",
    sleepSettled: !sleep?.disrupted,
    bbt,
    sleep
  };
}

export function formatHours(h: number): string {
  const whole = Math.floor(h);
  const mins = Math.round((h - whole) * 60);
  return mins === 60 ? `${whole + 1}h 00m` : `${whole}h ${String(mins).padStart(2, "0")}m`;
}

export function isToday(d: Date): boolean {
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export function shortDate(d: Date | string): string {
  const date = new Date(d);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }) });
}
