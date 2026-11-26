"use client";

import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleContext";
import { LAB_AR } from "@/lib/i18n";
import { LABS, isAboveLimit, isOutsideReference, type LabCode, type LabPoint } from "@/lib/labs";
import { shortDate } from "@/lib/observation-analysis";
import { SourceChip } from "@/components/record/Chips";
import { CLINICIAN_STRINGS, shortDateL } from "@/lib/i18n-clinician";
import { ChartHover } from "./ChartHover";
import { AskChip } from "@/components/patient/AskPanel";

/**
 * One marker over time against its reference limit, with the person's first
 * value as their baseline and a plain-language direction-of-change sentence.
 */
export function MarkerTrend({ code, points, audience = "patient", caseId }: { code: LabCode; points: LabPoint[]; audience?: "patient" | "clinician"; caseId?: string }) {
  const { locale } = useLocale();
  const ar = locale === "ar";
  // Clinician Arabic: neutral wording (not "your result") and Arabic dates.
  const clinAr = audience === "clinician" && ar ? CLINICIAN_STRINGS.ar : null;
  const date = (d: string) => (clinAr ? shortDateL("ar", d) : shortDate(d));
  const def = LABS[code];
  const label = ar ? LAB_AR[code] ?? def.label : def.label;
  const pts = [...points].sort((a, b) => +new Date(a.collectedAt) - +new Date(b.collectedAt));
  const last = pts[pts.length - 1];
  const first = pts[0];
  const below = isOutsideReference(code, last.value);

  const width = 320;
  const height = 90;
  const pad = 10;
  const lim = def.lowerLimit ?? def.upperLimit;
  const values = pts.map((p) => p.value).concat(lim !== undefined ? [lim] : []);
  const lo = Math.max(0, Math.min(...values) * 0.8);
  const hi = Math.max(...values) * 1.2 || 1;
  const x = (i: number) => (pts.length === 1 ? width / 2 : pad + (i * (width - pad * 2)) / (pts.length - 1));
  const y = (v: number) => height - pad - ((v - lo) / (hi - lo)) * (height - pad * 2);

  let trend: { text: string; Icon: typeof ArrowRight };
  if (pts.length < 2) {
    trend = { text: clinAr ? clinAr.trendOne : ar ? "نتيجة واحدة حتى الآن. ستُظهر النتيجة التالية اتجاه التغيّر." : "One result so far. A later result will show the direction of change.", Icon: ArrowRight };
  } else {
    const change = (last.value - first.value) / (Math.abs(first.value) || 1);
    const since = date(first.collectedAt);
    trend =
      Math.abs(change) < 0.1
        ? { text: clinAr ? clinAr.trendStable(since) : ar ? `مستقرة منذ ${since}.` : `Stable since ${since}.`, Icon: ArrowRight }
        : change > 0
          ? { text: clinAr ? clinAr.trendHigher(since) : ar ? `أعلى من نتيجتك الأولى (${since}).` : `Higher than your first result (${since}).`, Icon: ArrowUpRight }
          : { text: clinAr ? clinAr.trendLower(since) : ar ? `أقل من نتيجتك الأولى (${since}).` : `Lower than your first result (${since}).`, Icon: ArrowDownRight };
  }

  return (
    <article className={`marker-card ${below ? "below" : ""}`}>
      <header>
        <div>
          <span>{label}</span>
          <strong>
            {last.value}
            <small> {def.unit}</small>
          </strong>
        </div>
        <div className="marker-actions">
          <SourceChip source={last.source} audience={audience} />
          <AskChip topic={{ title: label, caseId, context: `${def.label} ${code} lab result`, autoExplain: markerQuestions(code, def.label, audience)[0], questions: markerQuestions(code, def.label, audience) }} />
        </div>
      </header>
      <div className="marker-plot">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${label}: ${pts.map((p) => p.value).join(", ")}`}>
        {lim !== undefined && (
          <>
            <rect x="0" y={y(lim)} width={width} height={Math.max(0, height - pad - y(lim))} style={{ fill: "var(--chart-risk)" }} opacity="0.07" />
            <line x1="0" x2={width} y1={y(lim)} y2={y(lim)} style={{ stroke: "var(--chart-risk)" }} strokeDasharray="4 4" strokeWidth="1" />
          </>
        )}
        {pts.length > 1 && (
          <polyline points={pts.map((p, i) => `${x(i)},${y(p.value)}`).join(" ")} fill="none" style={{ stroke: "var(--chart-line)" }} strokeWidth="2" />
        )}
        {pts.map((p, i) => (
          <circle key={p.id} cx={x(i)} cy={y(p.value)} r="4" style={{ fill: "var(--chart-dot-fill)", stroke: isOutsideReference(code, p.value) ? "var(--chart-risk)" : "var(--chart-line)" }} strokeWidth="2" />
        ))}
      </svg>
      <ChartHover
        count={pts.length}
        xFraction={(i) => x(i) / width}
        yFraction={(i) => y(pts[i].value) / height}
        ariaLabel={`${label}: use the arrow keys to read each result`}
        label={(i) => (
          <>
            <b dir="ltr">
              {pts[i].value} {def.unit}
            </b>{" "}
            {date(pts[i].collectedAt)}
          </>
        )}
      />
      </div>
      <p className="marker-trend">
        <trend.Icon size={14} aria-hidden /> {trend.text}
      </p>
      <small className="marker-meta">
        {ar ? "آخر نتيجة" : "Latest"} {date(last.collectedAt)}
        {lim !== undefined && (
          <>
            {" "}· {ar ? "الحد المرجعي" : "reference limit"} <span dir="ltr">{lim} {def.unit}</span>
            {below ? (isAboveLimit(code, last.value) ? (ar ? " (أعلى)" : " (above)") : ar ? " (أقل)" : " (below)") : ""}
          </>
        )}
      </small>
    </article>
  );
}

/** Suggested questions for a marker's Ask panel (English: the guidance library is English). */
function markerQuestions(code: LabCode, label: string, audience: "patient" | "clinician" = "patient"): string[] {
  switch (code) {
    case "AMH":
      return audience === "clinician"
        ? ["How should I interpret this patient's AMH result and Thiqa reserve threshold?", "What are the ESHRE/POSEIDON criteria for reduced ovarian reserve?", "When is fertility preservation indicated?"]
        : ["What does my AMH result mean?", "Does AMH tell me whether I can get pregnant?", "Why can AMH differ between tests?"];
    case "TSH":
    case "FREE_T4":
      return ["How does TSH and thyroid function affect fertility?", "What TSH range is recommended in infertility care?"];
    case "PROLACTIN":
      return ["Why should an elevated prolactin result be repeated before investigating?", "How does hyperprolactinaemia affect ovulation?"];
    case "FSH":
    case "LH":
    case "ESTRADIOL":
      return ["Why must FSH, LH and estradiol be collected on cycle day 2 to 4?", "What happens if these hormones are taken outside day 2 to 4?"];
    case "PROGESTERONE":
      return ["How does mid-luteal progesterone confirm ovulation?", "When in the cycle should progesterone be collected?"];
    case "HBA1C":
    case "FASTING_INSULIN":
      return ["How do HbA1c and insulin resistance relate to PCOS and preconception care?", "What are the ADA HbA1c thresholds?"];
    case "VITAMIN_D":
      return ["What is the Endocrine Society threshold for vitamin D deficiency?"];
    case "AFC":
      return ["What is an antral follicle count?", "How does antral follicle count relate to AMH?"];
    case "FSH":
      return ["What does FSH measure?", "Why is FSH tested early in the cycle?"];
    case "SPERM_CONCENTRATION":
      return ["Is my sperm concentration in the normal range?", "What lifestyle changes does WHO recommend?", "Why do both partners get tested?"];
    default:
      return [`What does my ${label.toLowerCase()} result mean?`, "What lifestyle changes does WHO recommend?"];
  }
}
