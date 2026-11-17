"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, PlayCircle, X } from "lucide-react";
import { TOUR, TOUR_KEY, type TourStep } from "@/lib/tour";

/** Language the tour was started in; a step with locale "ar" always shows Arabic, others use this. */
const TOUR_LOCALE_KEY = "reproai.tourLocale";

function tourLocale(): "en" | "ar" {
  try {
    return window.sessionStorage.getItem(TOUR_LOCALE_KEY) === "ar" ? "ar" : "en";
  } catch {
    return "en";
  }
}

/** Remember the language the tour starts in (called from the tour page). */
export function setTourLocale(locale: "en" | "ar"): void {
  try {
    window.sessionStorage.setItem(TOUR_LOCALE_KEY, locale);
  } catch {
    /* ignore */
  }
}

const S = {
  en: { label: "Guided demo", count: (i: number, n: number) => `Guided demo · ${i}/${n}`, prev: "Previous step", opening: "Opening…", next: "Next", finish: "Finish", exit: "Exit the guided demo" },
  ar: { label: "الجولة الإرشادية", count: (i: number, n: number) => `الجولة الإرشادية · ${i}/${n}`, prev: "الخطوة السابقة", opening: "جارٍ الفتح…", next: "التالي", finish: "إنهاء", exit: "الخروج من الجولة الإرشادية" }
};

/** Read the current tour step from session storage (null when no tour is running). */
export function readTourStep(): number | null {
  try {
    const v = window.sessionStorage.getItem(TOUR_KEY);
    return v === null ? null : Number(v);
  } catch {
    return null;
  }
}

/** Sign in as the step's persona, set its language, and open its page. */
export async function goToStep(i: number): Promise<void> {
  const step: TourStep | undefined = TOUR[i];
  if (!step) return;
  try {
    window.sessionStorage.setItem(TOUR_KEY, String(i));
    window.localStorage.setItem("reproai.locale", step.locale ?? tourLocale());
  } catch {
    /* storage unavailable: the tour still navigates */
  }
  await fetch("/api/auth/demo", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ persona: step.persona })
  });
  window.location.assign(step.href);
}

export function exitTour(): void {
  try {
    window.localStorage.setItem("reproai.locale", tourLocale());
    window.sessionStorage.removeItem(TOUR_KEY);
  } catch {
    /* ignore */
  }
  window.location.assign("/tour");
}

/** Floating guide shown on every portal page while a tour is running. */
export function TourBar() {
  const [i, setI] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  // The bar speaks the language the tour was started in, even on the Arabic step.
  const [lang, setLang] = useState<"en" | "ar">("en");
  const ar = lang === "ar";
  const L = S[lang];

  useEffect(() => {
    setI(readTourStep());
    setLang(tourLocale());
  }, []);

  if (i === null || !TOUR[i]) return null;
  const step = TOUR[i];

  async function go(n: number) {
    setBusy(true);
    await goToStep(n);
  }

  return (
    <aside className="tour-bar" role="complementary" aria-label={L.label} dir={ar ? "rtl" : "ltr"}>
      <div className="tour-step">
        <span className="tour-count"><PlayCircle size={14} /> {L.count(i + 1, TOUR.length)}</span>
        <strong>{ar ? step.ar.title : step.title}</strong>
        <p>{ar ? step.ar.look : step.look}</p>
        <small>{ar ? step.ar.serves : step.serves}</small>
      </div>
      <div className="tour-actions">
        <button className="secondary" onClick={() => go(i - 1)} disabled={busy || i === 0} aria-label={L.prev}><ChevronLeft size={16} className="flip-rtl" /></button>
        {i < TOUR.length - 1 ? (
          <button className="primary compact" onClick={() => go(i + 1)} disabled={busy}>
            {busy ? L.opening : L.next} <ChevronRight size={16} className="flip-rtl" />
          </button>
        ) : (
          <button className="primary compact" onClick={exitTour}>{L.finish}</button>
        )}
        <button className="plain-icon" onClick={exitTour} aria-label={L.exit}><X size={16} /></button>
      </div>
    </aside>
  );
}
