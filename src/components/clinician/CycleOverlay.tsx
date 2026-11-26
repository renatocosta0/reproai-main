"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarRange, FlaskConical, Lock } from "lucide-react";
import { api, userMessage } from "@/lib/api-client";
import { LABS, isAboveLimit, isOutsideReference, referenceText, type LabCode } from "@/lib/labs";
import { LAB_AR } from "@/lib/i18n";
import { diffDays, type CycleSummary, type LabAlignment } from "@/lib/cycle";
import { useClinicianText } from "@/components/clinician/useClinicianText";
import { AskChip } from "@/components/patient/AskPanel";
import type { ClinicianCycleResponse } from "@/types/cycle";

const C = {
  en: {
    title: "Cycles & lab timing",
    sub: "Logged cycles aligned at day 1, with temperature, ovulation and when each hormone sample was taken.",
    notShared: { CLINICIAN_ACCESS: "The patient has not shared their record.", CYCLE_TRACKING: "The patient has not turned on cycle tracking." } as Record<string, string>,
    none: "No cycles logged yet.",
    loading: "Loading cycles…",
    figo: { NORMAL: "FIGO: within normal limits", ATTENTION: "FIGO: outside normal limits", INSUFFICIENT_DATA: "FIGO: < 3 cycles" } as Record<string, string>,
    mean: (n: number) => `mean ${n} d`,
    variation: (v: number, lim: number) => `variation ${v} d (limit ${lim})`,
    confirmed: (n: number) => `${n} confirmed ovulation${n === 1 ? "" : "s"}`,
    shortLuteal: (n: number) => `${n} short luteal (< 10 d)`,
    pms: "PMS-type pattern (observational)",
    paused: (m: string) => `Predictions paused: ${m.toLowerCase().replace(/_/g, " ")}`,
    completeness: (v: number, d: number) => `Current cycle: ${v}/${d} valid temperatures`,
    day: "Cycle day",
    legend: { period: "Period", fertile: "Fertile window", luteal: "Luteal", ovulation: "Ovulation (filled = confirmed by BBT)", bbt: "BBT", inWindow: "Lab in window", outWindow: "Lab out of window" },
    timing: "Sample timing",
    thMarker: "Marker", thResult: "Result", thWhen: "When in cycle", thStatus: "Timing",
    cd: (n: number) => `CD ${n}`,
    afterOv: (n: number) => `${n >= 0 ? "+" : ""}${n} d after ovulation`,
    unknownCd: "cycle day unknown",
    status: { IN_WINDOW: "In window", OUT_OF_WINDOW: "Out of window", UNKNOWN: "Cannot check", NOT_CYCLE_DEPENDENT: "Any day" } as Record<string, string>,
    noTimed: "No cycle-dependent hormone results yet (FSH, LH, estradiol day 2–4; progesterone mid-luteal).",
    panel: "Endocrine & metabolic panel",
    panelSub: "Latest verified result for each recommended marker.",
    notRecorded: "Not on record",
    inRange: "In range",
    above: "Above reference",
    below: "Below reference",
    noRef: "Lab-dependent range",
    current: "current",
    ovMethod: { BBT_ROETZER: "BBT", LH_SURGE: "LH", MUCUS_PEAK: "mucus", CALENDAR: "calendar", UNCONFIRMED: "unconfirmed" } as Record<string, string>,
    findings: "Findings",
    selfReported: "Self-reported cycle log; notes and the private intimacy log are never shown."
  },
  ar: {
    title: "الدورات وتوقيت التحاليل",
    sub: "الدورات المسجّلة مصفوفة من اليوم الأول، مع الحرارة والإباضة وتوقيت أخذ كل عينة هرمونية.",
    notShared: { CLINICIAN_ACCESS: "لم تشارك المريضة سجلها.", CYCLE_TRACKING: "لم تفعّل المريضة متابعة الدورة." } as Record<string, string>,
    none: "لا توجد دورات مسجّلة بعد.",
    loading: "جارٍ تحميل الدورات…",
    figo: { NORMAL: "FIGO: ضمن الحدود الطبيعية", ATTENTION: "FIGO: خارج الحدود الطبيعية", INSUFFICIENT_DATA: "FIGO: أقل من ٣ دورات" } as Record<string, string>,
    mean: (n: number) => `المتوسط ${n} يوم`,
    variation: (v: number, lim: number) => `التفاوت ${v} يوم (الحد ${lim})`,
    confirmed: (n: number) => `إباضات مؤكدة: ${n}`,
    shortLuteal: (n: number) => `طور أصفري قصير: ${n}`,
    pms: "نمط شبيه بمتلازمة ما قبل الدورة (رصدي)",
    paused: (m: string) => `التوقعات متوقفة: ${m}`,
    completeness: (v: number, d: number) => `الدورة الحالية: ${v}/${d} قراءة حرارة صالحة`,
    day: "يوم الدورة",
    legend: { period: "الدورة", fertile: "نافذة الخصوبة", luteal: "الطور الأصفري", ovulation: "الإباضة (ممتلئة = مؤكدة بالحرارة)", bbt: "الحرارة القاعدية", inWindow: "تحليل في التوقيت", outWindow: "تحليل خارج التوقيت" },
    timing: "توقيت العينات",
    thMarker: "المؤشر", thResult: "النتيجة", thWhen: "التوقيت في الدورة", thStatus: "التوقيت",
    cd: (n: number) => `يوم ${n}`,
    afterOv: (n: number) => `${n} يوم بعد الإباضة`,
    unknownCd: "يوم الدورة غير معروف",
    status: { IN_WINDOW: "في التوقيت", OUT_OF_WINDOW: "خارج التوقيت", UNKNOWN: "لا يمكن التحقق", NOT_CYCLE_DEPENDENT: "أي يوم" } as Record<string, string>,
    noTimed: "لا توجد نتائج هرمونية مرتبطة بالدورة بعد (FSH وLH والإستراديول في اليوم ٢–٤؛ البروجسترون في منتصف الطور الأصفري).",
    panel: "لوحة الغدد الصماء والاستقلاب",
    panelSub: "أحدث نتيجة موثّقة لكل مؤشر موصى به.",
    notRecorded: "غير مسجّل",
    inRange: "ضمن المرجع",
    above: "أعلى من المرجع",
    below: "أقل من المرجع",
    noRef: "النطاق حسب المختبر",
    current: "الحالية",
    ovMethod: { BBT_ROETZER: "حرارة", LH_SURGE: "LH", MUCUS_PEAK: "إفرازات", CALENDAR: "تقويم", UNCONFIRMED: "غير مؤكدة" } as Record<string, string>,
    findings: "النتائج",
    selfReported: "سجل دورة بإبلاغ ذاتي؛ لا تُعرض الملاحظات ولا السجل الخاص أبدًا."
  }
};

const PANEL: LabCode[] = ["TSH", "FREE_T4", "PROLACTIN", "FSH", "LH", "ESTRADIOL", "PROGESTERONE", "HBA1C", "FASTING_INSULIN", "VITAMIN_D"];
const TIMED = new Set(["FSH", "LH", "ESTRADIOL", "PROGESTERONE"]);

/** Clinician view: last cycles overlaid at day 1, BBT per cycle and hormone sample timing. */
export function CycleOverlay({ caseId, userId }: { caseId: string; userId: string }) {
  const { ar, date } = useClinicianText();
  const T = C[ar ? "ar" : "en"];
  const [data, setData] = useState<ClinicianCycleResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    api<ClinicianCycleResponse>(`/api/clinician/cases/${caseId}/cycles?userId=${encodeURIComponent(userId)}`)
      .then((r) => alive && setData(r))
      .catch((err) => alive && setError(userMessage(err, "The cycle record could not be loaded.")));
    return () => {
      alive = false;
    };
  }, [caseId, userId]);

  if (error) return <div className="cycle-overlay"><p className="muted-note">{error}</p></div>;
  if (!data) return <div className="cycle-overlay"><p className="muted-note">{T.loading}</p></div>;
  return <CycleOverlayView data={data} ar={ar} date={date} caseId={caseId} />;
}

/** Presentational part of the overlay (also used for previews and tests). */
export function CycleOverlayView({ data, ar, date, caseId }: { data: ClinicianCycleResponse; ar: boolean; date: (d: string) => string; caseId?: string }) {
  const T = C[ar ? "ar" : "en"];
  const labName = (c: string) => (ar ? LAB_AR[c] ?? LABS[c as LabCode]?.label ?? c : LABS[c as LabCode]?.label ?? c);
  if (!data.shared) {
    return (
      <div className="cycle-overlay">
        <h4 className="mini-title"><Lock size={14} /> {T.title}</h4>
        <p className="muted-note">{T.notShared[data.reason]}</p>
      </div>
    );
  }

  const { analysis, alignment, labs } = data;
  const p = analysis.prediction;
  const open = analysis.open;
  const validNow = open ? data.temperatures.filter((t) => t.date >= open.startDate).length : 0;

  return (
    <div className="cycle-overlay">
      <div className="overlay-head">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <h4 className="mini-title" style={{ margin: 0 }}><CalendarRange size={15} /> {T.title}</h4>
            <AskChip topic={{ title: T.title, caseId, context: "FIGO normal menstrual cycle parameters Roetzer 3-over-6 BBT luteal phase", autoExplain: "How should I interpret the FIGO cycle regularity, Roetzer BBT shift and luteal phase in this chart?", questions: ["What are the FIGO 2018 normal menstrual limits?", "When does a short luteal phase warrant investigation?", "How is ovulation confirmed by BBT?"] }} />
          </div>
          <small className="muted-note">{T.sub}</small>
        </div>
        <div className="overlay-chips">
          <span className={`status-pill ${analysis.figo.status === "NORMAL" ? "mint" : analysis.figo.status === "ATTENTION" ? "rose" : "amber"}`}><i />{T.figo[analysis.figo.status]}</span>
          {analysis.figo.meanLength !== null && <span className="method-chip">{T.mean(Math.round(analysis.figo.meanLength))}</span>}
          {analysis.figo.variationDays !== null && <span className="method-chip">{T.variation(analysis.figo.variationDays, analysis.figo.variationLimit)}</span>}
          <span className="method-chip confirmed">{T.confirmed(analysis.ovulatory.confirmedCycles)}</span>
          {analysis.ovulatory.shortLutealCycles > 0 && <span className="method-chip possible">{T.shortLuteal(analysis.ovulatory.shortLutealCycles)}</span>}
          {analysis.pms.status === "PATTERN" && <span className="method-chip possible">{T.pms}</span>}
          {p.paused && data.trackingMode && <span className="method-chip">{T.paused(data.trackingMode)}</span>}
          {open && p.cycleDay !== null && <span className="method-chip">{T.completeness(validNow, p.cycleDay)}</span>}
        </div>
      </div>

      {analysis.cycles.length === 0 ? (
        <p className="muted-note">{T.none}</p>
      ) : (
        <OverlayChart cycles={analysis.cycles} temps={data.temperatures} alignment={alignment} today={data.today} T={T} dateFmt={date} />
      )}

      {(analysis.figo.findings.length > 0 || analysis.ovulatory.findings.length > 0) && (
        <ul className="finding-list" style={{ marginTop: 10 }}>
          {[...analysis.figo.findings, ...analysis.ovulatory.findings].map((f) => (
            <li key={f.code}>
              <span className={`status-pill ${f.level === "P1" ? "rose" : "amber"}`} style={{ padding: "2px 7px" }}><i />{f.level}</span>
              <span dir="ltr">{f.detail}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="overlay-grid-2">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
            <h4 className="mini-title" style={{ margin: 0 }}><FlaskConical size={14} /> {T.timing}</h4>
            <AskChip topic={{ title: T.timing, caseId, context: "FSH LH estradiol cycle day 2-4 mid-luteal progesterone sample timing", autoExplain: "Why does cycle timing matter for FSH, LH, estradiol and mid-luteal progesterone?", questions: ["Why must FSH and estradiol be drawn on cycle day 2 to 4?", "What mid-luteal progesterone level confirms ovulation?"] }} />
          </div>
          {alignment.filter((a) => TIMED.has(a.code)).length === 0 ? (
            <p className="muted-note">{T.noTimed}</p>
          ) : (
            <div className="table-wrap">
              <table className="timing-table">
                <thead><tr><th>{T.thMarker}</th><th>{T.thResult}</th><th>{T.thWhen}</th><th>{T.thStatus}</th></tr></thead>
                <tbody>
                  {alignment.filter((a) => TIMED.has(a.code)).slice(-10).reverse().map((a) => {
                    const lab = labs.find((l) => l.id === a.labId);
                    return (
                      <tr key={a.labId}>
                        <td>{labName(a.code)}</td>
                        <td dir="ltr">{lab ? `${lab.value} ${lab.unit}` : "–"} <small className="muted-note">{date(a.collectedOn)}</small></td>
                        <td>{a.code === "PROGESTERONE" && a.daysAfterOvulation !== null ? T.afterOv(a.daysAfterOvulation) : a.cycleDay !== null ? T.cd(a.cycleDay) : T.unknownCd}</td>
                        <td>
                          <span className={`status-pill ${a.timing === "IN_WINDOW" ? "mint" : a.timing === "OUT_OF_WINDOW" ? "amber" : ""}`} title={a.expected ?? ""}><i />{T.status[a.timing]}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div>
          <h4 className="mini-title">{T.panel}</h4>
          <small className="muted-note" style={{ display: "block", marginBottom: 8 }}>{T.panelSub}</small>
          <EndocrinePanel labs={labs} alignment={alignment} T={T} labName={labName} dateFmt={date} />
        </div>
      </div>
      <small className="muted-note" style={{ display: "block", marginTop: 10 }}>{T.selfReported}</small>
    </div>
  );
}

function EndocrinePanel({
  labs,
  alignment,
  T,
  labName,
  dateFmt
}: {
  labs: { id: string; code: string; value: number; unit: string; collectedAt: string }[];
  alignment: LabAlignment[];
  T: (typeof C)["en"];
  labName: (c: string) => string;
  dateFmt: (d: string) => string;
}) {
  return (
    <ul className="endocrine-list">
      {PANEL.map((code) => {
        const latest = labs.filter((l) => l.code === code).sort((a, b) => b.collectedAt.localeCompare(a.collectedAt))[0];
        const ref = referenceText(code);
        const al = latest ? alignment.find((a) => a.labId === latest.id) : null;
        const tone = !latest ? "" : isOutsideReference(code, latest.value) ? "rose" : ref ? "mint" : "";
        const label = !latest ? T.notRecorded : isOutsideReference(code, latest.value) ? (isAboveLimit(code, latest.value) ? T.above : T.below) : ref ? T.inRange : T.noRef;
        return (
          <li key={code}>
            <div>
              <strong>{labName(code)}</strong>
              <small dir="ltr">
                {latest ? `${latest.value} ${latest.unit} · ${dateFmt(latest.collectedAt)}` : ref ?? ""}
                {al && al.timing === "OUT_OF_WINDOW" ? ` · ${T.status.OUT_OF_WINDOW}` : ""}
              </small>
            </div>
            <span className={`status-pill ${tone}`}><i />{label}</span>
          </li>
        );
      })}
    </ul>
  );
}

function OverlayChart({
  cycles,
  temps,
  alignment,
  today,
  T,
  dateFmt
}: {
  cycles: CycleSummary[];
  temps: { date: string; value: number }[];
  alignment: LabAlignment[];
  today: string;
  T: (typeof C)["en"];
  dateFmt: (d: string) => string;
}) {
  const rows = useMemo(() => [...cycles].reverse().slice(0, 8), [cycles]);
  const lenOf = (c: CycleSummary) => c.lengthDays ?? diffDays(today, c.startDate) + 1;
  const maxDay = Math.max(35, ...rows.map(lenOf));
  const W = 760;
  const left = 92;
  const right = 52;
  const rowH = 34;
  const top = 22;
  const H = top + rows.length * rowH + 30;
  const x = (day: number) => left + ((day - 1) / maxDay) * (W - left - right);
  const dayW = (W - left - right) / maxDay;

  return (
    <>
      <svg className="overlay-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={T.title}>
        {Array.from({ length: Math.floor(maxDay / 7) + 1 }, (_, i) => i * 7 + 1).map((d) => (
          <g key={d}>
            <line x1={x(d)} x2={x(d)} y1={top - 6} y2={H - 26} stroke="var(--chart-grid)" />
            <text x={x(d)} y={H - 12} textAnchor="middle">{d}</text>
          </g>
        ))}
        <text x={left} y={12}>{T.day}</text>
        {rows.map((c, r) => {
          const y = top + r * rowH;
          const len = lenOf(c);
          const ov = c.ovulation.date ? diffDays(c.ovulation.date, c.startDate) + 1 : null;
          const ct = temps.filter((t) => t.date >= c.startDate && (!c.nextStartDate || t.date < c.nextStartDate));
          const lo = ct.length ? Math.min(...ct.map((t) => t.value)) - 0.05 : 0;
          const hi = ct.length ? Math.max(...ct.map((t) => t.value)) + 0.05 : 1;
          const ty = (v: number) => y + rowH - 9 - ((v - lo) / (hi - lo || 1)) * (rowH - 16);
          const labs = alignment.filter((a) => a.cycleStart === c.startDate && a.cycleDay !== null && TIMED.has(a.code));
          return (
            <g key={c.startDate}>
              <text x={8} y={y + rowH / 2 + 3} className="row-label">{dateFmt(c.startDate)}</text>
              <rect x={x(1)} y={y + 6} width={len * dayW} height={rowH - 12} rx={6} fill="var(--cy-track)" strokeDasharray={c.status === "OPEN" ? "4 3" : undefined} stroke={c.status === "OPEN" ? "var(--chart-guide)" : "none"} />
              {ov !== null && <rect x={x(ov - 5)} y={y + 6} width={7 * dayW} height={rowH - 12} fill="var(--cy-fertile-soft)" />}
              {ov !== null && c.status === "COMPLETED" && <rect x={x(ov + 1)} y={y + 6} width={Math.max(0, (len - ov) * dayW)} height={rowH - 12} fill="var(--cy-luteal)" opacity={0.35} />}
              <rect x={x(1)} y={y + 6} width={(c.periodDays ?? 5) * dayW} height={rowH - 12} rx={6} fill="var(--cy-period)" opacity={0.9} />
              {ct.length >= 2 && (
                <polyline
                  fill="none"
                  stroke="var(--chart-temp)"
                  strokeWidth={1.4}
                  points={ct.map((t) => `${x(diffDays(t.date, c.startDate) + 1) + dayW / 2},${ty(t.value)}`).join(" ")}
                />
              )}
              {ov !== null && (
                <path
                  d={`M ${x(ov) + dayW / 2} ${y + 3} l 5 6 l -5 6 l -5 -6 z`}
                  fill={c.ovulation.confidence === "confirmed" ? "var(--cy-ovulation)" : "var(--chart-dot-fill)"}
                  stroke="var(--cy-ovulation)"
                  strokeWidth={1.5}
                >
                  <title>{`${T.legend.ovulation}: ${T.ovMethod[c.ovulation.method] ?? c.ovulation.method}`}</title>
                </path>
              )}
              {labs.map((a) => (
                <g key={a.labId}>
                  <circle cx={x(a.cycleDay!) + dayW / 2} cy={y + rowH - 6} r={4.5} fill={a.timing === "IN_WINDOW" ? "var(--chart-protective)" : "var(--chart-moderate)"} stroke="var(--chart-dot-fill)" strokeWidth={1.5}>
                    <title>{`${a.code} · ${T.cd(a.cycleDay!)} · ${T.status[a.timing]}`}</title>
                  </circle>
                  <text x={x(a.cycleDay!) + dayW / 2 + 6} y={y + rowH - 3} style={{ fontSize: 9, fontWeight: 700 }}>{a.code === "PROGESTERONE" ? "P4" : a.code === "ESTRADIOL" ? "E2" : a.code}</text>
                </g>
              ))}
              <text x={x(len) + dayW + 4} y={y + rowH / 2 + 3}>{c.status === "OPEN" ? T.current : `${len}d`}{c.lutealDays !== null ? ` · L${c.lutealDays}` : ""}</text>
            </g>
          );
        })}
      </svg>
      <div className="cal-legend" style={{ padding: "6px 0 0" }} aria-hidden>
        <span><i style={{ background: "var(--cy-period)" }} />{T.legend.period}</span>
        <span><i style={{ background: "var(--cy-fertile-soft)" }} />{T.legend.fertile}</span>
        <span><i style={{ background: "var(--cy-luteal)", opacity: 0.5 }} />{T.legend.luteal}</span>
        <span>◆ {T.legend.ovulation}</span>
        <span><i style={{ background: "var(--chart-temp)", height: 2 }} />{T.legend.bbt}</span>
        <span><i style={{ background: "var(--chart-protective)", borderRadius: "50%" }} />{T.legend.inWindow}</span>
        <span><i style={{ background: "var(--chart-moderate)", borderRadius: "50%" }} />{T.legend.outWindow}</span>
      </div>
    </>
  );
}
