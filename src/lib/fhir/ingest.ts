import { prisma } from "../db";
import { audit } from "../audit";
import { hasConsent } from "../consent";
import { LABS, type LabCode } from "../labs";

// Standard LOINC to ReproAI LabCode mapping
export const LOINC_TO_LAB_CODE: Record<string, LabCode> = {
  // Anti-Müllerian Hormone
  "68343-3": "AMH",
  "67786-4": "AMH",
  "amh": "AMH",
  // Antral Follicle Count
  "95410-7": "AFC",
  "afc": "AFC",
  // FSH
  "15067-2": "FSH",
  "fsh": "FSH",
  // Semen parameters (WHO 2025 / Daman Thiqa)
  "9780-8": "SPERM_CONCENTRATION",
  "sperm-count": "SPERM_CONCENTRATION",
  "sperm_concentration": "SPERM_CONCENTRATION",
  "3160-9": "SEMEN_VOLUME",
  "semen_volume": "SEMEN_VOLUME",
  "9781-6": "SPERM_TOTAL_MOTILITY",
  "sperm_total_motility": "SPERM_TOTAL_MOTILITY",
  "9782-4": "SPERM_PROGRESSIVE_MOTILITY",
  "sperm_progressive_motility": "SPERM_PROGRESSIVE_MOTILITY",
  "9783-2": "SPERM_MORPHOLOGY",
  "sperm_morphology": "SPERM_MORPHOLOGY"
};

export interface IngestedLabResult {
  id: string;
  code: LabCode;
  value: number;
  unit: string;
  collectedAt: string;
  source: string;
  patientId: string;
}

export interface IngestionResult {
  ok: boolean;
  imported: number;
  skipped: number;
  results: IngestedLabResult[];
  errors: string[];
}

/**
 * Normalizes an observation code from LOINC or text to ReproAI LabCode.
 */
export function resolveLabCode(rawCode: string | undefined): LabCode | null {
  if (!rawCode) return null;
  const cleaned = rawCode.toLowerCase().trim();
  return LOINC_TO_LAB_CODE[cleaned] ?? LOINC_TO_LAB_CODE[rawCode.toUpperCase().trim()] ?? null;
}

export interface FhirCoding {
  system?: string;
  code?: string;
  display?: string;
}

export interface FhirObservationResource {
  resourceType?: string;
  id?: string;
  code?: {
    coding?: FhirCoding[];
    text?: string;
  };
  valueQuantity?: {
    value?: number;
    unit?: string;
    code?: string;
  };
  valueInteger?: number;
  valueString?: string;
  effectiveDateTime?: string;
  issued?: string;
  effectivePeriod?: { start?: string };
  subject?: { reference?: string };
  patient?: { reference?: string };
  performer?: Array<{ display?: string }>;
}

export interface FhirBundleEntry {
  resource?: FhirObservationResource;
}

export interface FhirBundleResource {
  resourceType?: string;
  entry?: FhirBundleEntry[];
  observations?: FhirObservationResource[];
}

/**
 * Extracts observation data from a standard HL7 FHIR R4 Observation resource.
 */
export function parseFhirObservation(resource: FhirObservationResource | null | undefined): {
  code: LabCode | null;
  value: number | null;
  unit: string;
  collectedAt: Date;
  patientId: string | null;
  facility: string;
} {
  // 1. Resolve Code (checking codings for LOINC, then text)
  let resolvedCode: LabCode | null = null;
  if (Array.isArray(resource?.code?.coding)) {
    for (const c of resource.code.coding) {
      if (c?.code) {
        resolvedCode = resolveLabCode(String(c.code));
        if (resolvedCode) break;
      }
    }
  }
  if (!resolvedCode && resource?.code?.text) {
    resolvedCode = resolveLabCode(String(resource.code.text));
  }

  // 2. Resolve Value and Unit
  let value: number | null = null;
  let unit = "";
  if (typeof resource?.valueQuantity?.value === "number") {
    value = resource.valueQuantity.value;
    unit = String(resource.valueQuantity.unit || resource.valueQuantity.code || "");
  } else if (typeof resource?.valueInteger === "number") {
    value = resource.valueInteger;
  } else if (typeof resource?.valueString === "string") {
    const parsed = parseFloat(resource.valueString);
    if (!Number.isNaN(parsed)) value = parsed;
  }

  // 3. Resolve Effective Date
  const rawDate = resource?.effectiveDateTime || resource?.issued || resource?.effectivePeriod?.start;
  const collectedAt = rawDate ? new Date(rawDate) : new Date();

  // 4. Resolve Patient Reference
  let patientId: string | null = null;
  const subjectRef = resource?.subject?.reference || resource?.patient?.reference;
  if (subjectRef && typeof subjectRef === "string") {
    patientId = subjectRef.replace(/^Patient\//, "").trim();
  }

  // 5. Performer / Facility
  const facility = resource?.performer?.[0]?.display || "Hospital Laboratory Information System (LIS)";

  return {
    code: resolvedCode,
    value,
    unit,
    collectedAt: Number.isNaN(collectedAt.getTime()) ? new Date() : collectedAt,
    patientId,
    facility
  };
}

/**
 * Ingests a single laboratory point into ReproAI for a specific user,
 * enforcing Gate B (Consent) and biomarker boundary validation.
 */
export async function ingestLabRecord(params: {
  userId: string;
  code: LabCode;
  value: number;
  collectedAt: Date;
  unit?: string;
  facility?: string;
  actorId?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const { userId, code, value, collectedAt, facility, actorId = "system:ehr_malaffi" } = params;

  // 1. Validate biomarker definition and limits
  const def = LABS[code];
  if (!def) return { ok: false, error: `Unsupported biomarker code: ${code}` };
  if (!Number.isFinite(value) || value < def.min || value > def.max) {
    return { ok: false, error: `Value ${value} is outside valid physiological range for ${def.label} (${def.min} - ${def.max})` };
  }

  // 2. Validate patient exists
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: `Patient not found: ${userId}` };

  // 3. Gate B: Verify patient has consented to LAB_RESULTS
  const consented = await hasConsent(userId, "LAB_RESULTS");
  if (!consented) {
    return { ok: false, error: "Patient has not consented to laboratory result sharing (Gate B hold)." };
  }

  // 4. Ingest record into Prisma with source=EHR_MALAFFI
  const unit = params.unit || def.unit;
  const lab = await prisma.labResult.create({
    data: {
      userId,
      code,
      value,
      unit,
      collectedAt,
      source: "EHR_MALAFFI",
      enteredById: actorId
    }
  });

  // 5. Audit trail
  await audit(userId, "ehr_lab_imported", `${code}=${value} ${unit} from ${facility || "Malaffi HIE"}`);

  return { ok: true, id: lab.id };
}

/**
 * Ingests an HL7 FHIR R4 payload (single Observation or full Bundle).
 */
export async function ingestFhirPayload(
  payload: FhirBundleResource | FhirObservationResource | unknown,
  fallbackUserId?: string
): Promise<IngestionResult> {
  const result: IngestionResult = { ok: true, imported: 0, skipped: 0, results: [], errors: [] };
  if (!payload || typeof payload !== "object") {
    return { ...result, ok: false, errors: ["Invalid payload: expected JSON object"] };
  }

  const p = payload as FhirBundleResource & FhirObservationResource;
  let observations: FhirObservationResource[] = [];
  if (p.resourceType === "Bundle" && Array.isArray(p.entry)) {
    observations = p.entry
      .map((e) => e?.resource)
      .filter((r): r is FhirObservationResource => Boolean(r && r.resourceType === "Observation"));
  } else if (p.resourceType === "Observation") {
    observations = [p];
  } else if (Array.isArray(p.observations)) {
    observations = p.observations.filter(Boolean);
  } else if (Array.isArray(p)) {
    observations = (p as FhirObservationResource[]).filter(Boolean);
  }

  if (observations.length === 0) {
    return { ...result, ok: false, errors: ["No FHIR Observation resources found in payload"] };
  }

  for (const obs of observations) {
    const parsed = parseFhirObservation(obs);
    const targetUserId = parsed.patientId || fallbackUserId;

    if (!targetUserId) {
      result.skipped++;
      result.errors.push(`Skipped observation: missing patient reference (subject.reference or fallbackUserId required)`);
      continue;
    }

    if (!parsed.code) {
      result.skipped++;
      result.errors.push(`Skipped observation: unmapped LOINC or biomarker code`);
      continue;
    }

    if (parsed.value === null) {
      result.skipped++;
      result.errors.push(`Skipped ${parsed.code}: missing valueQuantity or integer value`);
      continue;
    }

    // Attempt ingestion
    const ingested = await ingestLabRecord({
      userId: targetUserId,
      code: parsed.code,
      value: parsed.value,
      unit: parsed.unit,
      collectedAt: parsed.collectedAt,
      facility: parsed.facility
    });

    if (ingested.ok && ingested.id) {
      result.imported++;
      result.results.push({
        id: ingested.id,
        code: parsed.code,
        value: parsed.value,
        unit: parsed.unit || LABS[parsed.code].unit,
        collectedAt: parsed.collectedAt.toISOString(),
        source: "EHR_MALAFFI",
        patientId: targetUserId
      });
    } else {
      result.skipped++;
      result.errors.push(`Failed to ingest ${parsed.code} for ${targetUserId}: ${ingested.error}`);
    }
  }

  result.ok = result.imported > 0;
  return result;
}
