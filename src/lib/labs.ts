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
  | "SEMEN_VOLUME"
  | "LH"
  | "ESTRADIOL"
  | "PROGESTERONE"
  | "TSH"
  | "FREE_T4"
  | "PROLACTIN"
  | "HBA1C"
  | "FASTING_INSULIN"
  | "VITAMIN_D";

export type LabSource = "CLINICIAN_VERIFIED" | "SELF_REPORTED" | "IMPORTED" | "PROFILE" | "EHR_MALAFFI";

export interface LabDef {
  code: LabCode;
  label: string;
  unit: string;
  loinc?: string;
  /** "any" = relevant to both partners. */
  sex: "female" | "male" | "any";
  /** Lower reference limit; values below it are flagged. */
  lowerLimit?: number;
  /** Upper reference limit; values above it are flagged. */
  upperLimit?: number;
  limitSource?: string;
  /** When in the cycle the sample should be taken (shown with the result). */
  cycleTiming?: string;
  min: number;
  max: number;
  step: string;
}

export const THIQA = "Daman Thiqa ART guideline v3.6 (2025)";

export const LABS: Record<LabCode, LabDef> = {
  AMH: { code: "AMH", label: "AMH (anti-Müllerian hormone)", unit: "ng/mL", loinc: "68343-3", sex: "female", lowerLimit: 1.1, limitSource: `${THIQA}: reduced ovarian reserve`, min: 0, max: 30, step: "0.01" },
  AFC: { code: "AFC", label: "Antral follicle count", unit: "follicles", sex: "female", lowerLimit: 5, limitSource: `${THIQA}: reduced ovarian reserve`, min: 0, max: 80, step: "1" },
  FSH: { code: "FSH", label: "FSH (day 2–5)", unit: "IU/L", loinc: "15067-2", sex: "female", min: 0, max: 200, step: "0.1", cycleTiming: "Cycle day 2–4" },
  LH: { code: "LH", label: "LH (day 2–4)", unit: "IU/L", loinc: "10501-5", sex: "female", min: 0, max: 200, step: "0.1", cycleTiming: "Cycle day 2–4" },
  ESTRADIOL: { code: "ESTRADIOL", label: "Estradiol (day 2–4)", unit: "pg/mL", loinc: "2243-4", sex: "female", min: 0, max: 5000, step: "1", cycleTiming: "Cycle day 2–4" },
  PROGESTERONE: { code: "PROGESTERONE", label: "Progesterone (mid-luteal)", unit: "ng/mL", loinc: "2839-9", sex: "female", lowerLimit: 3, limitSource: "Mid-luteal progesterone ≥ 3 ng/mL supports ovulation (ASRM 2015; NICE CG156)", min: 0, max: 100, step: "0.1", cycleTiming: "About 7 days after ovulation (5–9)" },
  TSH: { code: "TSH", label: "TSH", unit: "mIU/L", loinc: "3016-3", sex: "any", lowerLimit: 0.4, upperLimit: 4.0, limitSource: "Laboratory reference range; ASRM 2015 (subclinical hypothyroidism in infertility)", min: 0, max: 100, step: "0.01" },
  FREE_T4: { code: "FREE_T4", label: "Free T4", unit: "ng/dL", loinc: "3024-7", sex: "any", lowerLimit: 0.8, upperLimit: 1.8, limitSource: "Laboratory reference range (varies by laboratory)", min: 0, max: 10, step: "0.01" },
  PROLACTIN: { code: "PROLACTIN", label: "Prolactin", unit: "ng/mL", loinc: "2842-3", sex: "any", upperLimit: 25, limitSource: "Endocrine Society hyperprolactinaemia guideline (2011): repeat a raised value before investigating", min: 0, max: 1000, step: "0.1" },
  HBA1C: { code: "HBA1C", label: "HbA1c", unit: "%", loinc: "4548-4", sex: "any", upperLimit: 5.7, limitSource: "ADA Standards of Care: 5.7–6.4 % prediabetes, ≥ 6.5 % diabetes", min: 3, max: 20, step: "0.1" },
  FASTING_INSULIN: { code: "FASTING_INSULIN", label: "Fasting insulin", unit: "µIU/mL", loinc: "27873-9", sex: "any", min: 0, max: 300, step: "0.1" },
  VITAMIN_D: { code: "VITAMIN_D", label: "Vitamin D (25-OH)", unit: "ng/mL", loinc: "1989-3", sex: "any", lowerLimit: 20, limitSource: "Endocrine Society (2011): < 20 ng/mL deficiency", min: 0, max: 200, step: "0.1" },
  SPERM_CONCENTRATION: { code: "SPERM_CONCENTRATION", label: "Sperm concentration", unit: "million/mL", loinc: "9780-8", sex: "male", lowerLimit: 15, limitSource: `${THIQA} (WHO reference)`, min: 0, max: 500, step: "0.1" },
  SPERM_TOTAL_MOTILITY: { code: "SPERM_TOTAL_MOTILITY", label: "Total motility", unit: "%", sex: "male", lowerLimit: 40, limitSource: `${THIQA} (WHO reference)`, min: 0, max: 100, step: "1" },
  SPERM_PROGRESSIVE_MOTILITY: { code: "SPERM_PROGRESSIVE_MOTILITY", label: "Progressive motility", unit: "%", sex: "male", lowerLimit: 32, limitSource: `${THIQA} (WHO reference)`, min: 0, max: 100, step: "1" },
  SPERM_MORPHOLOGY: { code: "SPERM_MORPHOLOGY", label: "Normal morphology", unit: "%", sex: "male", lowerLimit: 4, limitSource: `${THIQA} (WHO reference)`, min: 0, max: 100, step: "1" },
  SEMEN_VOLUME: { code: "SEMEN_VOLUME", label: "Semen volume", unit: "mL", sex: "male", lowerLimit: 1.5, limitSource: `${THIQA} (WHO reference)`, min: 0, max: 20, step: "0.1" }
};

export const SOURCE_LABELS: Record<LabSource, string> = {
  CLINICIAN_VERIFIED: "Clinician verified",
  EHR_MALAFFI: "Verified from Clinic EHR / HIE",
  IMPORTED: "Imported record",
  SELF_REPORTED: "Self-reported",
  PROFILE: "Recorded earlier (source not documented)"
};

export function labsForSex(sex: string | null | undefined): LabDef[] {
  return Object.values(LABS).filter((l) => !sex || l.sex === sex || l.sex === "any");
}

export function isBelowLimit(code: LabCode, value: number): boolean {
  const lim = LABS[code]?.lowerLimit;
  return lim !== undefined && value < lim;
}

export function isAboveLimit(code: LabCode, value: number): boolean {
  const lim = LABS[code]?.upperLimit;
  return lim !== undefined && value > lim;
}

/** Below the lower or above the upper reference limit. */
export function isOutsideReference(code: LabCode, value: number): boolean {
  return isBelowLimit(code, value) || isAboveLimit(code, value);
}

/** "≥ 1.1 ng/mL", "0.4–4 mIU/L", "≤ 25 ng/mL" or null. */
export function referenceText(code: LabCode): string | null {
  const d = LABS[code];
  if (!d) return null;
  if (d.lowerLimit !== undefined && d.upperLimit !== undefined) return `${d.lowerLimit}–${d.upperLimit} ${d.unit}`;
  if (d.lowerLimit !== undefined) return `≥ ${d.lowerLimit} ${d.unit}`;
  if (d.upperLimit !== undefined) return `≤ ${d.upperLimit} ${d.unit}`;
  return null;
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
