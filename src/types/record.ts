// Client-side shapes of /api/patient/record and the clinician case record.

import type { LabPoint } from "@/lib/labs";
import type { PathwayOption } from "@/lib/pathways";

export type { LabPoint, PathwayOption };

export interface AssessmentView {
  id: string;
  scope: string;
  status: "DRAFT" | "RELEASED" | "DISCARDED" | string;
  probability: number;
  confidenceLow: number | null;
  confidenceHigh: number | null;
  tier: string | null;
  percentile: number | null;
  completeness: number | null;
  missingOptional: string[];
  evidenceStatus: string | null;
  preservationGuidance: string | null;
  factors: { feature: string; impact: number; direction?: string; shapley_value?: number }[] | null;
  inputs: Record<string, { value: number | boolean; source: string; date?: string }> | null;
  modelVersion: string | null;
  clinicianNote: string | null;
  reviewedAt: string | null;
  userId: string | null;
  createdAt: string;
}

export type Purpose = "CLINICIAN_ACCESS" | "LAB_RESULTS" | "WEARABLES" | "CYCLE_TRACKING" | "PARTNER_SHARING" | "POPULATION_ANALYTICS";
export type ConsentMap = Record<Purpose, { granted: boolean; updatedAt: string | null }>;
export type PurposeInfo = Record<Purpose, { title: string; description: string; defaultGranted: boolean }>;

export interface RecordProfile {
  id: string;
  name: string | null;
  sex: "female" | "male" | null;
  age: number | null;
  bmi: number | null;
  tryingToConceive: boolean | null;
  infertilityDurationMonths: number | null;
  cycleRegularity: string | null;
  historyFlags: string | null;
  familyEarlyMenopause: boolean | null;
  smoking: string | null;
  preservationIntent: boolean | null;
  priorCycles: number | null;
  intakeCompletedAt: string | null;
}

export interface PatientRecord {
  userId: string;
  email: string;
  profile: RecordProfile | null;
  labs: LabPoint[];
  assessments: AssessmentView[];
  observationsSummary: { temperatureReadings: number; sleepNights: number; meanSleepHours: number | null; bbtStatus: string; bbtShift: number };
  consents: ConsentMap;
  options: PathwayOption[];
  isPaired: boolean;
  pendingReview: boolean;
  intendedUse: string;
  nonDiscrimination: string;
  purposeInfo: PurposeInfo;
}
