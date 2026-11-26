// Personal rolling baselines (7-day vs 28-day) for passive signals. A personal
// baseline is compared with itself, not with a population cut-off.
// [Proposed, not validated] The 2-SD deviation rule is a team assumption used
// only for gentle weekly summaries, never for clinical alerts.

export interface SignalPoint {
  date: Date;
  value: number;
}

export interface Baseline {
  code: string;
  mean7: number | null;
  mean28: number | null;
  sd28: number | null;
  n7: number;
  n28: number;
  /** 7-day mean outside the 28-day mean ± 2 SD (needs ≥ 5 + 14 readings). */
  deviation: "HIGH" | "LOW" | null;
}

const DAY = 86_400_000;
const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : null);

export function rollingBaseline(code: string, points: SignalPoint[], now = new Date()): Baseline {
  const t = now.getTime();
  const last7 = points.filter((p) => t - p.date.getTime() <= 7 * DAY && p.date.getTime() <= t).map((p) => p.value);
  const prior = points.filter((p) => t - p.date.getTime() <= 35 * DAY && t - p.date.getTime() > 7 * DAY).map((p) => p.value);
  const m7 = mean(last7);
  const m28 = mean(prior);
  const sd = m28 === null || prior.length < 2 ? null : Math.sqrt(prior.reduce((a, v) => a + (v - m28) ** 2, 0) / prior.length);
  let deviation: Baseline["deviation"] = null;
  if (m7 !== null && m28 !== null && sd !== null && sd > 0 && last7.length >= 5 && prior.length >= 14) {
    if (m7 > m28 + 2 * sd) deviation = "HIGH";
    else if (m7 < m28 - 2 * sd) deviation = "LOW";
  }
  const r = (x: number | null) => (x === null ? null : Math.round(x * 100) / 100);
  return { code, mean7: r(m7), mean28: r(m28), sd28: r(sd), n7: last7.length, n28: prior.length, deviation };
}
