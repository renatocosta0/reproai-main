// Laboratory and ultrasound markers used by ReproAI, with units, LOINC codes
// where they exist, and the reference limits applied by the rules engine.
//
// Semen lower limits follow the values used in the Daman Thiqa ART adjudication
// guideline (v3.6, Nov 2025), which is the local payer rule set in Abu Dhabi.

export type LabCode =
  | "AMH"
  | "AFC"
  | "FSH"
  | "SPERM_CONCENTRATION"
  | "SPERM_TOTAL_MOTILITY"
  | "SPERM_PROGRESSIVE_MOTILITY"
  | "SPERM_MORPHOLOGY"
  | "SEMEN_VOLUME";

export type LabSource = "CLINICIAN_VERIFIED" | "SELF_REPORTED" | "IMPORTED" | "PROFILE" | "EHR_MALAFFI";

export interface LabDef {
  code: LabCode;
  label: string;
  unit: string;
  loinc?: string;
  sex: "female" | "male";
  /** Lower reference limit; values below it are flagged. */
  lowerLimit?: number;
  limitSource?: string;
  min: number;
  max: number;
  step: string;
}

export const THIQA = "Daman Thiqa ART guideline v3.6 (2025)";

export const LABS: Record<LabCode, LabDef> = {
  AMH: { code: "AMH", label: "AMH (anti-Müllerian hormone)", unit: "ng/mL", loinc: "68343-3", sex: "female", lowerLimit: 1.1, limitSource: `${THIQA}: reduced ovarian reserve`, min: 0, max: 30, step: "0.01" },
  AFC: { code: "AFC", label: "Antral follicle count", unit: "follicles", sex: "female", lowerLimit: 5, limitSource: `${THIQA}: reduced ovarian reserve`, min: 0, max: 80, step: "1" },
  FSH: { code: "FSH", label: "FSH (day 2–5)", unit: "IU/L", loinc: "15067-2", sex: "female", min: 0, max: 200, step: "0.1" },
  SPERM_CONCENTRATION: { code: "SPERM_CONCENTRATION", label: "Sperm concentration", unit: "million/mL", loinc: "9780-8", sex: "male", lowerLimit: 15, limitSource: `${THIQA} (WHO reference)`, min: 0, max: 500, step: "0.1" },
  SPERM_TOTAL_MOTILITY: { code: "SPERM_TOTAL_MOTILITY", label: "Total motility", unit: "%", sex: "male", lowerLimit: 40, limitSource: `${THIQA} (WHO reference)`, min: 0, max: 100, step: "1" },
  SPERM_PROGRESSIVE_MOTILITY: { code: "SPERM_PROGRESSIVE_MOTILITY", label: "Progressive motility", unit: "%", sex: "male", lowerLimit: 32, limitSource: `${THIQA} (WHO reference)`, min: 0, max: 100, step: "1" },
  SPERM_MORPHOLOGY: { code: "SPERM_MORPHOLOGY", label: "Normal morphology", unit: "%", sex: "male", lowerLimit: 4, limitSource: `${THIQA} (WHO reference)`, min: 0, max: 100, step: "1" },
  SEMEN_VOLUME: { code: "SEMEN_VOLUME", label: "Semen volume", unit: "mL", sex: "male", lowerLimit: 1.5, limitSource: `${THIQA} (WHO reference)`, min: 0, max: 20, step: "0.1" }
};

export const SOURCE_LABELS: Record<LabSource, string> = {
  CLINICIAN_VERIFIED: "Clinician verified",
  EHR_MALAFFI: "Verified from Malaffi HIE",
  IMPORTED: "Imported record",
  SELF_REPORTED: "Self-reported",
  PROFILE: "Recorded earlier (source not documented)"
};

export function labsForSex(sex: string | null | undefined): LabDef[] {
  return Object.values(LABS).filter((l) => !sex || l.sex === sex);
}

export function isBelowLimit(code: LabCode, value: number): boolean {
  const lim = LABS[code].lowerLimit;
  return lim !== undefined && value < lim;
}

export interface LabPoint {
  id: string;
  code: LabCode;
  value: number;
  unit: string;
  collectedAt: string;
  source: LabSource;
}

/** Latest value per code (input oldest-first or any order). */
export function latestByCode(points: LabPoint[]): Partial<Record<LabCode, LabPoint>> {
  const out: Partial<Record<LabCode, LabPoint>> = {};
  for (const p of points) {
    const cur = out[p.code];
    if (!cur || new Date(p.collectedAt) > new Date(cur.collectedAt)) out[p.code] = p;
  }
  return out;
}

export const HISTORY_FLAGS: { id: string; label: string; sex?: "female" | "male" }[] = [
  { id: "PCOS", label: "Polycystic ovary syndrome (PCOS)", sex: "female" },
  { id: "ENDOMETRIOSIS", label: "Endometriosis", sex: "female" },
  { id: "PELVIC_INFECTION", label: "Pelvic infection (e.g. PID)", sex: "female" },
  { id: "PELVIC_SURGERY", label: "Pelvic or ovarian surgery", sex: "female" },
  { id: "UNDESCENDED_TESTIS", label: "Undescended testis or testicular surgery", sex: "male" },
  { id: "VARICOCELE", label: "Varicocele", sex: "male" },
  { id: "CHEMOTHERAPY", label: "Chemotherapy or radiotherapy" },
  { id: "GENETIC_DISORDER", label: "Known genetic or chromosomal condition" },
  { id: "THYROID", label: "Thyroid condition" },
  { id: "DIABETES", label: "Diabetes" }
];
