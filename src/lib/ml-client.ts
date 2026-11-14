// Thin client for the Python ML service. Returns live predictions only;
// never returns mocked values.

export interface PredictionInput {
  age: number | null;
  bmi?: number | null;
  sperm_count?: number | null;
  amh?: number | null;
  sex?: "female" | "male";
  scope?: "INDIVIDUAL" | "COUPLE";
  pcos_history?: boolean | null;
  infertility_duration_months?: number | null;
  prior_cycles?: number | null;
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
  /** "insufficient_data" means a required input is missing: no estimate is given. */
  status: "ok" | "insufficient_data";
  scope: "INDIVIDUAL" | "COUPLE";
  missing_required: string[];
  missing_optional: string[];
  /** Share of required + optional inputs that were provided (0-1). */
  completeness: number;
  probability: number | null;
  confidence_low: number | null;
  confidence_high: number | null;
  factors: FeatureImportance[];
  model_version: string;
  evidence_status: string;
  disclaimer: string;
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

export async function predictBatch(items: PredictionInput[]): Promise<PredictionOutput[]> {
  const res = await fetch(`${ML_API_URL}/predict/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
    cache: "no-store"
  });
  if (!res.ok) throw new Error(`ML service error (${res.status}): ${await res.text()}`);
  return ((await res.json()) as { results: PredictionOutput[] }).results;
}

/** The model card served by the ML service (GET /model-info). */
export interface ModelInfo {
  model_name: string;
  version: string;
  architecture: string;
  evidence_sources: string[];
  evidence_status: string;
  performance_claims: string;
  missing_data_policy: { required: Record<string, string[]>; optional_effect: string };
  intended_use: string;
  intended_users?: string[];
  out_of_scope?: string[];
  outcome?: string;
  inputs?: Record<string, { required: string[]; optional: string[] }>;
  explanation_method?: string;
  uncertainty?: string;
  known_limitations?: string[];
  next_steps?: string;
}

export async function getModelInfo(): Promise<ModelInfo> {
  const res = await fetch(`${ML_API_URL}/model-info`, { cache: "no-store" });
  if (!res.ok) throw new Error(`ML service error (${res.status})`);
  return res.json();
}
