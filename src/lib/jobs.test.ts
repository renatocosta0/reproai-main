import { describe, expect, it, vi } from "vitest";
import { reminderFor, weeklySummaryText } from "./jobs";
import { rollingBaseline } from "./baselines";
import { addDays, analyseCycles } from "./cycle";

vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/notifications", () => ({ dispatchCareNotification: vi.fn() }));
vi.mock("@/lib/observation-alerts", () => ({ analyseAndAlert: vi.fn() }));
vi.mock("@/lib/cycle-server", () => ({ refreshCycleSignals: vi.fn() }));
vi.mock("@/lib/consent", () => ({ consentingUserIds: vi.fn() }));

const S = "2026-10-01";

describe("reminderFor (P3 adherence)", () => {
  it("asks gently when a cycle runs past day 40", () => {
    const a = analyseCycles({ cycles: [{ startDate: S }], logs: [], temps: [], today: addDays(S, 44) });
    expect(reminderFor(a, new Set(), addDays(S, 44), "HEALTH_TRACKING")).toContain("Still tracking");
  });
  it("nudges for morning temperatures in the fertile window when trying to conceive", () => {
    const a = analyseCycles({ cycles: [{ startDate: S }], logs: [], temps: [], today: addDays(S, 14) });
    expect(reminderFor(a, new Set(), addDays(S, 14), "TRYING_TO_CONCEIVE")).toContain("fertile window");
    expect(reminderFor(a, new Set(), addDays(S, 14), "HEALTH_TRACKING")).toBeNull();
  });
  it("never reminds in a paused mode", () => {
    const a = analyseCycles({ cycles: [{ startDate: S }], logs: [], temps: [], today: addDays(S, 60), trackingMode: "POSTPARTUM" });
    expect(reminderFor(a, new Set(), addDays(S, 60), "POSTPARTUM")).toBeNull();
  });
});

describe("rollingBaseline", () => {
  it("flags a 7-day mean outside the personal 28-day mean ± 2 SD", () => {
    const now = new Date("2026-11-25T12:00:00Z");
    const pts = Array.from({ length: 35 }, (_, i) => ({ date: new Date(now.getTime() - i * 86_400_000), value: i < 7 ? 66 : 58 + (i % 3) }));
    const b = rollingBaseline("40443-4", pts, now);
    expect(b.deviation).toBe("HIGH");
    expect(weeklySummaryText({ sleep: rollingBaseline("s", [], now), restingHeartRate: b, hrv: rollingBaseline("h", [], now) })).toContain("higher than your usual");
  });
});
