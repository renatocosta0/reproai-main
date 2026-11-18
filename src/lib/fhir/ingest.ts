import { prisma } from "../db";
import { audit } from "../audit";
import { hasConsent } from "../consent";
import { LABS, type LabCode } from "../labs";

// LOINC → ReproAI LabCode, built only from the LOINC codes recorded in LABS (src/lib/labs.ts).
// A marker without a LOINC code there is not imported: add its verified code to LABS first.
// Free-text names are not matched, because "sperm count" and "sperm concentration" are
// different measurements and a guess would put a wrong value in the record.
export const LOINC_TO_LAB_CODE: Record<string, LabCode> = Object.fromEntries(
  Object.values(LABS)
    .filter((l) => l.loinc)
    .map((l) => [l.loinc as string, l.code])
);

// Units accepted per marker, exactly as written or in UCUM form. Values are stored without
// conversion, so a result in any other unit (e.g. AMH in pmol/L) is skipped, not rescaled.
// mIU/mL equals IU/L, so FSH accepts both.
const ACCEPTED_UNITS: Partial<Record<LabCode, string[]>> = {
  AMH: ["ng/ml"],
  FSH: ["iu/l", "[iu]/l", "miu/ml", "m[iu]/ml"],
  SPERM_CONCENTRATION: ["million/ml", "10*6/ml", "10^6/ml"]
};

export function isAcceptedUnit(code: LabCode, unit: string): boolean {
  const u = unit.trim().toLowerCase();
  if (!u) return false;
  const accepted = ACCEPTED_UNITS[code] ?? [LABS[code].unit.toLowerCase()];
  return accepted.includes(u);
}

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

/** Maps a LOINC code to a ReproAI LabCode, or null when it is not one we record. */
export function resolveLabCode(rawCode: string | undefined): LabCode | null {
  if (!rawCode) return null;
  return LOINC_TO_LAB_CODE[rawCode.trim()] ?? null;
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

const LOINC_SYSTEM = "http://loinc.org";

/**
 * Extracts observation data from an HL7 FHIR R4 Observation resource.
 * Missing parts come back as null; nothing is filled in.
 */
export function parseFhirObservation(resource: FhirObservationResource | null | undefined): {
  code: LabCode | null;
  value: number | null;
  unit: string;
  /** When the sample was collected; null when the resource has no valid date. */
  collectedAt: Date | null;
  patientId: string | null;
  facility: string;
} {
  // 1. Code: only LOINC codings (or codings with no system) are considered.
  let resolvedCode: LabCode | null = null;
  if (Array.isArray(resource?.code?.coding)) {
    for (const c of resource.code.coding) {
      if (c?.code && (!c.system || c.system === LOINC_SYSTEM)) {
        resolvedCode = resolveLabCode(String(c.code));
        if (resolvedCode) break;
      }
    }
  }

  // 2. Value and unit
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

  // 3. Collection date. `issued` is when the report was released, not when the sample was
  // taken, so it is not used; a result without a collection date is not imported.
  const rawDate = resource?.effectiveDateTime || resource?.effectivePeriod?.start;
  const parsedDate = rawDate ? new Date(rawDate) : null;
  const collectedAt = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null;

  // 4. Patient reference
  let patientId: string | null = null;
  const subjectRef = resource?.subject?.reference || resource?.patient?.reference;
  if (subjectRef && typeof subjectRef === "string") {
    patientId = subjectRef.replace(/^Patient\//, "").trim() || null;
  }

  // 5. Performer / facility (used only in the audit note)
  const facility = resource?.performer?.[0]?.display || "external laboratory (not named)";

  return { code: resolvedCode, value, unit, collectedAt, patientId, facility };
}

/**
 * Ingests a single laboratory value for a patient, enforcing consent (LAB_RESULTS),
 * the physiological range, the unit, and skipping exact duplicates of an earlier import.
 */
export async function ingestLabRecord(params: {
  userId: string;
  code: LabCode;
  value: number;
  collectedAt: Date;
  unit: string;
  facility?: string;
  actorId?: string;
}): Promise<{ ok: boolean; id?: string; duplicate?: boolean; error?: string }> {
  const { userId, code, value, collectedAt, unit, facility, actorId = "system:ehr_malaffi" } = params;

  const def = LABS[code];
  if (!def) return { ok: false, error: `Unsupported biomarker code: ${code}` };
  if (!Number.isFinite(value) || value < def.min || value > def.max) {
    return { ok: false, error: `Value ${value} is outside valid physiological range for ${def.label} (${def.min} - ${def.max})` };
  }
  if (!isAcceptedUnit(code, unit)) {
    return { ok: false, error: `Unit "${unit || "missing"}" is not accepted for ${def.label} (expected ${def.unit}); values are not converted` };
  }
  if (collectedAt.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
    return { ok: false, error: `Collection date ${collectedAt.toISOString()} is in the future` };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "PATIENT") return { ok: false, error: `Patient not found: ${userId}` };

  const consented = await hasConsent(userId, "LAB_RESULTS");
  if (!consented) {
    return { ok: false, error: "Patient has not consented to laboratory result sharing (Gate B hold)." };
  }

  // Re-syncing the same results must not create duplicate rows.
  const existing = await prisma.labResult.findFirst({
    where: { userId, code, value, collectedAt, source: "EHR_MALAFFI" },
    select: { id: true }
  });
  if (existing) return { ok: true, id: existing.id, duplicate: true };

  // Stored in the marker's canonical unit: accepted units are equal to it (e.g. mIU/mL = IU/L).
  const lab = await prisma.labResult.create({
    data: { userId, code, value, unit: def.unit, collectedAt, source: "EHR_MALAFFI", enteredById: actorId }
  });

  await audit(userId, "ehr_lab_imported", `${code}=${value} ${def.unit} from ${facility || "external laboratory"}`);

  return { ok: true, id: lab.id };
}

/**
 * Ingests an HL7 FHIR R4 payload (single Observation or Bundle of Observations).
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
      result.errors.push(`Skipped observation: LOINC code not mapped to a ReproAI marker`);
      continue;
    }
    if (parsed.value === null) {
      result.skipped++;
      result.errors.push(`Skipped ${parsed.code}: missing valueQuantity or integer value`);
      continue;
    }
    if (!parsed.collectedAt) {
      result.skipped++;
      result.errors.push(`Skipped ${parsed.code}: missing collection date (effectiveDateTime)`);
      continue;
    }

    const ingested = await ingestLabRecord({
      userId: targetUserId,
      code: parsed.code,
      value: parsed.value,
      unit: parsed.unit,
      collectedAt: parsed.collectedAt,
      facility: parsed.facility
    });

    if (ingested.ok && ingested.duplicate) {
      result.skipped++;
      result.errors.push(`Skipped ${parsed.code}: already imported`);
    } else if (ingested.ok && ingested.id) {
      result.imported++;
      result.results.push({
        id: ingested.id,
        code: parsed.code,
        value: parsed.value,
        unit: LABS[parsed.code].unit,
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
