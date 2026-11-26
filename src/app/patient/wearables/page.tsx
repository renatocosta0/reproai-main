"use client";

import { FormEvent, useState } from "react";
import { Activity, Bluetooth, Check, FileUp, MoonStar, Plus, Sparkles, Thermometer, X } from "lucide-react";
import { BluetoothThermometer } from "@/components/patient/BluetoothThermometer";
import { HealthConnectModal } from "@/components/patient/HealthConnectModal";
import { SOURCE_LABELS } from "@/lib/device-import";
import { usePatient } from "@/components/patient/PatientContext";
import { useObservations } from "@/components/patient/useObservations";
import { TemperatureChart } from "@/components/charts/TemperatureChart";
import { AskChip } from "@/components/patient/AskPanel";
import { ExplainTerms } from "@/components/patient/ExplainTerms";
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
import type { Point } from "@/lib/observation-analysis";
import type { BulkObservationResponse } from "@/types/patient";
import { useLocale } from "@/components/i18n/LocaleContext";

type Kind = "temperature" | "sleep";

const LIMITS: Record<Kind, { min: number; max: number; step: string; label: string; unit: string }> = {
  temperature: { min: 34, max: 40, step: "0.01", label: "Temperature", unit: "°C" },
  sleep: { min: 0, max: 16, step: "0.1", label: "Sleep", unit: "hours" }
};


const S = {
  en: {
    temperature: "Temperature", sleep: "Sleep", hours: "hours",
    saved1: "Measurement saved to your timeline",
    savedN: (n: number) => `${n} measurements saved to your timeline`,
    saveError: "Could not save. Please try again.",
    rangeError: (label: string, min: number, max: number, unit: string) => `${label} must be between ${min} and ${max} ${unit}.`,
    futureError: "The date can't be in the future.",
    lineError: (i: number, row: string, ex: string) => `Line ${i} ("${row}") should look like 2026-11-01,${ex}.`,
    pasteError: "Paste at least one line.",
    maxError: "Import up to 120 readings at a time.",
    eyebrow: "LONGITUDINAL HEALTH",
    title: "Your health patterns",
    subtitle: "Daily signals become meaningful when viewed together over time.",
    importReadings: "Import readings",
    bluetoothBtn: "Bluetooth thermometer",
    healthSyncBtn: "Apple Health / Health Connect",
    sources: (list: string) => `From: ${list}`,
    logMeasurementBtn: "Log measurement",
    dismiss: "Dismiss",
    logTitle: "Log a measurement",
    hintTemp: "Take your temperature on waking, before getting up.",
    hintSleep: "Enter how many hours you slept last night.",
    hintBulk: "Paste one reading per line as date,value, for example exported from a wearable or a spreadsheet.",
    basalTemp: "Basal temperature",
    date: "Date",
    readings: "Readings",
    saving: "Saving…",
    saveTimeline: "Save to my timeline",
    bbtTitle: "Basal body temperature",
    bbtSub: "Taken by mouth each morning, before getting up. Tap the chart to read any day.",
    biTitle: "Your temperature rose and stayed up",
    biText: (shift: string, _cover: string) => `Your morning temperature rose by about ${shift}°C and stayed higher. This kind of rise usually follows ovulation. Your clinician can review it alongside your other results.`,
    monoTitle: "No sustained rise yet",
    monoText: (n: number, shift: string, thr: string) => `Across ${n} readings the largest rise is ${shift}°C, below the ${thr}°C usually seen after ovulation. Single cycles vary; your care team looks at this over time.`,
    buildTitle: "Building your pattern",
    buildText: (n: number, min: number) => `${n} of ${min} readings so far. A rise can be assessed once there are at least ${min} consecutive mornings.`,
    earlyText: (n: number) => `${n} readings in this cycle so far. It is still early in the cycle; a rise is usually seen later, so keep logging each morning.`,
    noTempTitle: "No temperature readings yet",
    noTempText: "Log your basal temperature each morning, or import readings from your thermometer or wearable app.",
    sleepTitle: "Sleep duration",
    noneInRange: (d: number) => `No readings in the last ${d} days. Choose a longer range to see earlier readings.`,
    sleepSub: (n: number) => `Last ${n} nights. The line is your 7-night average; the dashed line is 7 hours.`,
    irregular: "Your sleep has been irregular",
    steady: "Your sleep looks steady",
    sleepStats: (mean: string, sd: string) => `Average ${mean} per night, varying by about ${sd} night to night.`,
    sleepIrregularText: "Short or irregular sleep can affect reproductive hormones. Your care team can suggest practical changes.",
    sleepSteadyText: "Seven or more hours most nights supports hormonal balance.",
    noSleepTitle: "No sleep data yet",
    noSleepText: "Log last night's sleep or import nights from your sleep tracker.",
    latestTemp: "Latest temperature",
    recorded: (d: string) => `Recorded ${d}`,
    noReadings: "No readings yet",
    sleepAvg7: "7-night sleep average",
    acrossNights: (n: number) => `Across ${n} logged night${n === 1 ? "" : "s"}`,
    noNights: "No nights logged",
    onRecord: "Readings on record",
    counts: (t: number, s: number) => `${t} temperature · ${s} sleep`,
    footnote: "Your clinic can see these readings. Patterns are reviewed by your care team; nothing here is a diagnosis. Showing up to your 50 most recent records."
  },
  ar: {
    temperature: "الحرارة", sleep: "النوم", hours: "ساعات",
    healthSyncBtn: "Apple Health / Health Connect",
    saved1: "حُفظ القياس في سجلك الزمني",
    savedN: (n: number) => `حُفظت القياسات في سجلك الزمني: ${n}`,
    saveError: "تعذّر الحفظ. يُرجى المحاولة مرة أخرى.",
    rangeError: (label: string, min: number, max: number, unit: string) => `يجب أن تكون قيمة ${label} بين ${min} و${max} ${unit}.`,
    futureError: "لا يمكن أن يكون التاريخ في المستقبل.",
    lineError: (i: number, row: string, ex: string) => `السطر ${i} ("${row}") يجب أن يكون بالشكل 2026-11-01,${ex}.`,
    pasteError: "ألصق سطرًا واحدًا على الأقل.",
    maxError: "يمكن استيراد ١٢٠ قراءة كحد أقصى في كل مرة.",
    eyebrow: "الصحة عبر الزمن",
    title: "أنماطك الصحية",
    subtitle: "تصبح الإشارات اليومية ذات معنى عند النظر إليها معًا عبر الزمن.",
    importReadings: "استيراد قراءات",
    bluetoothBtn: "ميزان حرارة بلوتوث",
    sources: (list: string) => `المصدر: ${list}`,
    logMeasurementBtn: "تسجيل قياس",
    dismiss: "إغلاق",
    logTitle: "تسجيل قياس",
    hintTemp: "قِس حرارتك عند الاستيقاظ وقبل النهوض.",
    hintSleep: "أدخل عدد الساعات التي نمتها الليلة الماضية.",
    hintBulk: "ألصق قراءة واحدة في كل سطر بصيغة التاريخ،القيمة، مثلًا من جهاز قابل للارتداء أو جدول بيانات.",
    basalTemp: "الحرارة الأساسية",
    date: "التاريخ",
    readings: "القراءات",
    saving: "جارٍ الحفظ…",
    saveTimeline: "حفظ في سجلي الزمني",
    bbtTitle: "درجة حرارة الجسم الأساسية",
    bbtSub: "تُقاس بالفم كل صباح قبل النهوض. المس المخطط لقراءة أي يوم.",
    biTitle: "ارتفعت حرارتك وبقيت مرتفعة",
    biText: (shift: string, _cover: string) => `ارتفعت حرارتك الصباحية بنحو ${shift}°م وبقيت أعلى. يحدث هذا النوع من الارتفاع عادةً بعد الإباضة. يمكن لطبيبك مراجعته مع نتائجك الأخرى.`,
    monoTitle: "لا يوجد ارتفاع مستمر بعد",
    monoText: (n: number, shift: string, thr: string) => `عبر ${n} قراءة، أكبر ارتفاع هو ${shift}°م، وهو أقل من ${thr}°م الذي يُلاحظ عادة بعد الإباضة. تختلف الدورات من واحدة لأخرى، ويتابع فريق رعايتك ذلك مع الوقت.`,
    buildTitle: "جارٍ بناء نمطك",
    buildText: (n: number, min: number) => `القراءات حتى الآن: ${n} من ${min}. يمكن تقييم الارتفاع بعد ${min} صباحات متتالية على الأقل.`,
    earlyText: (n: number) => `${n} قراءة في هذه الدورة حتى الآن. ما زال الوقت مبكراً في الدورة، وعادةً ما يظهر الارتفاع لاحقاً، لذا استمري في التسجيل كل صباح.`,
    noTempTitle: "لا توجد قراءات حرارة بعد",
    noTempText: "سجّل حرارتك الأساسية كل صباح، أو استورد القراءات من مقياس الحرارة أو تطبيق جهازك.",
    sleepTitle: "مدة النوم",
    noneInRange: (d: number) => `لا توجد قراءات خلال آخر ${d} يومًا. اختر مدة أطول لرؤية القراءات السابقة.`,
    sleepSub: (n: number) => `آخر ${n} ليلة. الخط هو متوسط ٧ ليالٍ، والخط المتقطع ٧ ساعات.`,
    irregular: "كان نومك غير منتظم",
    steady: "يبدو نومك منتظمًا",
    sleepStats: (mean: string, sd: string) => `المتوسط ${mean} في الليلة، ويتفاوت بنحو ${sd} من ليلة لأخرى.`,
    sleepIrregularText: "قد يؤثر النوم القصير أو غير المنتظم في الهرمونات الإنجابية. يمكن لفريق رعايتك اقتراح تغييرات عملية.",
    sleepSteadyText: "النوم سبع ساعات أو أكثر في معظم الليالي يدعم التوازن الهرموني.",
    noSleepTitle: "لا توجد بيانات نوم بعد",
    noSleepText: "سجّل نوم الليلة الماضية أو استورد الليالي من متتبع النوم.",
    latestTemp: "آخر قراءة حرارة",
    recorded: (d: string) => `سُجّلت في ${d}`,
    noReadings: "لا توجد قراءات بعد",
    sleepAvg7: "متوسط النوم لسبع ليالٍ",
    acrossNights: (n: number) => `الليالي المسجّلة: ${n}`,
    noNights: "لا توجد ليالٍ مسجّلة",
    onRecord: "القراءات المسجّلة",
    counts: (t: number, s: number) => `حرارة: ${t} · نوم: ${s}`,
    footnote: "يمكن لعيادتك رؤية هذه القراءات. يراجع فريق رعايتك الأنماط، ولا شيء هنا يُعد تشخيصًا. تُعرض أحدث ٥٠ قراءة كحد أقصى."
  }
};

function todayISO(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export default function WearablesPage() {
  const { data } = usePatient();
  const { observations, loading, error: loadError, refresh } = useObservations(data?.profile.userId);
  const sex = data?.profile.sex ?? null;
  const { locale } = useLocale();
  const ar = locale === "ar";
  const L = S[locale];
  const kindLabel = (k: Kind) => (k === "temperature" ? L.temperature : L.sleep);
  const kindUnit = (k: Kind) => (k === "temperature" ? "°C" : L.hours);
  const dateL = (d: string | Date) => (ar ? new Date(d).toLocaleDateString("ar-AE-u-nu-latn", { day: "numeric", month: "short" }) : shortDate(d));
  const [mode, setMode] = useState<"none" | "single" | "bulk" | "bluetooth" | "health-sync">("none");
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
  // Range buttons change only what the charts show; the insight text uses all readings.
  const [range, setRange] = useState<RangeDays>(0);
  const tempsShown = inRange(temps, range);
  const bbtShown = analyzeBbt(tempsShown);
  const sleepShown = inRange(sleepPts, range);
  const sleepShownStats = sleepStats(sleepShown);
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
      setToast(res.count === 1 ? L.saved1 : L.savedN(res.count));
      setMode("none");
      setValues({ temperature: "", sleep: "" });
      setBulkTexts({ temperature: "", sleep: "" });
      await refresh();
    } catch (err) {
      setError(userMessage(err, L.saveError));
    } finally {
      setSaving(false);
    }
  }

  function submitSingle(e: FormEvent) {
    e.preventDefault();
    const v = Number(value);
    const lim = LIMITS[kind];
    if (!value || Number.isNaN(v) || v < lim.min || v > lim.max) {
      return setError(L.rangeError(kindLabel(kind), lim.min, lim.max, kindUnit(kind)));
    }
    if (date > todayISO()) return setError(L.futureError);
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
        return setError(L.lineError(i + 1, row, kind === "temperature" ? "36.45" : "7.5"));
      }
      items.push({ kind, value: n, date: d });
    }
    if (items.length === 0) return setError(L.pasteError);
    if (items.length > 120) return setError(L.maxError);
    void send(items);
  }

  return (
    <div className="content patient-content">
      <div className="page-heading">
        <div>
          <p className="date-label">{L.eyebrow}</p>
          <h1>{L.title}</h1>
          <span>{L.subtitle}</span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="secondary" onClick={() => { setMode(mode === "health-sync" ? "none" : "health-sync"); setError(""); }}>
            <Activity size={16} /> {L.healthSyncBtn}
          </button>
          {sex !== "male" && (
            <button className="secondary" onClick={() => { setMode(mode === "bluetooth" ? "none" : "bluetooth"); setError(""); }}>
              <Bluetooth size={16} /> {L.bluetoothBtn}
            </button>
          )}
          <button className="secondary" onClick={() => { setMode(mode === "bulk" ? "none" : "bulk"); setError(""); if (sex === "male") setKind("sleep"); }}>
            <FileUp size={16} /> {L.importReadings}
          </button>
          <button className="primary compact" onClick={() => { setMode(mode === "single" ? "none" : "single"); setError(""); if (sex === "male") setKind("sleep"); }}>
            <Plus size={16} /> {L.logMeasurementBtn}
          </button>
        </div>
      </div>

      {toast && (
        <div className="toast" role="status">
          <Check size={17} /> {toast}
          <button onClick={() => setToast("")} aria-label={L.dismiss}>
            <X size={15} />
          </button>
        </div>
      )}

      {mode === "health-sync" && (
        <HealthConnectModal
          locale={ar ? "ar" : "en"}
          onClose={() => setMode("none")}
          onManualEntry={() => { setMode("single"); setError(""); }}
          onSaved={(msg) => { setToast(msg); setMode("none"); void refresh(); }}
        />
      )}

      {mode === "bluetooth" && (
        <BluetoothThermometer
          locale={ar ? "ar" : "en"}
          onClose={() => setMode("none")}
          onSaved={(msg) => { setToast(msg); setMode("none"); void refresh(); }}
        />
      )}

      {(mode === "single" || mode === "bulk") && (
        <form className="panel assessment-form" onSubmit={mode === "single" ? submitSingle : submitBulk}>
          <div className="panel-head">
            <div>
              <h2>{mode === "single" ? L.logTitle : L.importReadings}</h2>
              <p>
                {mode === "single" ? (kind === "temperature" ? L.hintTemp : L.hintSleep) : L.hintBulk}
              </p>
            </div>
          </div>
          <div className="role-tabs" style={{ maxWidth: 360, marginBottom: 16 }} role="tablist">
            {(sex === "male" ? (["sleep"] as Kind[]) : (["temperature", "sleep"] as Kind[])).map((k) => (
              <button key={k} type="button" role="tab" aria-selected={kind === k} className={kind === k ? "active" : ""} onClick={() => setKind(k)}>
                {k === "temperature" ? <Thermometer size={16} /> : <MoonStar size={16} />}
                {k === "temperature" ? L.basalTemp : L.sleep}
              </button>
            ))}
          </div>
          {mode === "single" ? (
            <div className="form-grid">
              <label className="field">
                <span>
                  {kindLabel(kind)}
                  <em>{kindUnit(kind)}</em>
                </span>
                <input type="number" inputMode="decimal" step={LIMITS[kind].step} min={LIMITS[kind].min} max={LIMITS[kind].max} value={value} onChange={(e) => setValue(e.target.value)} required />
              </label>
              <label className="field">
                <span>{L.date}</span>
                <input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} required />
              </label>
            </div>
          ) : (
            <label className="field" style={{ marginBottom: 18 }}>
              <span>
                {L.readings} <em dir="ltr">date,{kind === "temperature" ? "°C" : "hours"}</em>
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
          <button className="primary" disabled={saving}>{saving ? L.saving : L.saveTimeline}</button>
        </form>
      )}

      {loadError && <FormError>{loadError}</FormError>}

      {sex !== "male" && (
        <section className="panel tracking-chart">
          <div className="panel-head">
            <div>
              <h2>{L.bbtTitle}</h2>
              <p>{L.bbtSub}</p>
            </div>
            <div className="panel-actions">
              <RangeButtons value={range} onChange={setRange} ar={ar} />
              <AskChip topic={{ title: L.bbtTitle, context: "basal body temperature wearable temperature readings ovulation", autoExplain: "Explain my basal body temperature readings and what a temperature rise means.", questions: ["What does a rise in basal body temperature mean?", "How should I measure my morning temperature?", "Can basal body temperature confirm ovulation?"] }} />
            </div>
          </div>
          {loading ? (
            <div className="loading-block" />
          ) : temps.length >= 2 ? (
            <>
              <div className="large-chart-wrap" dir="ltr">
                {tempsShown.length >= 2 ? (
                  <TemperatureChart points={tempsShown} analysis={bbtShown} large />
                ) : (
                  <div className="empty-state" dir={ar ? "rtl" : "ltr"}>{L.noneInRange(range)}</div>
                )}
              </div>
              <div className="chart-insight">
                <Sparkles size={17} />
                <span>
                  {bbt.status === "BIPHASIC" && (
                    <>
                      <strong>{L.biTitle}</strong>
                      <ExplainTerms text={L.biText(bbt.shift.toFixed(2), bbt.coverline?.toFixed(2) ?? "–")} />
                    </>
                  )}
                  {bbt.status === "MONOPHASIC" && (
                    <>
                      <strong>{L.monoTitle}</strong>
                      {L.monoText(bbt.readings, bbt.shift.toFixed(2), SHIFT_THRESHOLD_C.toFixed(2))}
                    </>
                  )}
                  {bbt.status === "INSUFFICIENT_DATA" && (
                    <>
                      <strong>{L.buildTitle}</strong>
                      {bbt.readings >= MIN_BBT_READINGS ? L.earlyText(bbt.readings) : L.buildText(bbt.readings, MIN_BBT_READINGS)}
                    </>
                  )}
                </span>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <strong>{L.noTempTitle}</strong>
              {L.noTempText}
            </div>
          )}
        </section>
      )}

      <section className="panel tracking-chart" style={{ marginTop: 16 }}>
        <div className="panel-head">
          <div>
            <h2>{L.sleepTitle}</h2>
            <p>{L.sleepSub(sleepPts.length || 30)}</p>
          </div>
          <div className="panel-actions">
            <RangeButtons value={range} onChange={setRange} ar={ar} />
            <AskChip topic={{ title: L.sleepTitle, context: "wearable sleep nights sleep duration fertility", autoExplain: "Explain my wearable sleep data and how sleep affects fertility.", questions: ["How does sleep affect fertility?", "What lifestyle changes does WHO recommend?"] }} />
          </div>
        </div>
        {loading ? (
          <div className="loading-block" />
        ) : sleep && sleepPts.length >= 2 ? (
          <>
            <div className="large-chart-wrap" dir="ltr">
              {sleepShown.length >= 2 && sleepShownStats ? (
                <SleepChart points={sleepShown} stats={sleepShownStats} />
              ) : (
                <div className="empty-state" dir={ar ? "rtl" : "ltr"}>{L.noneInRange(range)}</div>
              )}
            </div>
            <div className="chart-insight">
              <MoonStar size={17} />
              <span>
                <strong>{sleep.disrupted ? L.irregular : L.steady}</strong>
                {L.sleepStats(formatHours(sleep.mean), formatHours(sleep.sd))}{" "}
                {sleep.disrupted ? L.sleepIrregularText : L.sleepSteadyText}
              </span>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <strong>{L.noSleepTitle}</strong>
            {L.noSleepText}
          </div>
        )}
      </section>

      <section className="tracking-cards">
        {sex !== "male" && (
          <article className="panel">
            <div className="tracking-icon temp"><Thermometer size={19} /></div>
            <span>{L.latestTemp}</span>
            <strong>{lastTemp ? `${lastTemp.value.toFixed(2)}°C` : "–"}</strong>
            <small>{lastTemp ? L.recorded(dateL(lastTemp.date)) : L.noReadings}</small>
          </article>
        )}
        <article className="panel">
          <div className="tracking-icon sleep"><MoonStar size={19} /></div>
          <span>{L.sleepAvg7}</span>
          <strong>{avg7 !== null ? formatHours(avg7) : "–"}</strong>
          <small>{last7.length ? L.acrossNights(last7.length) : L.noNights}</small>
        </article>
        <article className="panel">
          <div className="tracking-icon cycle"><Activity size={19} /></div>
          <span>{L.onRecord}</span>
          <strong>{observations.length}</strong>
          <small>{L.counts(temps.length, series(observations, isSleep).length)}</small>
          {observations.length > 0 && (
            <small style={{ display: "block" }}>
              {L.sources(
                Object.entries(
                  observations.reduce<Record<string, number>>((acc, o) => {
                    const k = SOURCE_LABELS[o.source ?? "MANUAL"] ?? o.source ?? "";
                    acc[k] = (acc[k] ?? 0) + 1;
                    return acc;
                  }, {})
                ).map(([k, n]) => `${k} (${n})`).join(", ")
              )}
            </small>
          )}
        </article>
      </section>
      <p className="shap-footnote" style={{ marginTop: 14 }}>
        {L.footnote}
      </p>
    </div>
  );
}

type RangeDays = 0 | 7 | 30 | 90;

/** Readings from the last `days` days (0 = all). */
function inRange(points: Point[], days: RangeDays): Point[] {
  if (!days) return points;
  const from = Date.now() - days * 24 * 60 * 60 * 1000;
  return points.filter((p) => p.date.getTime() >= from);
}

function RangeButtons({ value, onChange, ar }: { value: RangeDays; onChange: (d: RangeDays) => void; ar: boolean }) {
  const options: { d: RangeDays; label: string }[] = [
    { d: 7, label: ar ? "٧ أيام" : "7d" },
    { d: 30, label: ar ? "٣٠ يومًا" : "30d" },
    { d: 90, label: ar ? "٩٠ يومًا" : "90d" },
    { d: 0, label: ar ? "الكل" : "All" }
  ];
  return (
    <div className="range-buttons" role="group" aria-label={ar ? "المدة المعروضة" : "Time range shown"}>
      {options.map((o) => (
        <button key={o.d} type="button" className={value === o.d ? "active" : ""} aria-pressed={value === o.d} onClick={() => onChange(o.d)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
