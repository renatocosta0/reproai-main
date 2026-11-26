"use client";

import { cycleDay, diffDays, type CyclePrediction, type CycleSummary } from "@/lib/cycle";
import type { CycleCopy } from "./cycle-copy";

const R = 96;
const C = 130;

function polar(fraction: number, r = R) {
  const a = fraction * Math.PI * 2 - Math.PI / 2;
  return { x: C + r * Math.cos(a), y: C + r * Math.sin(a) };
}

function arc(from: number, to: number, total: number) {
  const f0 = Math.max(0, from) / total;
  const f1 = Math.min(total, to) / total;
  if (f1 <= f0) return "";
  const a = polar(f0);
  const b = polar(f1);
  const large = f1 - f0 > 0.5 ? 1 : 0;
  return `M ${a.x} ${a.y} A ${R} ${R} 0 ${large} 1 ${b.x} ${b.y}`;
}

const PHASE_COLOUR: Record<string, string> = {
  MENSTRUAL: "var(--cy-period)",
  FOLLICULAR: "#4f7895",
  FERTILE: "var(--cy-fertile)",
  LUTEAL: "var(--cy-luteal)",
  LATE: "var(--cy-late)",
  UNKNOWN: "var(--chart-label)"
};

/** Cycle wheel: period, fertile window and luteal phase, with today's position. */
export function CycleRing({ open, prediction, L }: { open: CycleSummary | null; prediction: CyclePrediction; L: CycleCopy }) {
  const day = prediction.cycleDay;
  const total = Math.max(prediction.expectedLength, day ?? 0, 21);
  const periodDays = open?.periodDays ?? 5;
  const fw = open && prediction.windowStart && prediction.windowEnd
    ? { from: cycleDay(open.startDate, prediction.windowStart) - 1, to: cycleDay(open.startDate, prediction.windowEnd) }
    : null;
  const ov = open && prediction.predictedOvulation ? cycleDay(open.startDate, prediction.predictedOvulation) - 0.5 : null;
  const marker = day ? polar((day - 0.5) / total) : null;
  const phaseLabel = L.phase[prediction.phase] ?? prediction.phase;
  const ticks = Array.from({ length: total }, (_, i) => i);

  return (
    <svg className="cycle-ring" viewBox="0 0 260 260" role="img" aria-label={day ? `${L.cycleDay} ${day}, ${phaseLabel}` : L.noCycle}>
      <circle cx={C} cy={C} r={R} fill="none" stroke="var(--cy-track)" strokeWidth="18" />
      {ticks.map((i) => {
        const a = polar(i / total, R + 15);
        const b = polar(i / total, R + (i % 7 === 0 ? 20 : 17));
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--chart-guide)" strokeWidth={i % 7 === 0 ? 1.4 : 0.8} />;
      })}
      {open && !prediction.paused && fw && <path d={arc(fw.to, total, total)} fill="none" stroke="var(--cy-luteal)" strokeOpacity="0.55" strokeWidth="18" />}
      {open && !prediction.paused && fw && <path d={arc(fw.from, fw.to, total)} fill="none" stroke="var(--cy-fertile)" strokeOpacity="0.85" strokeWidth="18" strokeLinecap="round" />}
      {open && <path d={arc(0, periodDays, total)} fill="none" stroke="var(--cy-period)" strokeWidth="18" strokeLinecap="round" />}
      {ov !== null && !prediction.paused && (() => {
        const p = polar(ov / total);
        return <circle cx={p.x} cy={p.y} r="5" fill="var(--chart-dot-fill)" stroke="var(--cy-ovulation)" strokeWidth="3" />;
      })()}
      {marker && (
        <g>
          <circle cx={marker.x} cy={marker.y} r="13" fill="var(--chart-dot-fill)" stroke={PHASE_COLOUR[prediction.phase]} strokeWidth="3" />
          <circle cx={marker.x} cy={marker.y} r="4.5" fill={PHASE_COLOUR[prediction.phase]} />
        </g>
      )}
      {day ? (
        <>
          <text x={C} y={C - 26} textAnchor="middle" className="ring-center-label">{L.cycleDay}</text>
          <text x={C} y={C + 12} textAnchor="middle" className="ring-center-day">{day}</text>
          <text x={C} y={C + 36} textAnchor="middle" className="ring-center-phase" fill={PHASE_COLOUR[prediction.phase]}>{phaseLabel}</text>
        </>
      ) : (
        <text x={C} y={C + 4} textAnchor="middle" className="ring-center-label">{L.noCycle}</text>
      )}
    </svg>
  );
}

export function RingLegend({ L }: { L: CycleCopy }) {
  return (
    <div className="ring-legend" aria-hidden>
      <span><i style={{ background: "var(--cy-period)" }} />{L.legend.period}</span>
      <span><i style={{ background: "var(--cy-fertile)" }} />{L.legend.fertile}</span>
      <span><i style={{ background: "var(--cy-luteal)" }} />{L.legend.luteal}</span>
    </div>
  );
}

export function daysUntil(today: string, date: string | null): number | null {
  return date ? diffDays(date, today) : null;
}
