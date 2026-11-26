import { describe, expect, it } from "vitest";
import {
  addDays,
  alignLabs,
  analyseCycles,
  assessFigo,
  assessPmsPattern,
  detectOvulation,
  expectedCycleLength,
  periodLength,
  summariseCycle,
  variationLimit,
  type DayLog
} from "./cycle";
import type { Point } from "./observation-analysis";

const S = "2026-06-01";
const temps = (start: string, values: number[]): Point[] => values.map((value, i) => ({ date: new Date(`${addDays(start, i)}T07:00:00Z`), value }));
const ovulatoryTemps = (start: string, length = 28) => temps(start, [...Array(14).fill(36.3), 36.7, 36.75, 36.8, ...Array(length - 17).fill(36.75)]);
const period = (start: string, days = 5): DayLog[] => Array.from({ length: days }, (_, i) => ({ date: addDays(start, i), flow: i < 2 ? "HEAVY" : "LIGHT" }));

describe("periodLength", () => {
  it("counts flow days and ignores spotting afterwards", () => {
    expect(periodLength(S, [...period(S, 5), { date: addDays(S, 6), flow: "SPOTTING" }])).toBe(5);
  });
  it("bridges a single dry day", () => {
    expect(periodLength(S, [...period(S, 3), { date: addDays(S, 4), flow: "LIGHT" }])).toBe(5);
  });
});

describe("detectOvulation", () => {
  it("confirms ovulation the day before the Roetzer rise and checks LH agreement", () => {
    const logs: DayLog[] = [{ date: addDays(S, 12), lh: "POSITIVE" }];
    const o = detectOvulation({ startDate: S, nextStartDate: addDays(S, 28) }, logs, ovulatoryTemps(S));
    expect(o.method).toBe("BBT_ROETZER");
    expect(o.date).toBe(addDays(S, 13));
    expect(o.corroborated).toBe(true);
  });
  it("ignores fever and confounded days", () => {
    const t = ovulatoryTemps(S);
    t[14] = { ...t[14], value: 38.4 };
    const logs: DayLog[] = [{ date: addDays(S, 15), confounder: "ILLNESS" }];
    const o = detectOvulation({ startDate: S, nextStartDate: addDays(S, 28) }, logs, t);
    expect(o.validTemperatures).toBe(26);
  });
  it("falls back to LH, then to the mucus peak", () => {
    expect(detectOvulation({ startDate: S }, [{ date: addDays(S, 13), lh: "PEAK" }], []).method).toBe("LH_SURGE");
    const mucus: DayLog[] = [{ date: addDays(S, 12), mucus: "EGG_WHITE" }, { date: addDays(S, 13), mucus: "WATERY" }, { date: addDays(S, 14), mucus: "STICKY" }];
    const o = detectOvulation({ startDate: S }, mucus, []);
    expect(o.method).toBe("MUCUS_PEAK");
    expect(o.date).toBe(addDays(S, 13));
  });
});

describe("summariseCycle", () => {
  it("computes length, luteal phase and FIGO class", () => {
    const c = summariseCycle({ startDate: S, nextStartDate: addDays(S, 28) }, period(S), ovulatoryTemps(S));
    expect(c.lengthDays).toBe(28);
    expect(c.lutealDays).toBe(15);
    expect(c.regularity).toBe("REGULAR");
  });
  it("flags a short luteal phase", () => {
    const c = summariseCycle({ startDate: S, nextStartDate: addDays(S, 22) }, period(S), ovulatoryTemps(S, 22));
    expect(c.lutealDays).toBe(9);
    expect(c.regularity).toBe("SHORT");
  });
});

describe("assessFigo", () => {
  const cyc = (lengths: number[]) => {
    let start = S;
    const out = lengths.map((l) => {
      const c = summariseCycle({ startDate: start, nextStartDate: addDays(start, l) }, period(start), []);
      start = addDays(start, l);
      return c;
    });
    return { out, last: start };
  };
  it("uses the age-dependent variation limit", () => {
    expect(variationLimit(24)).toBe(9);
    expect(variationLimit(33)).toBe(7);
  });
  it("normal cycles raise nothing", () => {
    const { out, last } = cyc([28, 29, 27, 30]);
    expect(assessFigo(out, addDays(last, 3), 30).status).toBe("NORMAL");
  });
  it("repeated long cycles are a P1 finding", () => {
    const { out, last } = cyc([42, 45, 30]);
    const f = assessFigo(out, addDays(last, 3), 30);
    expect(f.findings.find((x) => x.code === "LONG_CYCLES")?.level).toBe("P1");
    expect(f.findings.find((x) => x.code === "IRREGULAR_VARIATION")?.level).toBe("P1");
  });
  it("more than 90 days without a period is amenorrhoea", () => {
    const { out, last } = cyc([28]);
    expect(assessFigo(out, addDays(last, 95), 30).findings[0].code).toBe("AMENORRHOEA");
  });
});

describe("expectedCycleLength", () => {
  it("needs 3 cycles, otherwise uses the reported length with low confidence", () => {
    expect(expectedCycleLength([30, 31], 30)).toEqual({ value: 30, confidence: "low" });
    expect(expectedCycleLength([28, 28, 32]).value).toBe(30);
  });
});

describe("analyseCycles", () => {
  it("predicts the fertile window and escalates two short luteal phases", () => {
    const starts = [S, addDays(S, 22), addDays(S, 44)];
    const t = [...ovulatoryTemps(starts[0], 22), ...ovulatoryTemps(starts[1], 22)];
    const a = analyseCycles({ cycles: starts.map((startDate) => ({ startDate })), logs: starts.flatMap((s) => period(s)), temps: t, today: addDays(starts[2], 6), age: 30 });
    expect(a.ovulatory.shortLutealCycles).toBe(2);
    expect(a.escalations.some((e) => e.includes("Luteal phase"))).toBe(true);
    expect(a.prediction.cycleDay).toBe(7);
  });
  it("pauses predictions and alerts with hormonal contraception", () => {
    const a = analyseCycles({ cycles: [{ startDate: S }], logs: period(S), temps: [], today: addDays(S, 100), trackingMode: "HORMONAL_CONTRACEPTION" });
    expect(a.prediction.paused).toBe(true);
    expect(a.prediction.windowStart).toBeNull();
    expect(a.escalations).toEqual([]);
  });
  it("hides a calendar-only ovulation pin when cycles vary a lot", () => {
    const starts = [S, addDays(S, 25), addDays(S, 60), addDays(S, 86)];
    const a = analyseCycles({ cycles: starts.map((startDate) => ({ startDate })), logs: [], temps: [], today: addDays(starts[3], 5) });
    expect(a.prediction.variableMode).toBe(true);
    expect(a.prediction.predictedOvulation).toBeNull();
  });
});

describe("assessPmsPattern", () => {
  it("finds symptoms before periods that resolve after", () => {
    const starts = [S, addDays(S, 28), addDays(S, 56)];
    const cycles = starts.slice(0, 2).map((s, i) => summariseCycle({ startDate: s, nextStartDate: starts[i + 1] }, [], []));
    const logs: DayLog[] = [];
    for (const next of starts.slice(1)) {
      for (let i = -5; i < 0; i++) logs.push({ date: addDays(next, i), symptoms: ["BLOATING"], mood: ["IRRITABLE"] });
      for (let i = 4; i < 9; i++) logs.push({ date: addDays(next, i), symptoms: [], mood: ["CALM"] });
    }
    const p = assessPmsPattern(cycles, logs);
    expect(p.status).toBe("PATTERN");
    expect(p.topSymptoms).toContain("BLOATING");
  });
});

describe("alignLabs", () => {
  it("checks day 2–4 hormones and mid-luteal progesterone timing", () => {
    const c = summariseCycle({ startDate: S, nextStartDate: addDays(S, 28) }, period(S), ovulatoryTemps(S));
    const a = alignLabs(
      [
        { id: "1", code: "FSH", collectedAt: `${addDays(S, 2)}T09:00:00Z` },
        { id: "2", code: "FSH", collectedAt: `${addDays(S, 9)}T09:00:00Z` },
        { id: "3", code: "PROGESTERONE", collectedAt: `${addDays(S, 20)}T09:00:00Z` },
        { id: "4", code: "TSH", collectedAt: `${addDays(S, 9)}T09:00:00Z` }
      ],
      [c]
    );
    expect(a.map((x) => x.timing)).toEqual(["IN_WINDOW", "OUT_OF_WINDOW", "IN_WINDOW", "NOT_CYCLE_DEPENDENT"]);
    expect(a[2].daysAfterOvulation).toBe(7);
  });
});
