// Thin client for the Python ML service. Returns live predictions only;
// never returns mocked values.

export interface PredictionInput {
  age: number;
  bmi: number;
  sperm_count: number;
  amh: number;
  pcos_history: boolean;
  infertility_duration_months: number;
  prior_cycles: number;
}

export interface FeatureImportance {
  feature: string;
  impact: number;
}

export interface PredictionOutput {
  probability: number;
  confidence_low?: number;
  confidence_high?: number;
  factors: FeatureImportance[];
  model_version: string;
  disclaimer: string;
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
