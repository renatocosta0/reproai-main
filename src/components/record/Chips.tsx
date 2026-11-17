"use client";

import { BadgeCheck, Building2, FlaskConical, Info, PenLine, Smartphone } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleContext";
import { SOURCE_LABELS, type LabSource } from "@/lib/labs";

/** Where a value came from: clinician verified, self-reported, imported or undocumented. */
const SOURCE_AR: Record<string, string> = {
  CLINICIAN_VERIFIED: "تحقّق منه الطبيب",
  EHR_MALAFFI: "موثّق من ملفي (HIE)",
  IMPORTED: "سجل مستورد",
  SELF_REPORTED: "أدخلته بنفسك",
  PROFILE: "مسجّل سابقًا (المصدر غير موثّق)"
};
// Clinician wording where the patient wording addresses the patient ("you entered it").
const SOURCE_AR_CLINICIAN: Record<string, string> = { ...SOURCE_AR, SELF_REPORTED: "أدخله المريض" };

export function SourceChip({ source, audience = "patient" }: { source: string; audience?: "patient" | "clinician" }) {
  const { locale } = useLocale();
  const arLabels = audience === "clinician" ? SOURCE_AR_CLINICIAN : SOURCE_AR;
  const s = source as LabSource;
  const Icon = s === "EHR_MALAFFI" ? Building2 : s === "CLINICIAN_VERIFIED" ? BadgeCheck : s === "SELF_REPORTED" ? PenLine : s === "IMPORTED" ? Smartphone : Info;
  return (
    <span className={`chip src-${s.toLowerCase()}`}>
      <Icon size={12} aria-hidden /> {locale === "ar" ? arLabels[s] ?? source : SOURCE_LABELS[s] ?? source}
    </span>
  );
}

/** Evidence status of the model output, always shown with a result. */
export function EvidenceChip({ text }: { text?: string | null }) {
  const { locale } = useLocale();
  const ar = locale === "ar";
  return (
    <span className="chip evidence" title={text ?? undefined}>
      <FlaskConical size={12} aria-hidden />{" "}
      {text ? (ar ? "نموذج أولي · غير مُتحقَّق منه سريريًا" : "Prototype · not clinically validated") : ar ? "نموذج أولي" : "Prototype"}
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
