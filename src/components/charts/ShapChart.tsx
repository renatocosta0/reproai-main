import type { ShapFactor } from "@/types/patient";
import { featureLabel } from "@/lib/tiers";

/**
 * Diverging bars of exact Shapley values (log-odds contribution relative to the
 * reference population). Mint pushes the estimate up, coral pulls it down.
 */
export function ShapChart({ factors }: { factors: ShapFactor[] }) {
  const rows = factors
    .map((f) => ({ ...f, phi: f.shapley_value ?? (f.direction === "negative" ? -f.impact : f.impact) }))
    .sort((a, b) => Math.abs(b.phi) - Math.abs(a.phi));
  const max = Math.max(...rows.map((r) => Math.abs(r.phi)), 0.0001);

  return (
    <div className="shap-chart" role="table" aria-label="Factor contributions">
      <div className="shap-legend" aria-hidden>
        <span><i className="neg" /> Lowers estimate</span>
        <span><i className="pos" /> Raises estimate</span>
      </div>
      {rows.map((r) => {
        const w = (Math.abs(r.phi) / max) * 50;
        const positive = r.phi > 0;
        return (
          <div className="shap-row" role="row" key={r.feature}>
            <span className="shap-label" role="cell">{featureLabel(r.feature)}</span>
            <div className="shap-track" role="cell" aria-label={`${positive ? "+" : ""}${r.phi.toFixed(2)}`}>
              <span className="shap-axis" />
              <span
                className={`shap-bar ${positive ? "pos" : "neg"}`}
                style={positive ? { left: "50%", width: `${w}%` } : { right: "50%", width: `${w}%` }}
              />
            </div>
            <span className={`shap-value ${positive ? "pos" : r.phi < 0 ? "neg" : ""}`} role="cell">
              {positive ? "+" : ""}
              {r.phi.toFixed(2)}
            </span>
          </div>
        );
      })}
      <p className="shap-footnote">
        Values are contributions on the log-odds scale compared with a reference population (exact Shapley
        attribution). Longer bars matter more.
      </p>
    </div>
  );
}
