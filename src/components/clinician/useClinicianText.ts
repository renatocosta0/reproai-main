"use client";

import { useMemo } from "react";
import { useLocale } from "@/components/i18n/LocaleContext";
import { CLINICIAN_STRINGS, shortDateL, timeAgoAr } from "@/lib/i18n-clinician";
import { timeAgo } from "@/lib/format";
import { shortDate } from "@/lib/observation-analysis";

/** Clinician-portal strings and date helpers for the current locale (English unless Arabic is chosen). */
export function useClinicianText() {
  const { locale, setLocale } = useLocale();
  return useMemo(() => {
    const ar = locale === "ar";
    return {
      locale,
      setLocale,
      ar,
      L: CLINICIAN_STRINGS[locale],
      ago: (d: string | Date) => (ar ? timeAgoAr(d) : timeAgo(d)),
      date: (d: string | Date) => (ar ? shortDateL("ar", d) : shortDate(d))
    };
  }, [locale, setLocale]);
}
