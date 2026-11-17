import { describe, it, expect } from "vitest";
import { resolveLabCode, parseFhirObservation, LOINC_TO_LAB_CODE } from "./ingest";

describe("FHIR R4 LOINC mapping & Observation parser", () => {
  it("resolves standard LOINC codes to ReproAI LabCodes", () => {
    expect(resolveLabCode("68343-3")).toBe("AMH");
    expect(resolveLabCode("67786-4")).toBe("AMH");
    expect(resolveLabCode("95410-7")).toBe("AFC");
    expect(resolveLabCode("9780-8")).toBe("SPERM_CONCENTRATION");
    expect(resolveLabCode("15067-2")).toBe("FSH");
    expect(resolveLabCode("3160-9")).toBe("SEMEN_VOLUME");
    expect(resolveLabCode("unknown-loinc")).toBeNull();
  });

  it("parses a standard HL7 FHIR R4 Observation resource with LOINC coding", () => {
    const fhirObservation = {
      resourceType: "Observation",
      id: "obs-amh-001",
      status: "final",
      code: {
        coding: [
          {
            system: "http://loinc.org",
            code: "68343-3",
            display: "Anti-Mullerian hormone [Mass/volume] in Serum or Plasma"
          }
        ],
        text: "AMH level"
      },
      subject: {
        reference: "Patient/patient-nadia-001"
      },
      effectiveDateTime: "2026-11-15T08:30:00Z",
      valueQuantity: {
        value: 1.3,
        unit: "ng/mL",
        system: "http://unitsofmeasure.org",
        code: "ng/mL"
      },
      performer: [
        {
          display: "Sheikh Shakhbout Medical City (SSMC) Central Lab"
        }
      ]
    };

    const parsed = parseFhirObservation(fhirObservation);
    expect(parsed.code).toBe("AMH");
    expect(parsed.value).toBe(1.3);
    expect(parsed.unit).toBe("ng/mL");
    expect(parsed.patientId).toBe("patient-nadia-001");
    expect(parsed.facility).toBe("Sheikh Shakhbout Medical City (SSMC) Central Lab");
    expect(parsed.collectedAt.toISOString()).toBe("2026-11-15T08:30:00.000Z");
  });

  it("parses an Observation with semen analysis concentration", () => {
    const spermObs = {
      resourceType: "Observation",
      id: "obs-sperm-002",
      status: "final",
      code: {
        coding: [{ system: "http://loinc.org", code: "9780-8" }]
      },
      subject: { reference: "Patient/patient-yousef-002" },
      valueQuantity: { value: 18.5, unit: "million/mL" },
      performer: [{ display: "HealthPlus Fertility Center Lab" }]
    };

    const parsed = parseFhirObservation(spermObs);
    expect(parsed.code).toBe("SPERM_CONCENTRATION");
    expect(parsed.value).toBe(18.5);
    expect(parsed.patientId).toBe("patient-yousef-002");
    expect(parsed.facility).toBe("HealthPlus Fertility Center Lab");
  });

  it("handles missing valueQuantity or invalid data safely without throwing", () => {
    const invalidObs = {
      resourceType: "Observation",
      code: { text: "Unrecognized test" }
    };
    const parsed = parseFhirObservation(invalidObs);
    expect(parsed.code).toBeNull();
    expect(parsed.value).toBeNull();
  });
});
