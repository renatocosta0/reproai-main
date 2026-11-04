// Shared domain types for ReproAI. No sample/mock values live here.

export type Role = "PATIENT" | "CLINICIAN";

export interface PatientClinicalData {
  sex?: "female" | "male";
  age?: number;
  bmi?: number;
  amh?: number;
  spermCount?: number;
  pcosHistory?: boolean;
  infertilityDurationMonths?: number;
  priorCycles?: number;
}

export interface Observation {
  id: string;
  code: string; // FHIR-aligned code, e.g. "body-temperature", "sleep-hours"
  value: number;
  unit?: string;
  effectiveAt: string;
}

export interface Prediction {
  id: string;
  probability: number;
  confidenceLow?: number;
  confidenceHigh?: number;
  factors?: { feature: string; impact: number }[];
  modelVersion?: string;
  createdAt: string;
}
