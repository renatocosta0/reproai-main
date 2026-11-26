"use client";

import { useEffect, useState } from "react";
import { Footprints, HeartPulse, Thermometer, Waves } from "lucide-react";
import { api } from "@/lib/api-client";
import { rollingBaseline, type Baseline } from "@/lib/baselines";
import { CODES } from "@/lib/observation-analysis";
import type { ObservationRecord } from "@/types/patient";
import type { CycleCopy } from "./cycle-copy";

const SIGNALS = [
  { key: "rhr", code: CODES.restingHeartRate.code, unit: "bpm", icon: HeartPulse, digits: 0 },
  { key: "hrv", code: CODES.hrv.code, unit: "ms", icon: Waves, digits: 0 },
  { key: "wrist", code: CODES.wristTemperature.code, unit: "°C", icon: Thermometer, digits: 2 },
  { key: "steps", code: CODES.steps.code, unit: "", icon: Footprints, digits: 0 }
] as const;

/** Apple Watch / phone daily summaries against the person's own 4-week baseline. */
export function PassiveSignals({ L }: { L: CycleCopy }) {
  const [data, setData] = useState<Record<string, Baseline> | null>(null);
  useEffect(() => {
    let alive = true;
    api<{ observations: ObservationRecord[] }>(`/api/observations?codes=${SIGNALS.map((s) => s.code).join(",")}&take=400`)
      .then(({ observations }) => {
        if (!alive) return;
        const out: Record<string, Baseline> = {};
        for (const s of SIGNALS) {
          out[s.key] = rollingBaseline(s.code, observations.filter((o) => o.code === s.code).map((o) => ({ date: new Date(o.effectiveAt), value: o.value })));
        }
        setData(out);
      })
      .catch(() => alive && setData({}));
    return () => {
      alive = false;
    };
  }, []);

  const any = data && Object.values(data).some((b) => b.n7 > 0);
  return (
    <section className="panel" style={{ marginTop: 16 }}>
      <div className="panel-head">
        <div>
          <h2>{L.passive}</h2>
          <p>{L.passiveSub}</p>
        </div>
      </div>
      {!data ? (
        <div className="loading-block" style={{ margin: "0 20px 18px" }} />
      ) : !any ? (
        <div className="empty-state" style={{ margin: "0 20px 18px" }}>{L.noPassive}</div>
      ) : (
        <div className="passive-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
          {SIGNALS.map((s) => {
            const b = data[s.key];
            if (!b || b.n7 === 0) return null;
            const Icon = s.icon;
            const diff = b.mean7 !== null && b.mean28 !== null ? b.mean7 - b.mean28 : null;
            return (
              <div className="passive-tile" key={s.key}>
                <span><Icon size={14} /> {L[s.key]}</span>
                <strong dir="ltr">{b.mean7?.toFixed(s.digits)} {s.unit}</strong>
                <small dir="auto">
                  {diff !== null ? L.vsUsual(`${diff >= 0 ? "+" : "−"}${Math.abs(diff).toFixed(s.digits)}${s.unit ? ` ${s.unit}` : ""}`) : "–"}
                  {b.deviation && <> · <b style={{ color: "var(--cy-late)" }}>{b.deviation === "HIGH" ? "↑" : "↓"}</b></>}
                </small>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
