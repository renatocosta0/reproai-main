import { formatHours, shortDate as defaultDate, type Point, type SleepStats } from "@/lib/observation-analysis";

const TARGET_HOURS = 7;

/** Nightly sleep bars with a 7-night moving average and a 7-hour reference line. */
/** `formatDate` lets a localised page label the axis; defaults to the English short date. */
export function SleepChart({ points, stats, formatDate: shortDate = defaultDate }: { points: Point[]; stats: SleepStats; formatDate?: (d: Date) => string }) {
  const width = 760;
  const height = 200;
  const pad = 10;
  const hi = Math.max(10, Math.ceil(Math.max(...points.map((p) => p.value)) + 0.5));
  const slot = (width - pad * 2) / points.length;
  const barW = Math.max(2, Math.min(26, slot * 0.6));
  const cx = (i: number) => pad + slot * i + slot / 2;
  const y = (v: number) => height - pad - (v / hi) * (height - pad * 2);
  const ma = stats.movingAverage
    .map((v, i) => (v === null ? null : `${cx(i)},${y(v)}`))
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <div className="chart-labels large" aria-hidden>
        <span>{hi}h</span>
        <span>{hi / 2}h</span>
        <span>0h</span>
      </div>
      <div className="temp-chart large">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`Sleep duration over ${points.length} nights, average ${formatHours(stats.mean)}`}
        >
          <line x1="0" x2={width} y1={y(TARGET_HOURS)} y2={y(TARGET_HOURS)} style={{ stroke: "var(--chart-target)" }} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
          {points.map((p, i) => (
            <rect
              key={i}
              x={cx(i) - barW / 2}
              y={y(p.value)}
              width={barW}
              height={height - pad - y(p.value)}
              rx="3"
              style={{ fill: p.value < 5 ? "var(--chart-bar-low)" : "var(--chart-bar)" }}
            />
          ))}
          {ma && <polyline points={ma} fill="none" style={{ stroke: "var(--chart-line)" }} strokeWidth="2.4" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
        </svg>
      </div>
      <div className="chart-days" aria-hidden>
        <span>{shortDate(points[0].date)}</span>
        <span>{shortDate(points[points.length - 1].date)}</span>
      </div>
    </>
  );
}
