import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { LABS, isBelowLimit, type LabCode, type LabPoint } from "@/lib/labs";
import { shortDate } from "@/lib/observation-analysis";
import { SourceChip } from "@/components/record/Chips";

/**
 * One marker over time against its reference limit, with the person's first
 * value as their baseline and a plain-language direction-of-change sentence.
 */
export function MarkerTrend({ code, points }: { code: LabCode; points: LabPoint[] }) {
  const def = LABS[code];
  const pts = [...points].sort((a, b) => +new Date(a.collectedAt) - +new Date(b.collectedAt));
  const last = pts[pts.length - 1];
  const first = pts[0];
  const below = isBelowLimit(code, last.value);

  const width = 320;
  const height = 90;
  const pad = 10;
  const lim = def.lowerLimit;
  const values = pts.map((p) => p.value).concat(lim !== undefined ? [lim] : []);
  const lo = Math.max(0, Math.min(...values) * 0.8);
  const hi = Math.max(...values) * 1.2 || 1;
  const x = (i: number) => (pts.length === 1 ? width / 2 : pad + (i * (width - pad * 2)) / (pts.length - 1));
  const y = (v: number) => height - pad - ((v - lo) / (hi - lo)) * (height - pad * 2);

  let trend: { text: string; Icon: typeof ArrowRight };
  if (pts.length < 2) {
    trend = { text: "One result so far. A later result will show the direction of change.", Icon: ArrowRight };
  } else {
    const change = (last.value - first.value) / (Math.abs(first.value) || 1);
    const since = shortDate(first.collectedAt);
    trend =
      Math.abs(change) < 0.1
        ? { text: `Stable since ${since}.`, Icon: ArrowRight }
        : change > 0
          ? { text: `Higher than your first result (${since}).`, Icon: ArrowUpRight }
          : { text: `Lower than your first result (${since}).`, Icon: ArrowDownRight };
  }

  return (
    <article className={`marker-card ${below ? "below" : ""}`}>
      <header>
        <div>
          <span>{def.label}</span>
          <strong>
            {last.value}
            <small> {def.unit}</small>
          </strong>
        </div>
        <SourceChip source={last.source} />
      </header>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${def.label}: ${pts.map((p) => p.value).join(", ")}`}>
        {lim !== undefined && (
          <>
            <rect x="0" y={y(lim)} width={width} height={Math.max(0, height - pad - y(lim))} fill="#de7467" opacity="0.07" />
            <line x1="0" x2={width} y1={y(lim)} y2={y(lim)} stroke="#de7467" strokeDasharray="4 4" strokeWidth="1" />
          </>
        )}
        {pts.length > 1 && (
          <polyline points={pts.map((p, i) => `${x(i)},${y(p.value)}`).join(" ")} fill="none" stroke="#176e65" strokeWidth="2" />
        )}
        {pts.map((p, i) => (
          <circle key={p.id} cx={x(i)} cy={y(p.value)} r="4" fill="#fff" stroke={isBelowLimit(code, p.value) ? "#de7467" : "#176e65"} strokeWidth="2" />
        ))}
      </svg>
      <p className="marker-trend">
        <trend.Icon size={14} aria-hidden /> {trend.text}
      </p>
      <small className="marker-meta">
        Latest {shortDate(last.collectedAt)}
        {lim !== undefined && <> · reference limit {lim} {def.unit}{below ? " (below)" : ""}</>}
      </small>
    </article>
  );
}
