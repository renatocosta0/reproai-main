"use client";

import { FormEvent, useState } from "react";
import { Activity, Bluetooth, Check, FileUp, MoonStar, Plus, Sparkles, Thermometer, X } from "lucide-react";
import { BluetoothThermometer } from "@/components/patient/BluetoothThermometer";
import { SOURCE_LABELS } from "@/lib/device-import";
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
    bbtSub: "LOINC 8310-5 · Oral readings at wake time",
    biTitle: "Biphasic pattern detected",
    biText: (shift: string, cover: string) => `A sustained rise of ${shift}°C above your earlier readings (coverline ${cover}°C) is consistent with ovulation. Your clinician can review this alongside other findings.`,
    monoTitle: "No sustained rise yet",
    monoText: (n: number, shift: string, thr: string) => `Across ${n} readings the largest rise is ${shift}°C, below the ${thr}°C usually seen after ovulation. Single cycles vary; your care team looks at this over time.`,
    buildTitle: "Building your pattern",
    buildText: (n: number, min: number) => `${n} of ${min} readings so far. A rise can be assessed once there are at least ${min} consecutive mornings.`,
    noTempTitle: "No temperature readings yet",
    noTempText: "Log your basal temperature each morning, or import readings from your thermometer or wearable app.",
    sleepTitle: "Sleep duration",
    sleepSub: (n: number) => `LOINC 93832-4 · Last ${n} nights, 7-night average line`,
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
    bbtSub: "LOINC 8310-5 · قراءات فموية عند الاستيقاظ",
    biTitle: "رُصد نمط ثنائي الطور",
    biText: (shift: string, cover: string) => `ارتفاع مستمر بمقدار ${shift}°م فوق قراءاتك السابقة (خط الأساس ${cover}°م) يتوافق مع حدوث الإباضة. يمكن لطبيبك مراجعة ذلك مع النتائج الأخرى.`,
    monoTitle: "لا يوجد ارتفاع مستمر بعد",
    monoText: (n: number, shift: string, thr: string) => `عبر ${n} قراءة، أكبر ارتفاع هو ${shift}°م، وهو أقل من ${thr}°م الذي يُلاحظ عادة بعد الإباضة. تختلف الدورات من واحدة لأخرى، ويتابع فريق رعايتك ذلك مع الوقت.`,
    buildTitle: "جارٍ بناء نمطك",
    buildText: (n: number, min: number) => `القراءات حتى الآن: ${n} من ${min}. يمكن تقييم الارتفاع بعد ${min} صباحات متتالية على الأقل.`,
    noTempTitle: "لا توجد قراءات حرارة بعد",
    noTempText: "سجّل حرارتك الأساسية كل صباح، أو استورد القراءات من مقياس الحرارة أو تطبيق جهازك.",
    sleepTitle: "مدة النوم",
    sleepSub: (n: number) => `LOINC 93832-4 · آخر ${n} ليلة، مع خط متوسط ٧ ليالٍ`,
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
  const [mode, setMode] = useState<"none" | "single" | "bulk" | "bluetooth">("none");
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
          </div>
          {loading ? (
            <div className="loading-block" />
          ) : temps.length >= 2 ? (
            <>
              <div className="large-chart-wrap" dir="ltr">
                <TemperatureChart points={temps} analysis={bbt} large />
              </div>
              <div className="chart-insight">
                <Sparkles size={17} />
                <span>
                  {bbt.status === "BIPHASIC" && (
                    <>
                      <strong>{L.biTitle}</strong>
                      {L.biText(bbt.shift.toFixed(2), bbt.coverline?.toFixed(2) ?? "–")}
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
                      {L.buildText(bbt.readings, MIN_BBT_READINGS)}
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
        </div>
        {loading ? (
          <div className="loading-block" />
        ) : sleep && sleepPts.length >= 2 ? (
          <>
            <div className="large-chart-wrap" dir="ltr">
              <SleepChart points={sleepPts} stats={sleep} />
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
