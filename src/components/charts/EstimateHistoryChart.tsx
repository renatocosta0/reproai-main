import { shortDate as defaultDate } from "@/lib/observation-analysis";

interface Point {
  date: Date;
  probability: number;
  low: number | null;
  high: number | null;
}

/** Estimate over time with its 95% confidence band (0–100% scale). */
/** `formatDate` lets a localised page label the axis; defaults to the English short date. */
export function EstimateHistoryChart({ points, formatDate: shortDate = defaultDate }: { points: Point[]; formatDate?: (d: Date) => string }) {
  const width = 760;
  const height = 180;
  const pad = 12;
  const x = (i: number) => (points.length === 1 ? width / 2 : pad + (i * (width - pad * 2)) / (points.length - 1));
  const y = (v: number) => height - pad - (v / 100) * (height - pad * 2);
  const line = points.map((p, i) => `${x(i)},${y(p.probability)}`).join(" ");
  const banded = points.every((p) => p.low != null && p.high != null);
  const band = banded
    ? [...points.map((p, i) => `${x(i)},${y(p.high!)}`), ...points.map((p, i) => `${x(i)},${y(p.low!)}`).reverse()].join(" ")
    : "";

  return (
    <>
      <div className="chart-labels large" aria-hidden>
        <span>100%</span>
        <span>50%</span>
        <span>0%</span>
      </div>
      <div className="temp-chart" style={{ height }}>
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={`Estimate history, ${points.length} assessments`}>
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1="0" x2={width} y1={height * f} y2={height * f} style={{ stroke: "var(--chart-grid)" }} strokeDasharray="4 5" />
          ))}
          {band && <polygon points={band} style={{ fill: "var(--chart-band)" }} opacity="0.22" />}
          {points.length > 1 && (
            <polyline points={line} fill="none" style={{ stroke: "var(--chart-line)" }} strokeWidth="2.6" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          )}
          {points.map((p, i) => (
            <circle key={i} cx={x(i)} cy={y(p.probability)} r="4" style={{ fill: "var(--chart-dot-fill)", stroke: "var(--chart-line)" }} strokeWidth="2" vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
      </div>
      <div className="chart-days" aria-hidden>
        <span>{shortDate(points[0].date)}</span>
        {points.length > 1 && <span>{shortDate(points[points.length - 1].date)}</span>}
      </div>
    </>
  );
}
