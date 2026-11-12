"use client";

import type { ShapFactor } from "@/types/patient";
import { useLocale } from "@/components/i18n/LocaleContext";

const FEATURE_AR: Record<string, string> = {
  "Female age": "العمر",
  "Male age": "العمر",
  "AMH (ovarian reserve)": "مخزون المبيض (AMH)",
  "Sperm concentration": "تركيز الحيوانات المنوية",
  BMI: "مؤشر كتلة الجسم",
  "PCOS history": "تكيّس المبايض",
  "Infertility duration": "مدة محاولة الحمل",
  "Prior treatment cycles": "دورات علاج سابقة"
};
import { featureLabel } from "@/lib/tiers";

/**
 * Diverging bars of exact Shapley values (log-odds contribution relative to the
 * reference population). Mint pushes the estimate up, coral pulls it down.
 */
export function ShapChart({ factors }: { factors: ShapFactor[] }) {
  const { locale } = useLocale();
  const ar = locale === "ar";
  const rows = factors
    .map((f) => ({ ...f, phi: f.shapley_value ?? (f.direction === "negative" ? -f.impact : f.impact) }))
    .sort((a, b) => Math.abs(b.phi) - Math.abs(a.phi));
  const max = Math.max(...rows.map((r) => Math.abs(r.phi)), 0.0001);

  return (
    <div className="shap-chart" role="table" aria-label="Factor contributions">
      <div className="shap-legend" aria-hidden>
        <span><i className="neg" /> {ar ? "يخفض التقدير" : "Lowers estimate"}</span>
        <span><i className="pos" /> {ar ? "يرفع التقدير" : "Raises estimate"}</span>
      </div>
      {rows.map((r) => {
        const w = (Math.abs(r.phi) / max) * 50;
        const positive = r.phi > 0;
        return (
          <div className="shap-row" role="row" key={r.feature}>
            <span className="shap-label" role="cell">{ar ? FEATURE_AR[r.feature] ?? featureLabel(r.feature) : featureLabel(r.feature)}</span>
            <div className="shap-track" role="cell" aria-label={`${positive ? "+" : ""}${r.phi.toFixed(2)}`}>
              <span className="shap-axis" />
              <span
                className={`shap-bar ${positive ? "pos" : "neg"}`}
                style={positive ? { left: "50%", width: `${w}%` } : { right: "50%", width: `${w}%` }}
              />
            </div>
            <span className={`shap-value ${positive ? "pos" : r.phi < 0 ? "neg" : ""}`} role="cell" dir="ltr">
              {positive ? "+" : ""}
              {r.phi.toFixed(2)}
            </span>
          </div>
        );
      })}
      <p className="shap-footnote">
        {ar
          ? "القيم هي مساهمة كل عامل مقارنةً بمجموعة مرجعية (إسناد شابلي الدقيق). الأشرطة الأطول أكثر تأثيرًا."
          : "Values are contributions on the log-odds scale compared with a reference population (exact Shapley attribution). Longer bars matter more."}
      </p>
    </div>
  );
}
