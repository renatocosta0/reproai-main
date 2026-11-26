import { describe, expect, it } from "vitest";
import { analyzeBbt, assessWearableSignals, findRoetzerShift, normaliseObservation, sleepStats, type Point } from "./observation-analysis";

describe("normaliseObservation", () => {
  it("accepts temperature and sleep, and sets the unit on the server", () => {
    expect(normaliseObservation("8310-5", 36.6)).toEqual({ ok: true, code: "8310-5", unit: "Cel", value: 36.6 });
    expect(normaliseObservation("93832-4", 7.5)).toEqual({ ok: true, code: "93832-4", unit: "h", value: 7.5 });
  });

  it("maps legacy aliases to LOINC codes", () => {
    expect(normaliseObservation("body-temperature", 36.4)).toMatchObject({ ok: true, code: "8310-5" });
    expect(normaliseObservation("sleep-hours", 6)).toMatchObject({ ok: true, code: "93832-4" });
  });

  it("rejects lab-like or unknown codes", () => {
    for (const code of ["AMH", "68343-3", "SPERM_CONCENTRATION", "", undefined, 42]) {
      expect(normaliseObservation(code, 1.2).ok).toBe(false);
    }
  });

  it("rejects implausible or non-numeric values", () => {
    expect(normaliseObservation("8310-5", 45).ok).toBe(false);
    expect(normaliseObservation("93832-4", -1).ok).toBe(false);
    expect(normaliseObservation("8310-5", "36.5").ok).toBe(false);
    expect(normaliseObservation("8310-5", Number.NaN).ok).toBe(false);
  });
});

// ── Cycle-aware basal body temperature (Roetzer 3-over-6) ─────────────────────


const DAY = 86_400_000;
const T0 = new Date("2026-09-01T07:00:00Z").getTime();
const series = (values: number[], startDay = 0): Point[] => values.map((value, i) => ({ date: new Date(T0 + (startDay + i) * DAY), value }));
const repeat = (v: number, n: number) => Array(n).fill(v) as number[];
// 28-day ovulatory cycle: 14 low mornings, a clear rise, then a raised phase.
const ovulatory = [...repeat(36.3, 14), 36.7, 36.75, 36.8, ...repeat(36.75, 11)];
// Flat (monophasic) cycle with small day-to-day noise.
const flat = (n: number) => Array.from({ length: n }, (_, i) => 36.3 + (i % 3) * 0.05);

describe("findRoetzerShift", () => {
  it("confirms three readings above the coverline, the third ≥ 0.2 °C higher", () => {
    expect(findRoetzerShift(ovulatory)).toEqual({ index: 14, coverline: 36.3 });
  });

  it("applies the Sensiplan exception: a fourth reading above the coverline", () => {
    const v = [...repeat(36.3, 6), 36.4, 36.42, 36.45, 36.41];
    expect(findRoetzerShift(v)).toEqual({ index: 6, coverline: 36.3 });
    expect(findRoetzerShift(v.slice(0, 9))).toBeNull();
  });

  it("does not confirm a single high reading", () => {
    expect(findRoetzerShift([...repeat(36.3, 6), 36.9, 36.3, 36.3, 36.3])).toBeNull();
  });
});

describe("analyzeBbt", () => {
  it("does not let a rise in an earlier cycle hide a flat current cycle", () => {
    const a = analyzeBbt(series([...ovulatory, ...flat(30)]));
    expect(a.cycles).toHaveLength(2);
    expect(a.cycles[0].closedBy).toBe("TEMPERATURE_DROP");
    expect(a.status).toBe("MONOPHASIC");
    expect(a.basis).toBe("CURRENT_CYCLE");
    expect(a.consecutiveMonophasicCycles).toBe(1);
  });

  it("reports the last completed cycle while the current one is too young to judge", () => {
    const a = analyzeBbt(series([...ovulatory, ...flat(5)]));
    expect(a.status).toBe("BIPHASIC");
    expect(a.basis).toBe("LAST_COMPLETED_CYCLE");
    expect(a.currentCycleReadings).toBe(5);
  });

  it("leaves fever readings out of the curve", () => {
    const withFever = [...ovulatory.slice(0, 10), 38.2, ...ovulatory.slice(10)];
    const a = analyzeBbt(series(withFever));
    expect(a.excludedFever).toBe(1);
    expect(a.status).toBe("BIPHASIC");
    // shiftIndex points into the input series (the fever reading included).
    expect(a.shiftIndex).toBe(15);
  });

  it("does not call a young cycle monophasic", () => {
    expect(analyzeBbt(series(flat(14))).status).toBe("INSUFFICIENT_DATA");
  });

  it("flags a cycle longer than 38 days without a rise", () => {
    const a = analyzeBbt(series(flat(42)));
    expect(a.status).toBe("MONOPHASIC");
    expect(a.longCycleWithoutRise).toBe(true);
  });

  it("uses recorded period starts as cycle boundaries", () => {
    const a = analyzeBbt(series([...flat(28), ...flat(28)]), [new Date(T0 + 28 * DAY)]);
    expect(a.cycles.map((c) => c.closedBy)).toEqual(["PERIOD_START", null]);
    expect(a.consecutiveMonophasicCycles).toBe(2);
  });
});

describe("sleepStats", () => {
  it("judges the last 14 nights, and only with at least 7", () => {
    expect(sleepStats(series(repeat(6, 6)))?.short).toBe(false);
    expect(sleepStats(series([...repeat(4, 20), ...repeat(8, 14)]))?.short).toBe(false);
    expect(sleepStats(series(repeat(6.5, 14)))?.short).toBe(true);
  });
});

describe("assessWearableSignals", () => {
  it("one flat cycle is advice (P2), not a clinician escalation", () => {
    const s = assessWearableSignals(series([...ovulatory, ...flat(30)]), []);
    expect(s.level).toBe("P2");
    expect(s.clinicianReason).toBeNull();
  });

  it("two flat cycles in a row escalate to the clinician (P1)", () => {
    const s = assessWearableSignals(series([...flat(28), ...flat(28)]), [], [new Date(T0 + 28 * DAY)]);
    expect(s.level).toBe("P1");
    expect(s.clinicianReason).toContain("2 consecutive cycles");
  });

  it("a long cycle without a rise escalates (P1)", () => {
    expect(assessWearableSignals(series(flat(42)), []).level).toBe("P1");
  });

  it("short sleep alone never escalates", () => {
    const s = assessWearableSignals([], series(repeat(4.5, 14)));
    expect(s.level).toBe("P2");
  });

  it("a confirmed rise resolves the temperature signal", () => {
    expect(assessWearableSignals(series(ovulatory), []).temperatureResolved).toBe(true);
  });
});
