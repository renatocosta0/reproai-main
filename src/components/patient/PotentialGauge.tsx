import { pct, tierCopy } from "@/lib/tiers";

/** Ring gauge from the reference design, driven by a stored probability (0-100). */
export function PotentialGauge({ probability, tier }: { probability: number; tier: string | null }) {
  const p = Math.max(0, Math.min(100, probability));
  return (
    <div
      className="gauge"
      style={{ background: `conic-gradient(#d7796e 0 ${p}%, #f2e9e4 ${p}% 100%)` }}
      role="img"
      aria-label={`Estimated probability ${pct(p, 1)}, ${tierCopy(tier).label}`}
    >
      <div>
        <strong>
          {Math.round(p)}
          <span>%</span>
        </strong>
        <small>estimated</small>
      </div>
    </div>
  );
}

/** Confidence interval bar. */
export function ConfidenceBar({ low, high }: { low: number | null; high: number | null }) {
  if (low === null || high === null) return null;
  return (
    <div className="confidence">
      <span>95% confidence range</span>
      <strong>
        {Math.round(low)}–{Math.round(high)}%
      </strong>
      <div>
        <i style={{ left: `${low}%`, right: `${100 - high}%` }} />
      </div>
    </div>
  );
}
