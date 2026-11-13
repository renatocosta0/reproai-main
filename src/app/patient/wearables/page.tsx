"use client";

import { FormEvent, useState } from "react";
import { Activity, Check, FileUp, MoonStar, Plus, Sparkles, Thermometer, X } from "lucide-react";
import { usePatient } from "@/components/patient/PatientContext";
import { useObservations } from "@/components/patient/useObservations";
import { TemperatureChart } from "@/components/charts/TemperatureChart";
import { SleepChart } from "@/components/charts/SleepChart";
import { FormError } from "@/components/ui/Notice";
import { api, userMessage } from "@/lib/api-client";
import {
  analyzeBbt,
  CODES,
  formatHours,
  isSleep,
  isTemperature,
  MIN_BBT_READINGS,
  series,
  SHIFT_THRESHOLD_C,
  shortDate,
  sleepStats
} from "@/lib/observation-analysis";
import type { BulkObservationResponse } from "@/types/patient";

type Kind = "temperature" | "sleep";

const LIMITS: Record<Kind, { min: number; max: number; step: string; label: string; unit: string }> = {
  temperature: { min: 34, max: 40, step: "0.01", label: "Temperature", unit: "°C" },
  sleep: { min: 0, max: 16, step: "0.1", label: "Sleep", unit: "hours" }
};

function todayISO(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export default function WearablesPage() {
  const { data } = usePatient();
  const { observations, loading, error: loadError, refresh } = useObservations(data?.profile.userId);
  const sex = data?.profile.sex ?? null;
  const [mode, setMode] = useState<"none" | "single" | "bulk">("none");
  const [kind, setKind] = useState<Kind>(sex === "male" ? "sleep" : "temperature");
  // One draft per kind, so switching between temperature and sleep never carries a value across.
  const [values, setValues] = useState<Record<Kind, string>>({ temperature: "", sleep: "" });
  const value = values[kind];
  const setValue = (v: string) => setValues((prev) => ({ ...prev, [kind]: v }));
  const [date, setDate] = useState(todayISO());
  const [bulkTexts, setBulkTexts] = useState<Record<Kind, string>>({ temperature: "", sleep: "" });
  const bulkText = bulkTexts[kind];
  const setBulkText = (v: string) => setBulkTexts((prev) => ({ ...prev, [kind]: v }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const temps = series(observations, isTemperature);
  const bbt = analyzeBbt(temps);
  const sleepPts = series(observations, isSleep).slice(-30);
  const sleep = sleepStats(sleepPts);
  const lastTemp = temps[temps.length - 1];
  const last7 = sleepPts.slice(-7);
  const avg7 = last7.length ? last7.reduce((a, p) => a + p.value, 0) / last7.length : null;

  async function send(items: { kind: Kind; value: number; date: string }[]) {
    setSaving(true);
    setError("");
    try {
      const res = await api<BulkObservationResponse>("/api/observations/bulk", {
        method: "POST",
        body: JSON.stringify({
          observations: items.map((i) => ({
            code: CODES[i.kind].code,
            unit: CODES[i.kind].unit,
            value: i.value,
            // Noon local time avoids a reading slipping to the previous day in UTC.
            effectiveAt: new Date(`${i.date}T12:00:00`).toISOString()
          }))
        })
      });
      setToast(res.count === 1 ? "Measurement saved to your timeline" : `${res.count} measurements saved to your timeline`);
      setMode("none");
      setValues({ temperature: "", sleep: "" });
      setBulkTexts({ temperature: "", sleep: "" });
      await refresh();
    } catch (err) {
      setError(userMessage(err, "Could not save. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  function submitSingle(e: FormEvent) {
    e.preventDefault();
    const v = Number(value);
    const lim = LIMITS[kind];
    if (!value || Number.isNaN(v) || v < lim.min || v > lim.max) {
      return setError(`${lim.label} must be between ${lim.min} and ${lim.max} ${lim.unit}.`);
    }
    if (date > todayISO()) return setError("The date can't be in the future.");
    void send([{ kind, value: v, date }]);
  }

  function submitBulk(e: FormEvent) {
    e.preventDefault();
    const lim = LIMITS[kind];
    const rows = bulkText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !/^date/i.test(l));
    const items: { kind: Kind; value: number; date: string }[] = [];
    for (const [i, row] of rows.entries()) {
      const [d, v] = row.split(/[,;\t]/).map((s) => s.trim());
      const n = Number(v);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d ?? "") || Number.isNaN(n) || n < lim.min || n > lim.max) {
        return setError(`Line ${i + 1} ("${row}") should look like 2026-11-01,${kind === "temperature" ? "36.45" : "7.5"}.`);
      }
      items.push({ kind, value: n, date: d });
    }
    if (items.length === 0) return setError("Paste at least one line.");
    if (items.length > 120) return setError("Import up to 120 readings at a time.");
    void send(items);
  }

  return (
    <div className="content patient-content">
      <div className="page-heading">
        <div>
          <p className="date-label">LONGITUDINAL HEALTH</p>
          <h1>Your health patterns</h1>
          <span>Daily signals become meaningful when viewed together over time.</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="secondary" onClick={() => { setMode(mode === "bulk" ? "none" : "bulk"); setError(""); if (sex === "male") setKind("sleep"); }}>
            <FileUp size={16} /> Import readings
          </button>
          <button className="primary compact" onClick={() => { setMode(mode === "single" ? "none" : "single"); setError(""); if (sex === "male") setKind("sleep"); }}>
            <Plus size={16} /> Log measurement
          </button>
        </div>
      </div>

      {toast && (
        <div className="toast" role="status">
          <Check size={17} /> {toast}
          <button onClick={() => setToast("")} aria-label="Dismiss">
            <X size={15} />
          </button>
        </div>
      )}

      {mode !== "none" && (
        <form className="panel assessment-form" onSubmit={mode === "single" ? submitSingle : submitBulk}>
          <div className="panel-head">
            <div>
              <h2>{mode === "single" ? "Log a measurement" : "Import readings"}</h2>
              <p>
                {mode === "single"
                  ? kind === "temperature"
                    ? "Take your temperature on waking, before getting up."
                    : "Enter how many hours you slept last night."
                  : "Paste one reading per line as date,value, for example exported from a wearable or a spreadsheet."}
              </p>
            </div>
          </div>
          <div className="role-tabs" style={{ maxWidth: 360, marginBottom: 16 }} role="tablist">
            {(sex === "male" ? (["sleep"] as Kind[]) : (["temperature", "sleep"] as Kind[])).map((k) => (
              <button key={k} type="button" role="tab" aria-selected={kind === k} className={kind === k ? "active" : ""} onClick={() => setKind(k)}>
                {k === "temperature" ? <Thermometer size={16} /> : <MoonStar size={16} />}
                {k === "temperature" ? "Basal temperature" : "Sleep"}
              </button>
            ))}
          </div>
          {mode === "single" ? (
            <div className="form-grid">
              <label className="field">
                <span>
                  {LIMITS[kind].label}
                  <em>{LIMITS[kind].unit}</em>
                </span>
                <input type="number" inputMode="decimal" step={LIMITS[kind].step} min={LIMITS[kind].min} max={LIMITS[kind].max} value={value} onChange={(e) => setValue(e.target.value)} required />
              </label>
              <label className="field">
                <span>Date</span>
                <input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} required />
              </label>
            </div>
          ) : (
            <label className="field" style={{ marginBottom: 18 }}>
              <span>
                Readings <em>date,{kind === "temperature" ? "°C" : "hours"}</em>
              </span>
              <textarea
                rows={7}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={kind === "temperature" ? "2026-11-01,36.42\n2026-11-02,36.38" : "2026-11-01,7.5\n2026-11-02,6.75"}
              />
            </label>
          )}
          {error && <div style={{ marginBottom: 14 }}><FormError>{error}</FormError></div>}
          <button className="primary" disabled={saving}>{saving ? "Saving…" : "Save to my timeline"}</button>
        </form>
      )}

      {loadError && <FormError>{loadError}</FormError>}

      {sex !== "male" && (
        <section className="panel tracking-chart">
          <div className="panel-head">
            <div>
              <h2>Basal body temperature</h2>
              <p>LOINC 8310-5 · Oral readings at wake time</p>
            </div>
          </div>
          {loading ? (
            <div className="loading-block" />
          ) : temps.length >= 2 ? (
            <>
              <div className="large-chart-wrap">
                <TemperatureChart points={temps} analysis={bbt} large />
              </div>
              <div className="chart-insight">
                <Sparkles size={17} />
                <span>
                  {bbt.status === "BIPHASIC" && (
                    <>
                      <strong>Biphasic pattern detected</strong>
                      A sustained rise of {bbt.shift.toFixed(2)}°C above your earlier readings (coverline{" "}
                      {bbt.coverline?.toFixed(2)}°C) is consistent with ovulation. Your clinician can review this alongside
                      other findings.
                    </>
                  )}
                  {bbt.status === "MONOPHASIC" && (
                    <>
                      <strong>No sustained rise yet</strong>
                      Across {bbt.readings} readings the largest rise is {bbt.shift.toFixed(2)}°C, below the{" "}
                      {SHIFT_THRESHOLD_C.toFixed(2)}°C usually seen after ovulation. Single cycles vary; your care team
                      looks at this over time.
                    </>
                  )}
                  {bbt.status === "INSUFFICIENT_DATA" && (
                    <>
                      <strong>Building your pattern</strong>
                      {bbt.readings} of {MIN_BBT_READINGS} readings so far. A rise can be assessed once there are at least{" "}
                      {MIN_BBT_READINGS} consecutive mornings.
                    </>
                  )}
                </span>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <strong>No temperature readings yet</strong>
              Log your basal temperature each morning, or import readings from your thermometer or wearable app.
            </div>
          )}
        </section>
      )}

      <section className="panel tracking-chart" style={{ marginTop: 16 }}>
        <div className="panel-head">
          <div>
            <h2>Sleep duration</h2>
            <p>LOINC 93832-4 · Last {sleepPts.length || 30} nights, 7-night average line</p>
          </div>
        </div>
        {loading ? (
          <div className="loading-block" />
        ) : sleep && sleepPts.length >= 2 ? (
          <>
            <div className="large-chart-wrap">
              <SleepChart points={sleepPts} stats={sleep} />
            </div>
            <div className="chart-insight">
              <MoonStar size={17} />
              <span>
                <strong>{sleep.disrupted ? "Your sleep has been irregular" : "Your sleep looks steady"}</strong>
                Average {formatHours(sleep.mean)} per night, varying by about {formatHours(sleep.sd)} night to night.{" "}
                {sleep.disrupted
                  ? "Short or irregular sleep can affect reproductive hormones. Your care team can suggest practical changes."
                  : "Seven or more hours most nights supports hormonal balance."}
              </span>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <strong>No sleep data yet</strong>
            Log last night&apos;s sleep or import nights from your sleep tracker.
          </div>
        )}
      </section>

      <section className="tracking-cards">
        {sex !== "male" && (
          <article className="panel">
            <div className="tracking-icon temp"><Thermometer size={19} /></div>
            <span>Latest temperature</span>
            <strong>{lastTemp ? `${lastTemp.value.toFixed(2)}°C` : "–"}</strong>
            <small>{lastTemp ? `Recorded ${shortDate(lastTemp.date)}` : "No readings yet"}</small>
          </article>
        )}
        <article className="panel">
          <div className="tracking-icon sleep"><MoonStar size={19} /></div>
          <span>7-night sleep average</span>
          <strong>{avg7 !== null ? formatHours(avg7) : "–"}</strong>
          <small>{last7.length ? `Across ${last7.length} logged night${last7.length === 1 ? "" : "s"}` : "No nights logged"}</small>
        </article>
        <article className="panel">
          <div className="tracking-icon cycle"><Activity size={19} /></div>
          <span>Readings on record</span>
          <strong>{observations.length}</strong>
          <small>{temps.length} temperature · {series(observations, isSleep).length} sleep</small>
        </article>
      </section>
      <p className="shap-footnote" style={{ marginTop: 14 }}>
        Your clinic can see these readings. Patterns are reviewed by your care team; nothing here is a diagnosis.
        Showing up to your 50 most recent records.
      </p>
    </div>
  );
}
