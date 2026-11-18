import { afterEach, describe, it, expect } from "vitest";
import { resolveLabCode, parseFhirObservation, isAcceptedUnit, LOINC_TO_LAB_CODE } from "./ingest";
import { isAuthorized, partnerKey } from "./partner-key";
import { tokenRequest } from "../azure/fhir-token";
import { LABS } from "../labs";

describe("FHIR R4 LOINC mapping & Observation parser", () => {
  it("maps only the LOINC codes recorded in LABS", () => {
    expect(resolveLabCode("68343-3")).toBe("AMH");
    expect(resolveLabCode("15067-2")).toBe("FSH");
    expect(resolveLabCode("9780-8")).toBe("SPERM_CONCENTRATION");
    expect(resolveLabCode("unknown-loinc")).toBeNull();
    for (const [loinc, code] of Object.entries(LOINC_TO_LAB_CODE)) {
      expect(LABS[code].loinc).toBe(loinc);
    }
  });

  it("does not guess a marker from free text", () => {
    expect(resolveLabCode("amh")).toBeNull();
    expect(resolveLabCode("sperm-count")).toBeNull();
    const parsed = parseFhirObservation({ resourceType: "Observation", code: { text: "AMH" }, valueQuantity: { value: 2, unit: "ng/mL" } });
    expect(parsed.code).toBeNull();
  });

  it("ignores codings from a non-LOINC system", () => {
    const parsed = parseFhirObservation({
      resourceType: "Observation",
      code: { coding: [{ system: "http://snomed.info/sct", code: "68343-3" }] }
    });
    expect(parsed.code).toBeNull();
  });

  it("parses a standard HL7 FHIR R4 Observation resource with LOINC coding", () => {
    const parsed = parseFhirObservation({
      resourceType: "Observation",
      id: "obs-amh-001",
      code: { coding: [{ system: "http://loinc.org", code: "68343-3" }], text: "AMH level" },
      subject: { reference: "Patient/patient-nadia-001" },
      effectiveDateTime: "2026-11-15T08:30:00Z",
      valueQuantity: { value: 1.3, unit: "ng/mL", code: "ng/mL" },
      performer: [{ display: "Central Lab" }]
    });
    expect(parsed.code).toBe("AMH");
    expect(parsed.value).toBe(1.3);
    expect(parsed.unit).toBe("ng/mL");
    expect(parsed.patientId).toBe("patient-nadia-001");
    expect(parsed.facility).toBe("Central Lab");
    expect(parsed.collectedAt?.toISOString()).toBe("2026-11-15T08:30:00.000Z");
  });

  it("returns no collection date instead of inventing one", () => {
    const noDate = parseFhirObservation({
      resourceType: "Observation",
      code: { coding: [{ system: "http://loinc.org", code: "9780-8" }] },
      valueQuantity: { value: 18.5, unit: "million/mL" },
      issued: "2026-11-16T10:00:00Z"
    });
    expect(noDate.collectedAt).toBeNull();
    const badDate = parseFhirObservation({ resourceType: "Observation", effectiveDateTime: "not a date" });
    expect(badDate.collectedAt).toBeNull();
  });

  it("handles missing valueQuantity or invalid data safely without throwing", () => {
    const parsed = parseFhirObservation({ resourceType: "Observation", code: { text: "Unrecognized test" } });
    expect(parsed.code).toBeNull();
    expect(parsed.value).toBeNull();
  });
});

describe("unit check (values are not converted)", () => {
  it("accepts the canonical unit and its UCUM equivalents", () => {
    expect(isAcceptedUnit("AMH", "ng/mL")).toBe(true);
    expect(isAcceptedUnit("FSH", "mIU/mL")).toBe(true);
    expect(isAcceptedUnit("FSH", "[IU]/L")).toBe(true);
    expect(isAcceptedUnit("SPERM_CONCENTRATION", "10*6/mL")).toBe(true);
  });
  it("rejects other units and a missing unit", () => {
    expect(isAcceptedUnit("AMH", "pmol/L")).toBe(false);
    expect(isAcceptedUnit("AMH", "")).toBe(false);
  });
});

describe("inbound partner key", () => {
  const saved = { key: process.env.REPROAI_PARTNER_API_KEY, auth: process.env.AUTH_SECRET };
  afterEach(() => {
    process.env.REPROAI_PARTNER_API_KEY = saved.key;
    process.env.AUTH_SECRET = saved.auth;
  });
  const strong = "a".repeat(40);

  it("is disabled without a key, and never falls back to AUTH_SECRET", () => {
    delete process.env.REPROAI_PARTNER_API_KEY;
    process.env.AUTH_SECRET = "session-signing-secret-that-is-long-enough-1234";
    expect(partnerKey()).toBeNull();
  });
  it("rejects the demo key and short keys", () => {
    process.env.REPROAI_PARTNER_API_KEY = "sk_reproai_partner_uae_demo_key";
    expect(partnerKey()).toBeNull();
    process.env.REPROAI_PARTNER_API_KEY = "short";
    expect(partnerKey()).toBeNull();
  });
  it("accepts the exact key as Bearer or X-API-Key, and nothing else", () => {
    expect(isAuthorized(new Headers({ authorization: `Bearer ${strong}` }), strong)).toBe(true);
    expect(isAuthorized(new Headers({ "x-api-key": strong }), strong)).toBe(true);
    expect(isAuthorized(new Headers({ authorization: "Bearer wrong" }), strong)).toBe(false);
    expect(isAuthorized(new Headers({ authorization: "Bearer " }), strong)).toBe(false);
    expect(isAuthorized(new Headers(), strong)).toBe(false);
  });
});

describe("Azure FHIR token request", () => {
  it("sends the client secret to Entra ID with the FHIR audience scope", () => {
    const { url, body } = tokenRequest({
      endpoint: "https://ws-fhir.fhir.azurehealthcareapis.com",
      tenantId: "tenant-1",
      clientId: "client-1",
      clientSecret: "secret-1"
    });
    expect(url).toBe("https://login.microsoftonline.com/tenant-1/oauth2/v2.0/token");
    expect(body.get("grant_type")).toBe("client_credentials");
    expect(body.get("scope")).toBe("https://ws-fhir.fhir.azurehealthcareapis.com/.default");
    expect(body.get("client_secret")).toBe("secret-1");
  });
});
