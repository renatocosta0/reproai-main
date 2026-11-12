// Client-side views over real observations from /api/observations. The rules
// mirror the server-side analysis in src/app/api/observations/bulk/route.ts so
// the charts and the clinician alerts agree.

import type { ObservationRecord } from "@/types/patient";

export const CODES = {
  temperature: { code: "8310-5", unit: "Cel" },
  sleep: { code: "93832-4", unit: "h" }
} as const;

export const MIN_BBT_READINGS = 10; // same threshold the server uses before judging a curve
export const SHIFT_THRESHOLD_C = 0.3; // WHO / Roetzer biphasic criterion shown to users
const SERVER_SHIFT_CUTOFF_C = 0.28; // server's tolerance for rounding

export function isTemperature(code: string): boolean {
  return code === "8310-5" || code === "body-temperature" || code.toLowerCase().includes("temp");
}

export function isSleep(code: string): boolean {
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

export interface BbtAnalysis {
  status: "INSUFFICIENT_DATA" | "BIPHASIC" | "MONOPHASIC";
  readings: number;
  /** Largest rise of a 3-day mean over the preceding 6-day mean, °C. */
  shift: number;
  /** Index in the series where that rise starts (first raised reading). */
  shiftIndex: number | null;
  /** Roetzer coverline: highest of the six readings before the rise. */
  coverline: number | null;
}

export function analyzeBbt(points: Point[]): BbtAnalysis {
  const values = points.map((p) => p.value);
  if (values.length < MIN_BBT_READINGS) {
    return { status: "INSUFFICIENT_DATA", readings: values.length, shift: 0, shiftIndex: null, coverline: null };
  }
  let maxShift = 0;
  let at: number | null = null;
  for (let i = 6; i < values.length - 2; i++) {
    const base = values.slice(i - 6, i).reduce((a, b) => a + b, 0) / 6;
    const post = values.slice(i, i + 3).reduce((a, b) => a + b, 0) / 3;
    if (post - base > maxShift) {
      maxShift = post - base;
      at = i;
    }
  }
  const shift = Number(maxShift.toFixed(2));
  const biphasic = maxShift >= SERVER_SHIFT_CUTOFF_C;
  return {
    status: biphasic ? "BIPHASIC" : "MONOPHASIC",
    readings: values.length,
    shift,
    shiftIndex: biphasic ? at : null,
    coverline: biphasic && at !== null ? Math.max(...values.slice(at - 6, at)) : null
  };
}

export interface SleepStats {
  nights: number;
  mean: number;
  sd: number;
  last: number | null;
  /** 7-night trailing mean aligned with the input series (null until 7 nights). */
  movingAverage: (number | null)[];
  disrupted: boolean;
}

export function sleepStats(points: Point[]): SleepStats | null {
  if (points.length === 0) return null;
  const v = points.map((p) => p.value);
  const mean = v.reduce((a, b) => a + b, 0) / v.length;
  const sd = Math.sqrt(v.reduce((s, x) => s + (x - mean) ** 2, 0) / v.length);
  const movingAverage = v.map((_, i) =>
    i < 6 ? null : v.slice(i - 6, i + 1).reduce((a, b) => a + b, 0) / 7
  );
  return {
    nights: v.length,
    mean,
    sd,
    last: v[v.length - 1] ?? null,
    movingAverage,
    // Server alert rule: mean < 5h or σ > 2.8h (needs ≥ 3 nights).
    disrupted: v.length >= 3 && (mean < 5 || sd > 2.8)
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
