import { describe, expect, it } from "vitest";
import { shortReason } from "./format";

describe("shortReason", () => {
  it("summarises temperature alerts in plain words", () => {
    expect(
      shortReason("Longitudinal BBT time-series: monophasic thermal curve across 28 consecutive days (maximum thermal shift 0.01°C; physiological target ≥ 0.30°C).")
    ).toBe("No temperature rise across 28 days");
    expect(shortReason("Temperature: no sustained rise across 14 readings (largest shift 0.1 °C).")).toBe("No temperature rise across 14 readings");
  });
  it("summarises sleep alerts and joins several", () => {
    expect(shortReason("Temperature: no sustained rise across 12 readings (x). | Sleep: mean 4.5 h per night.")).toBe(
      "No temperature rise across 12 readings · Short or irregular sleep"
    );
  });
  it("falls back to the first sentence", () => {
    expect(shortReason("Clinician: Patient asked for a call back. More text.")).toBe("Patient asked for a call back");
    expect(shortReason(null)).toBe("Alert raised");
  });
});
