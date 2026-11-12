import type { BbtAnalysis, Point } from "@/lib/observation-analysis";
import { shortDate } from "@/lib/observation-analysis";

interface Props {
  points: Point[]; // oldest first
  analysis?: BbtAnalysis;
  large?: boolean;
}

/** Basal body temperature line with the Roetzer coverline and the detected rise. */
export function TemperatureChart({ points, analysis, large = false }: Props) {
  const width = 760;
  const height = large ? 230 : 155;
  const pad = 14;
  const values = points.map((p) => p.value);
  const lo = Math.min(36.2, Math.floor((Math.min(...values) - 0.05) * 10) / 10);
  const hi = Math.max(37.0, Math.ceil((Math.max(...values) + 0.05) * 10) / 10);
  const x = (i: number) => (points.length === 1 ? width / 2 : pad + (i * (width - pad * 2)) / (points.length - 1));
  const y = (v: number) => height - pad - ((v - lo) / (hi - lo)) * (height - pad * 2);
  const pts = points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ");
  const gradientId = `bbt-fill-${large ? "l" : "s"}`;
  const shiftIdx = analysis?.shiftIndex ?? null;
  const shiftLeft = shiftIdx !== null ? (x(shiftIdx) / width) * 100 : null;
  const mid = (lo + hi) / 2;
  const middle = points[Math.floor((points.length - 1) / 2)];

  return (
    <>
      <div className={`chart-labels ${large ? "large" : ""}`} aria-hidden>
        <span>{hi.toFixed(1)}°</span>
        <span>{mid.toFixed(1)}°</span>
        <span>{lo.toFixed(1)}°</span>
      </div>
      <div className={`temp-chart ${large ? "large" : ""}`}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`Basal body temperature, ${points.length} readings from ${shortDate(points[0].date)} to ${shortDate(points[points.length - 1].date)}`}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: "var(--chart-temp-area)" }} stopOpacity=".22" />
              <stop offset="1" style={{ stopColor: "var(--chart-temp-area)" }} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.2, 0.5, 0.8].map((f) => (
            <line key={f} x1="0" y1={height * f} x2={width} y2={height * f} style={{ stroke: "var(--chart-grid)" }} strokeDasharray="4 5" />
          ))}
          {analysis?.coverline != null && (
            <line
              x1="0"
              x2={width}
              y1={y(analysis.coverline)}
              y2={y(analysis.coverline)}
              style={{ stroke: "var(--chart-temp-ma)" }}
              strokeWidth="1.2"
              strokeDasharray="6 4"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {shiftIdx !== null && (
            <line x1={x(shiftIdx)} x2={x(shiftIdx)} y1="6" y2={height - 6} style={{ stroke: "var(--chart-shift)" }} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
          )}
          {points.length > 1 && (
            <polygon points={`${x(0)},${height - pad} ${pts} ${x(points.length - 1)},${height - pad}`} fill={`url(#${gradientId})`} />
          )}
          <polyline
            points={pts}
            fill="none"
            style={{ stroke: "var(--chart-temp)" }}
            strokeWidth={large ? 3 : 2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {shiftLeft !== null && (
          <div className="ovulation-marker" style={{ left: `${shiftLeft}%` }}>
            <span>Temperature rise</span>
          </div>
        )}
      </div>
      <div className="chart-days" aria-hidden>
        <span>{shortDate(points[0].date)}</span>
        {points.length > 2 && <span>{shortDate(middle.date)}</span>}
        <span>{shortDate(points[points.length - 1].date)}</span>
      </div>
    </>
  );
}
