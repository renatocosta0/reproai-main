import { describe, expect, it } from "vitest";
import { normaliseObservation } from "./observation-analysis";

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
