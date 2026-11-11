// Response shapes of the patient-facing API routes, as consumed by the UI.

export type Sex = "female" | "male";

export interface PatientProfile {
  id: string;
  userId: string | null;
  coupleId: string | null;
  name: string | null;
  sex: Sex | null;
  age: number | null;
  bmi: number | null;
  amh: number | null;
  spermCount: number | null;
  pcosHistory: boolean | null;
  infertilityDurationMonths: number | null;
  priorCycles: number | null;
  antralFollicleCount: number | null;
  cycleRegularity: string | null;
  preservationIntent: boolean | null;
  createdAt: string;
}

export interface PartnerSummary {
  id: string;
  email: string;
  name: string | null;
  sex: Sex | null;
  age: number | null;
}

export interface ShapFactor {
  feature: string;
  impact: number;
  direction?: "positive" | "negative" | "neutral" | string;
  shapley_value?: number;
}

export interface StoredPrediction {
  id: string;
  scope: "INDIVIDUAL" | "COUPLE" | string;
  probability: number; // percent, 0-100
  confidenceLow: number | null;
  confidenceHigh: number | null;
  tier: string | null;
  preservationGuidance: string | null;
  factors: ShapFactor[] | null;
  modelVersion: string | null;
  createdAt: string;
}

export interface ProfileResponse {
  profile: PatientProfile;
  isPaired: boolean;
  partner: PartnerSummary | null;
  latestPrediction: StoredPrediction | null;
}

export interface PredictResponse {
  probability: number;
  confidence_low: number;
  confidence_high: number;
  factors: ShapFactor[];
  model_version: string;
  disclaimer: string;
  scope: "INDIVIDUAL" | "COUPLE";
  tier: string | null;
  preservation_guidance: string | null;
  age_adjusted_percentile: number | null;
  recommended_options: string[];
  modifiable_factors: { factor: string; clinicalRationale: string; target: string }[];
  non_modifiable_factors: { factor: string; clinicalRationale: string; impact: string }[];
  limitations: string[];
}

export interface ObservationRecord {
  id: string;
  userId: string | null;
  coupleId: string | null;
  code: string;
  value: number;
  unit: string | null;
  effectiveAt: string;
}

export interface BulkObservationResponse {
  ok: true;
  count: number;
  alertTriggered: boolean;
  analytics: {
    bbt_profile: "BIPHASIC_OVULATORY" | "MONOPHASIC_SUSPECTED_ANOVULATORY" | "INSUFFICIENT_DATA";
    thermal_shift_detected_celsius: number;
    mean_sleep_hours: number;
    sleep_disruption_flag: boolean;
    total_longitudinal_records: number;
  };
}

export interface PairingStatus {
  isPaired: boolean;
  coupleId: string | null;
  partner: PartnerSummary | null;
  sentInvites: { id: string; recipientEmail: string; token: string; expiresAt: string; createdAt: string }[];
  receivedInvites: {
    id: string;
    token: string;
    senderEmail: string;
    senderName: string | null;
    expiresAt: string;
    createdAt: string;
  }[];
}

export interface AgentResponse {
  reply: string;
  toolsUsed: string[];
  provider: "azure" | "groq";
}
