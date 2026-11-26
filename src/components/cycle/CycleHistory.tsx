"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { addDays, diffDays, type CycleAnalysis } from "@/lib/cycle";
import type { CycleCopy } from "./cycle-copy";

/** Completed and current cycles as proportional bars, with corrections and back-fill. */
export function CycleHistory({
  analysis,
  cycleIds,
  today,
  onRemove,
  onBackfill,
  L,
  dateLabel
}: {
  analysis: CycleAnalysis;
  cycleIds: { id: string; startDate: string }[];
  today: string;
  onRemove: (id: string) => void;
  onBackfill: (date: string) => void;
  L: CycleCopy;
  dateLabel: (d: string) => string;
}) {
  const [past, setPast] = useState("");
  const rows = [...analysis.cycles].reverse().slice(0, 12);
  const maxLen = Math.max(35, ...rows.map((c) => c.lengthDays ?? diffDays(today, c.startDate) + 1));
  const pct = (d: number) => `${Math.max(0, Math.min(100, (d / maxLen) * 100))}%`;

  return (
    <section className="panel" style={{ marginTop: 16 }}>
      <div className="panel-head">
        <div>
          <h2>{L.history}</h2>
          <p>{L.historySub}</p>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="empty-state" style={{ margin: "0 20px 18px" }}>{L.noHistory}</div>
      ) : (
        <div className="cycle-history">
          {rows.map((c) => {
            const len = c.lengthDays ?? diffDays(today, c.startDate) + 1;
            const ovDay = c.ovulation.date ? diffDays(c.ovulation.date, c.startDate) : null;
            const id = cycleIds.find((x) => x.startDate === c.startDate)?.id;
            return (
              <div className="history-row" key={c.startDate}>
                <span>{dateLabel(c.startDate)}</span>
                <div className="history-bar" style={{ width: pct(len) }} title={`${len} d`}>
                  {ovDay !== null && <span className="seg fertile" style={{ left: `${((ovDay - 5) / len) * 100}%`, width: `${(7 / len) * 100}%` }} />}
                  {ovDay !== null && c.status === "COMPLETED" && <span className="seg luteal" style={{ left: `${((ovDay + 1) / len) * 100}%`, right: 0 }} />}
                  <span className="seg period" style={{ left: 0, width: `${((c.periodDays ?? 5) / len) * 100}%` }} />
                  {ovDay !== null && <span className="ov" style={{ left: `calc(${(ovDay / len) * 100}% - 2px)` }} title={L.calLegend.ovulation} />}
                </div>
                <span className="meta">
                  <b>{c.status === "OPEN" ? L.open : L.days(len)}</b>
                  {c.lutealDays !== null && <> · {L.luteal(c.lutealDays)}</>}
                </span>
                {id ? (
                  <button type="button" className="icon-button" aria-label={L.remove} title={L.remove} onClick={() => window.confirm(L.removeConfirm) && onRemove(id)}>
                    <Trash2 size={14} />
                  </button>
                ) : <span />}
              </div>
            );
          })}
        </div>
      )}
      <form
        className="backfill"
        onSubmit={(e) => {
          e.preventDefault();
          if (past) onBackfill(past);
          setPast("");
        }}
      >
        <span>{L.backfill}</span>
        <input type="date" value={past} max={today} min={addDays(today, -400)} onChange={(e) => setPast(e.target.value)} aria-label={L.backfill} />
        <button className="secondary compact" disabled={!past}><Plus size={14} /> {L.add}</button>
      </form>
    </section>
  );
}
