// Thin client for the Python ML service. Returns live predictions only;
// never returns mocked values.

export interface PredictionInput {
  age: number;
  bmi: number;
  sperm_count?: number | null;
  amh?: number | null;
  sex?: "female" | "male";
  scope?: "INDIVIDUAL" | "COUPLE";
  pcos_history?: boolean;
  infertility_duration_months?: number;
  prior_cycles?: number;
  preservation_intent?: boolean;
  antral_follicle_count?: number | null;
}

export interface FeatureImportance {
  feature: string;
  impact: number;
  direction?: string;
  shapley_value?: number;
}

export interface PredictionOutput {
  probability: number;
  confidence_low?: number;
  confidence_high?: number;
  factors: FeatureImportance[];
  model_version: string;
  disclaimer: string;
  scope?: "INDIVIDUAL" | "COUPLE";
  tier?: string | null;
  preservation_guidance?: string | null;
  age_adjusted_percentile?: number | null;
}

const ML_API_URL = process.env.ML_API_URL ?? "http://localhost:8000";

export async function predict(input: PredictionInput): Promise<PredictionOutput> {
  const res = await fetch(`${ML_API_URL}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store"
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`ML service error (${res.status}): ${detail}`);
  }
  return res.json();
}
