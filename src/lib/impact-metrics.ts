// Economic impact metrics for the clinician dashboard.
// Calculates estimated healthcare savings by identifying low-response cases early.
//
// Assumptions (configurable for different regions):
// - Average IVF cycle cost: $12,000 USD (can be adjusted via IVF_CYCLE_COST env var)
// - Low-response threshold: probability < 25%
// - Savings per low-response case: 1 avoided cycle × cost

export interface ImpactMetrics {
  totalCouples: number;
  lowResponseCases: number;
  estimatedSavingsUSD: number;
  cyclesOptimized: number;
  ivfCycleCost: number;
}

const IVF_CYCLE_COST = Number(process.env.IVF_CYCLE_COST) || 12000;
const LOW_RESPONSE_THRESHOLD = 0.25; // 25%

export function calculateImpactMetrics(
  predictions: Array<{ probability: number } | null>
): ImpactMetrics {
  const totalCouples = predictions.length;
  const lowResponseCases = predictions.filter((p) => p && p.probability < LOW_RESPONSE_THRESHOLD).length;
  const cyclesOptimized = lowResponseCases; // Each low-response case avoids 1 cycle
  const estimatedSavingsUSD = cyclesOptimized * IVF_CYCLE_COST;

  return {
    totalCouples,
    lowResponseCases,
    estimatedSavingsUSD,
    cyclesOptimized,
    ivfCycleCost: IVF_CYCLE_COST
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}
