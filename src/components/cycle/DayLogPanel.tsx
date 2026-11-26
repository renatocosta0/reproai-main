"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Droplet, Droplets, FlaskConical, Lock, MoonStar, Smile, Sparkles, Thermometer, Waves } from "lucide-react";
import { FormError } from "@/components/ui/Notice";
import { api, userMessage } from "@/lib/api-client";
import { CONFOUNDERS, FLOWS, LH_TESTS, MOODS, MUCUS, SYMPTOMS, addDays } from "@/lib/cycle";
import { formatHours } from "@/lib/observation-analysis";
import type { CycleDayLog } from "@/types/cycle";
import type { CycleCopy } from "./cycle-copy";

interface Draft {
  bleedingFlow: string | null;
  cervicalMucus: string | null;
  ovulationTest: string | null;
  tempConfounder: string | null;
  waterIntakeMl: number;
  symptoms: string[];
  mood: string[];
  notes: string;
}

function fromLog(l: CycleDayLog | undefined): Draft {
  return {
    bleedingFlow: l?.flow ?? null,
    cervicalMucus: l?.mucus ?? null,
    ovulationTest: l?.lh ?? null,
    tempConfounder: l?.confounder ?? null,
    waterIntakeMl: l?.waterMl ?? 0,
    symptoms: l?.symptoms ?? [],
    mood: l?.mood ?? [],
    notes: l?.notes ?? ""
  };
}

function Taps({ options, value, onChange, labels, className = "" }: { options: readonly string[]; value: string | null; onChange: (v: string | null) => void; labels: Record<string, string>; className?: string }) {
  return (
    <div className="tap-row">
      {options.map((o) => (
        <button key={o} type="button" className={`tap ${className}`} aria-pressed={value === o} onClick={() => onChange(value === o ? null : o)}>
          {className === "flow" && ["LIGHT", "MEDIUM", "HEAVY"].includes(o) && (
            <span className="drops" aria-hidden>
              {Array.from({ length: o === "LIGHT" ? 1 : o === "MEDIUM" ? 2 : 3 }, (_, i) => <Droplet key={i} size={11} fill="currentColor" />)}
            </span>
          )}
          {labels[o] ?? o}
        </button>
      ))}
    </div>
  );
}

function MultiTaps({ options, value, onChange, labels }: { options: readonly string[]; value: string[]; onChange: (v: string[]) => void; labels: Record<string, string> }) {
  return (
    <div className="tap-row">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button key={o} type="button" className="tap" aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])}>
            {labels[o] ?? o}
          </button>
        );
      })}
    </div>
  );
}

/** One-tap daily log for the selected day. Temperature and sleep are display-only from Health Tracking. */
export function DayLogPanel({
  date,
  today,
  onDate,
  log,
  healthTemp = null,
  healthSleepHours = null,
  isMale,
  onSaved,
  L,
  dateLabel
}: {
  date: string;
  today: string;
  onDate: (d: string) => void;
  log: CycleDayLog | undefined;
  healthTemp?: number | null;
  healthSleepHours?: number | null;
  isMale: boolean;
  onSaved: (message: string) => void;
  L: CycleCopy;
  dateLabel: (d: string) => string;
}) {
  const [d, setD] = useState<Draft>(() => fromLog(log));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setD(fromLog(log));
    setError("");
  }, [log, date]);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));

  const displayTemp = healthTemp ?? (typeof log?.bbt === "number" ? log.bbt : null);
  const displaySleepHours = healthSleepHours ?? (typeof log?.sleepMinutes === "number" && log.sleepMinutes > 0 ? log.sleepMinutes / 60 : null);

  async function save() {
    setBusy(true);
    setError("");
    try {
      const body: Record<string, unknown> = {
        date,
        bleedingFlow: d.bleedingFlow,
        cervicalMucus: d.cervicalMucus,
        ovulationTest: d.ovulationTest,
        tempConfounder: displayTemp !== null ? d.tempConfounder : null,
        waterIntakeMl: d.waterIntakeMl || null,
        symptoms: d.symptoms,
        mood: d.mood,
        notes: d.notes.trim() || null
      };
      const res = await api<{ startedCycle: boolean }>("/api/patient/cycle", { method: "POST", body: JSON.stringify(body) });
      onSaved(res.startedCycle ? L.savedStarted : L.saved);
    } catch (err) {
      setError(err instanceof Error && !("status" in err) ? err.message : userMessage(err, L.saveError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>{L.logTitle}</h2>
          <p>{L.logSub}</p>
        </div>
        <div className="daylog-date">
          <button type="button" onClick={() => onDate(addDays(date, -1))} aria-label="Previous day"><ChevronLeft size={15} className="flip-rtl" /></button>
          <label className="sr-only" htmlFor="daylog-date">Day</label>
          <input id="daylog-date" type="date" value={date} max={today} onChange={(e) => e.target.value && onDate(e.target.value)} />
          <button type="button" onClick={() => onDate(addDays(date, 1))} disabled={date >= today} aria-label="Next day"><ChevronRight size={15} className="flip-rtl" /></button>
          {date !== today && <button type="button" className="text-button" style={{ width: "auto", border: 0 }} onClick={() => onDate(today)}><CalendarDays size={14} /> {L.today}</button>}
        </div>
      </div>
      <div className="daylog-body">
        <strong style={{ fontSize: 13, color: "#5d6d69" }}>{dateLabel(date)}</strong>
        {!isMale && (
          <>
            <div className="log-group">
              <header><strong><Droplets size={15} color="var(--cy-period)" /> {L.flow}</strong></header>
              <Taps options={FLOWS} value={d.bleedingFlow} onChange={(v) => set("bleedingFlow", v)} labels={L.flows} className="flow" />
            </div>
            <div className="log-group">
              <header><strong><Waves size={15} color="var(--cy-fertile)" /> {L.mucus}</strong><small>{L.mucusHint}</small></header>
              <Taps options={MUCUS} value={d.cervicalMucus} onChange={(v) => set("cervicalMucus", v)} labels={L.mucusTypes} />
            </div>
            <div className="log-group">
              <header><strong><FlaskConical size={15} color="#4f7895" /> {L.lh}</strong></header>
              <Taps options={LH_TESTS} value={d.ovulationTest} onChange={(v) => set("ovulationTest", v)} labels={L.lhTypes} />
            </div>
            <div className="log-group">
              <header>
                <strong><Thermometer size={15} color="var(--chart-temp)" /> {L.temp}</strong>
                <Link href="/patient/wearables" style={{ fontSize: 12, color: "#0c655e", fontWeight: 600, textDecoration: "none" }}>
                  {displayTemp !== null ? L.fromHealthTracking : L.manageInWearables}
                </Link>
              </header>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {displayTemp !== null ? (
                  <strong style={{ fontSize: 16 }} dir="ltr">{displayTemp.toFixed(2)} °C</strong>
                ) : (
                  <span style={{ color: "#71817d", fontSize: 13 }}>{L.noTempDay}</span>
                )}
              </div>
              {displayTemp !== null && (
                <div style={{ marginTop: 8 }}>
                  <small style={{ display: "block", marginBottom: 6, color: "#8b9895", fontSize: 11.5 }}>{L.confounder}</small>
                  <Taps options={CONFOUNDERS} value={d.tempConfounder} onChange={(v) => set("tempConfounder", v)} labels={L.confounders} />
                </div>
              )}
            </div>
          </>
        )}
        <div className="log-group">
          <header>
            <strong><MoonStar size={15} color="#6366f1" /> {L.sleep}</strong>
            <Link href="/patient/wearables" style={{ fontSize: 12, color: "#0c655e", fontWeight: 600, textDecoration: "none" }}>
              {displaySleepHours !== null ? L.fromHealthTracking : L.manageInWearables}
            </Link>
          </header>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {displaySleepHours !== null ? (
              <strong style={{ fontSize: 16 }} dir="ltr">{formatHours(displaySleepHours)}</strong>
            ) : (
              <span style={{ color: "#71817d", fontSize: 13 }}>{L.noSleepDay}</span>
            )}
          </div>
        </div>

        <details className="fold">
          <summary>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Sparkles size={15} color="#dba56c" /> {L.symptoms}
            </span>
            {d.symptoms.length > 0 && <small>{L.selectedCount(d.symptoms.length)}</small>}
          </summary>
          <div style={{ paddingTop: 10 }}>
            <MultiTaps options={SYMPTOMS} value={d.symptoms} onChange={(v) => set("symptoms", v)} labels={L.symptomTypes} />
          </div>
        </details>

        <details className="fold">
          <summary>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Smile size={15} color="#3f9c86" /> {L.mood}
            </span>
            {d.mood.length > 0 && <small>{L.selectedCount(d.mood.length)}</small>}
          </summary>
          <div style={{ paddingTop: 10 }}>
            <MultiTaps options={MOODS} value={d.mood} onChange={(v) => set("mood", v)} labels={L.moodTypes} />
          </div>
        </details>

        <details className="fold">
          <summary>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Droplet size={15} color="#4f8fb8" /> {L.water} &amp; {L.notes}
            </span>
            {d.waterIntakeMl > 0 && <small>{L.waterGoal(d.waterIntakeMl)}</small>}
          </summary>
          <div style={{ paddingTop: 10, display: "grid", gap: 12 }}>
            <div className="log-group">
              <header><strong><Droplet size={15} color="#4f8fb8" /> {L.water}</strong><small>{L.waterGoal(d.waterIntakeMl)}</small></header>
              <div className="water-bar">
                <button type="button" className="tap" onClick={() => set("waterIntakeMl", Math.max(0, d.waterIntakeMl - 250))} aria-label="−250 ml">−</button>
                <div className="water-track" aria-hidden><i style={{ width: `${Math.min(100, (d.waterIntakeMl / 2500) * 100)}%` }} /></div>
                <button type="button" className="tap" onClick={() => set("waterIntakeMl", Math.min(8000, d.waterIntakeMl + 250))} aria-label="+250 ml">+ 250</button>
              </div>
            </div>
            <label className="field">
              <span>{L.notes}</span>
              <textarea rows={2} maxLength={1000} value={d.notes} onChange={(e) => set("notes", e.target.value)} />
            </label>
          </div>
        </details>

        {error && <FormError>{error}</FormError>}
        <div className="daylog-actions">
          <small><Lock size={12} /> {L.selfReported}</small>
          <button type="button" className="primary" onClick={save} disabled={busy}>{busy ? L.saving : L.save}</button>
        </div>
      </div>
    </section>
  );
}
