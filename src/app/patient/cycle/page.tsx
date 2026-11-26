"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, CalendarClock, CalendarDays, Check, Droplets, Info, Lock, PenLine, Settings2, Sparkles, X } from "lucide-react";
import { usePatient } from "@/components/patient/PatientContext";
import { useLocale } from "@/components/i18n/LocaleContext";
import { AskChip } from "@/components/patient/AskPanel";
import { FormError } from "@/components/ui/Notice";
import { CycleRing, RingLegend, daysUntil } from "@/components/cycle/CycleRing";
import { CycleCalendar } from "@/components/cycle/CycleCalendar";
import { DayLogPanel } from "@/components/cycle/DayLogPanel";
import { CycleInsights } from "@/components/cycle/CycleInsights";
import { CycleHistory } from "@/components/cycle/CycleHistory";
import { PassiveSignals } from "@/components/cycle/PassiveSignals";
import { CYCLE_COPY } from "@/components/cycle/cycle-copy";
import { api, userMessage } from "@/lib/api-client";
import { TRACKING_MODES } from "@/lib/cycle";
import type { PatientCycleResponse } from "@/types/cycle";

type CycleTab = "today" | "calendar" | "patterns";

function localToday(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export default function CyclePage() {
  const { data: patient } = usePatient();
  const { locale } = useLocale();
  const ar = locale === "ar";
  const L = CYCLE_COPY[locale];
  const isMale = patient?.profile.sex === "male";
  const today = localToday();
  const [data, setData] = useState<PatientCycleResponse | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [selected, setSelected] = useState(today);
  const [tab, setTab] = useState<CycleTab>("today");
  const [showModes, setShowModes] = useState(false);
  const [busy, setBusy] = useState(false);

  const fmt = useCallback(
    (d: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) =>
      new Date(`${d}T00:00:00Z`).toLocaleDateString(ar ? "ar-AE-u-nu-latn" : "en-GB", { ...opts, timeZone: "UTC" }),
    [ar]
  );
  const short = useCallback((d: string) => fmt(d, { day: "numeric", month: "short" }), [fmt]);

  const load = useCallback(async () => {
    try {
      setData(await api<PatientCycleResponse>("/api/patient/cycle"));
      setError("");
    } catch (err) {
      setError(userMessage(err, "Your cycle record could not be loaded."));
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const logByDate = useMemo(() => new Map((data && data.consented ? data.logs : []).map((l) => [l.date, l])), [data]);
  const tempByDate = useMemo(() => new Map((data && data.consented ? data.temperatures : []).map((t) => [t.date, t.value])), [data]);
  const sleepByDate = useMemo(() => new Map((data && data.consented ? data.sleep ?? [] : []).map((x) => [x.date, x.hours])), [data]);

  async function act(fn: () => Promise<unknown>, message: string) {
    setBusy(true);
    setError("");
    try {
      await fn();
      setToast(message);
      await load();
    } catch (err) {
      setError(userMessage(err, L.saveError));
    } finally {
      setBusy(false);
    }
  }
  const startPeriod = (date: string) => act(() => api("/api/patient/cycle/period", { method: "POST", body: JSON.stringify({ date }) }), L.savedStarted);
  const removePeriod = (id: string) => act(() => api(`/api/patient/cycle/period?id=${encodeURIComponent(id)}`, { method: "DELETE" }), L.saved);
  const setMode = (nextMode: string | null) => act(() => api("/api/patient/cycle/settings", { method: "PATCH", body: JSON.stringify({ trackingMode: nextMode }) }), L.saved).then(() => setShowModes(false));

  if (data && !data.consented) {
    return (
      <div className="content patient-content">
        <Heading L={L} />
        <section className="panel gate-card" style={{ padding: 24, display: "flex", gap: 16, alignItems: "flex-start" }}>
          <span className="gate-icon"><Lock size={20} /></span>
          <div>
            <h2 style={{ fontSize: 16, marginBottom: 6 }}>{L.consentTitle}</h2>
            <p style={{ color: "#5d6d69", fontSize: 14, marginBottom: 14 }}>{L.consentText}</p>
            <Link className="primary compact" href="/patient/privacy">{L.openPrivacy}</Link>
          </div>
        </section>
      </div>
    );
  }

  const analysis = data && data.consented ? data.analysis : null;
  const p = analysis?.prediction;
  const mode = data && data.consented ? data.trackingMode : null;
  const untilNext = p ? daysUntil(today, p.nextPeriod) : null;

  return (
    <div className="content patient-content">
      <Heading L={L}>
        {!isMale && (
          <>
            <button className="secondary" onClick={() => setShowModes((x) => !x)} aria-expanded={showModes}>
              <Settings2 size={16} /> {L.trackingFor}: {mode ? L.modes[mode]?.[0] ?? mode : "–"}
            </button>
            <button className="primary compact" onClick={() => startPeriod(today)} disabled={busy || !data}>
              <Droplets size={16} /> {L.periodStarted}
            </button>
          </>
        )}
      </Heading>

      {toast && (
        <div className="toast" role="status">
          <Check size={17} /> {toast}
          <button onClick={() => setToast("")} aria-label={L.close}><X size={15} /></button>
        </div>
      )}
      {error && <div style={{ marginBottom: 14 }}><FormError>{error}</FormError></div>}

      {showModes && !isMale && (
        <section className="panel mode-panel">
          <div className="panel-head">
            <div>
              <h2>{L.modeTitle}</h2>
              <p>{L.modeSub}</p>
            </div>
            <button className="icon-button" onClick={() => setShowModes(false)} aria-label={L.close}><X size={16} /></button>
          </div>
          <div className="mode-grid">
            {TRACKING_MODES.map((m) => (
              <button key={m} type="button" className="mode-option" aria-pressed={mode === m} onClick={() => setMode(mode === m ? null : m)} disabled={busy}>
                <strong>{L.modes[m][0]}</strong>
                <small>{L.modes[m][1]}</small>
              </button>
            ))}
          </div>
        </section>
      )}

      {!data ? (
        <div className="loading-block" style={{ height: 320 }} />
      ) : (
        analysis && p && (
          <>
            {!isMale && (
              <div className="cycle-tabs" role="tablist" aria-label={L.title}>
                <button type="button" role="tab" className="cycle-tab" aria-selected={tab === "today"} onClick={() => setTab("today")}>
                  <PenLine size={15} aria-hidden /> {L.tabToday}
                </button>
                <button type="button" role="tab" className="cycle-tab" aria-selected={tab === "calendar"} onClick={() => setTab("calendar")}>
                  <CalendarDays size={15} aria-hidden /> {L.tabCalendar}
                </button>
                <button type="button" role="tab" className="cycle-tab" aria-selected={tab === "patterns"} onClick={() => setTab("patterns")}>
                  <Activity size={15} aria-hidden /> {L.tabPatterns}
                </button>
              </div>
            )}

            {(tab === "today" || isMale) && (
              <>
                {!isMale && (
                  <section className="cycle-hero">
                    <article className="panel cycle-ring-card">
                      <CycleRing open={analysis.open} prediction={p} L={L} />
                      <RingLegend L={L} />
                    </article>
                    <div className="cycle-facts">
                      <article className="cycle-fact">
                        <span>{L.nextPeriod}</span>
                        <span className="metric-icon coral"><Droplets size={17} /></span>
                        <strong>{p.nextPeriod && analysis.open ? short(p.nextPeriod) : "–"}</strong>
                        <small>
                          {analysis.open ? (untilNext !== null && untilNext >= 0 ? L.approx(untilNext) : L.phase.LATE) : L.startHint}
                        </small>
                      </article>
                      <article className="cycle-fact">
                        <span>{L.fertileWindow}</span>
                        <span className="metric-icon teal"><Sparkles size={17} /></span>
                        <strong>{p.paused ? "–" : p.windowStart && p.windowEnd ? `${short(p.windowStart)} – ${short(p.windowEnd)}` : "–"}</strong>
                        <small>
                          {p.paused ? L.paused : !p.windowStart && p.variableMode ? L.notPin : (
                            <span className={`method-chip ${p.method === "BBT_CONFIRMED" ? "confirmed" : p.method === "SYMPTOM_CALIBRATED" ? "probable" : ""}`}>{L.method[p.method]}</span>
                          )}
                        </small>
                      </article>
                      <article className="cycle-fact">
                        <span>{L.lengthEstimate}</span>
                        <span className="metric-icon blue"><CalendarClock size={17} /></span>
                        <strong>{L.days(p.expectedLength)}</strong>
                        <small>{L.confidence[p.lengthConfidence]}</small>
                      </article>
                      <div className="cycle-fact wide">
                        <span className={`phase-pill phase-${p.phase}`}><i />{L.phase[p.phase]}</span>
                        <p><Info size={13} style={{ verticalAlign: -2 }} /> {L.disclaimer}</p>
                        <span style={{ marginInlineStart: "auto" }}>
                          <AskChip
                            topic={{
                              title: L.title,
                              context: "menstrual cycle phases fertile window ovulation cervical mucus LH test basal temperature",
                              autoExplain: "Explain my cycle phase, my fertile window and how ReproAI estimates them.",
                              questions: ["How is my fertile window estimated?", "What does cervical mucus tell me?", "When should I take an ovulation test?"]
                            }}
                          />
                        </span>
                      </div>
                    </div>
                  </section>
                )}

                <div className="cycle-layout single">
                  <DayLogPanel
                    date={selected}
                    today={today}
                    onDate={setSelected}
                    log={logByDate.get(selected)}
                    healthTemp={tempByDate.get(selected) ?? null}
                    healthSleepHours={sleepByDate.get(selected) ?? null}
                    isMale={isMale}
                    onSaved={(m) => { setToast(m); void load(); }}
                    L={L}
                    dateLabel={(d) => fmt(d, { weekday: "long", day: "numeric", month: "long" })}
                  />
                </div>
              </>
            )}

            {tab === "calendar" && !isMale && (
              <div style={{ display: "grid", gap: 16 }}>
                <CycleCalendar
                  analysis={analysis}
                  logs={data.consented ? data.logs : []}
                  today={today}
                  selected={selected}
                  onSelect={(d) => { setSelected(d); setTab("today"); }}
                  L={L}
                  locale={locale}
                />
                <CycleHistory
                  analysis={analysis}
                  cycleIds={data.consented ? data.cycleIds : []}
                  today={today}
                  onRemove={removePeriod}
                  onBackfill={startPeriod}
                  L={L}
                  dateLabel={short}
                />
              </div>
            )}

            {tab === "patterns" && !isMale && (
              <div style={{ display: "grid", gap: 16 }}>
                <CycleInsights analysis={analysis} L={L} />
                <PassiveSignals L={L} />
              </div>
            )}

            {isMale && <PassiveSignals L={L} />}
          </>
        )
      )}
    </div>
  );
}

function Heading({ L, children }: { L: (typeof CYCLE_COPY)["en"]; children?: React.ReactNode }) {
  return (
    <div className="page-heading">
      <div>
        <p className="date-label">{L.eyebrow}</p>
        <h1>{L.title}</h1>
        <span>{L.subtitle}</span>
      </div>
      {children && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{children}</div>}
    </div>
  );
}
