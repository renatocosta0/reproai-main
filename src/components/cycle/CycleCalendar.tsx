"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, dayKey, type CycleAnalysis } from "@/lib/cycle";
import type { CycleDayLog } from "@/types/cycle";
import type { CycleCopy } from "./cycle-copy";

const BLEED = new Set(["LIGHT", "MEDIUM", "HEAVY"]);

/** Month grid: logged periods, expected period, fertile window and ovulation. */
export function CycleCalendar({
  analysis,
  logs,
  today,
  selected,
  onSelect,
  L,
  locale
}: {
  analysis: CycleAnalysis;
  logs: CycleDayLog[];
  today: string;
  selected: string;
  onSelect: (d: string) => void;
  L: CycleCopy;
  locale: "en" | "ar";
}) {
  const [month, setMonth] = useState(() => today.slice(0, 7));
  const byDate = useMemo(() => new Map(logs.map((l) => [l.date, l])), [logs]);

  const marks = useMemo(() => {
    const fertile = new Set<string>();
    const ovulation = new Set<string>();
    const rise = new Set<string>();
    const predicted = new Set<string>();
    for (const c of analysis.cycles) {
      if (c.ovulation.date && c.ovulation.confidence !== "none") {
        ovulation.add(c.ovulation.date);
        for (let i = -5; i <= 1; i++) fertile.add(addDays(c.ovulation.date, i));
      }
      if (c.ovulation.bbtRiseDate) rise.add(c.ovulation.bbtRiseDate);
    }
    const p = analysis.prediction;
    if (!p.paused) {
      if (p.windowStart && p.windowEnd) for (let d = p.windowStart; d <= p.windowEnd; d = addDays(d, 1)) fertile.add(d);
      if (p.predictedOvulation) ovulation.add(p.predictedOvulation);
      if (p.nextPeriod) for (let i = 0; i < Math.max(3, analysis.open?.periodDays ?? 5); i++) predicted.add(addDays(p.nextPeriod, i));
    }
    return { fertile, ovulation, rise, predicted };
  }, [analysis]);

  const first = `${month}-01`;
  const firstDow = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7; // Monday first
  const start = addDays(first, -firstDow);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const monthLabel = new Date(`${first}T00:00:00Z`).toLocaleDateString(locale === "ar" ? "ar-AE-u-nu-latn" : "en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  const dows = Array.from({ length: 7 }, (_, i) => new Date(Date.UTC(2026, 10, 2 + i)).toLocaleDateString(locale === "ar" ? "ar-AE" : "en-GB", { weekday: "short", timeZone: "UTC" }));
  const shift = (n: number) => {
    const d = new Date(`${first}T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + n);
    setMonth(dayKey(d).slice(0, 7));
  };

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>{L.calendar}</h2>
          <p>{L.calendarSub}</p>
        </div>
        <div className="cal-head">
          <button type="button" onClick={() => shift(-1)} aria-label="Previous month"><ChevronLeft size={16} className="flip-rtl" /></button>
          <strong style={{ minWidth: 130, textAlign: "center", fontSize: 13.5 }}>{monthLabel}</strong>
          <button type="button" onClick={() => shift(1)} aria-label="Next month"><ChevronRight size={16} className="flip-rtl" /></button>
        </div>
      </div>
      <div className="cal-grid" role="grid" aria-label={monthLabel}>
        {dows.map((d) => <div key={d} className="cal-dow" role="columnheader">{d}</div>)}
        {cells.map((d) => {
          const log = byDate.get(d);
          const cls = ["cal-day"];
          if (!d.startsWith(month)) cls.push("out");
          if (d > today) cls.push("future");
          if (log?.flow && BLEED.has(log.flow)) cls.push("period");
          else if (log?.flow === "SPOTTING") cls.push("spotting");
          else if (marks.ovulation.has(d)) cls.push("ovulation");
          else if (d > today && marks.predicted.has(d)) cls.push("predicted-period");
          else if (marks.fertile.has(d)) cls.push("fertile");
          if (d === today) cls.push("today");
          if (d === selected) cls.push("selected");
          const logged = log && (log.flow || log.mucus || log.lh || typeof log.bbt === "number" || (log.symptoms?.length ?? 0) > 0 || (log.mood?.length ?? 0) > 0);
          return (
            <button
              key={d}
              type="button"
              role="gridcell"
              className={cls.join(" ")}
              aria-selected={d === selected}
              aria-label={d}
              aria-disabled={d > today}
              onClick={() => d <= today && onSelect(d)}
            >
              {Number(d.slice(8))}
              {marks.rise.has(d) && <span className="rise" aria-hidden>▲</span>}
              {logged && <span className="logged" aria-hidden />}
            </button>
          );
        })}
      </div>
      <div className="cal-legend" aria-hidden>
        <span><i style={{ background: "var(--cy-period)" }} />{L.calLegend.period}</span>
        <span><i style={{ border: "1.5px dashed var(--cy-period)" }} />{L.calLegend.predicted}</span>
        <span><i style={{ background: "var(--cy-fertile-soft)" }} />{L.calLegend.fertile}</span>
        <span><i style={{ background: "var(--cy-fertile)" }} />{L.calLegend.ovulation}</span>
        <span>▲ {L.calLegend.rise}</span>
      </div>
    </section>
  );
}
