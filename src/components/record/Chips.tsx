"use client";

import { BadgeCheck, FlaskConical, Info, PenLine, Smartphone } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleContext";
import { SOURCE_LABELS, type LabSource } from "@/lib/labs";

/** Where a value came from: clinician verified, self-reported, imported or undocumented. */
const SOURCE_AR: Record<string, string> = {
  CLINICIAN_VERIFIED: "تحقّق منه الطبيب",
  IMPORTED: "سجل مستورد",
  SELF_REPORTED: "أدخلته بنفسك",
  PROFILE: "مسجّل سابقًا (المصدر غير موثّق)"
};

export function SourceChip({ source }: { source: string }) {
  const { locale } = useLocale();
  const s = source as LabSource;
  const Icon = s === "CLINICIAN_VERIFIED" ? BadgeCheck : s === "SELF_REPORTED" ? PenLine : s === "IMPORTED" ? Smartphone : Info;
  return (
    <span className={`chip src-${s.toLowerCase()}`}>
      <Icon size={12} aria-hidden /> {locale === "ar" ? SOURCE_AR[s] ?? source : SOURCE_LABELS[s] ?? source}
    </span>
  );
}

/** Evidence status of the model output, always shown with a result. */
export function EvidenceChip({ text }: { text?: string | null }) {
  return (
    <span className="chip evidence" title={text ?? undefined}>
      <FlaskConical size={12} aria-hidden /> {text ? "Prototype · not clinically validated" : "Prototype"}
    </span>
  );
}

/** Data completeness meter (0–1). */
export function Completeness({ value, missing }: { value: number | null; missing?: string[] }) {
  const { t } = useLocale();
  if (value === null) return null;
  const pct = Math.round(value * 100);
  return (
    <div className="completeness" title={missing?.length ? `Missing: ${missing.join(", ")}` : undefined}>
      <div className="completeness-head">
        <span>{t("completeness")}</span>
        <strong>{pct}%</strong>
      </div>
      <div className="completeness-bar">
        <i style={{ width: `${pct}%` }} />
      </div>
      {missing && missing.length > 0 && (
        <small>
          {t("notYetAvailable")}: {missing.join(", ")}. {t("widerRange")}
        </small>
      )}
    </div>
  );
}
