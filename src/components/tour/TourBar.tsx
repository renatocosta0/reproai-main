"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, PlayCircle, X } from "lucide-react";
import { TOUR, TOUR_KEY, type TourStep } from "@/lib/tour";

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
    window.localStorage.setItem("reproai.locale", step.locale ?? "en");
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
    window.sessionStorage.removeItem(TOUR_KEY);
    window.localStorage.setItem("reproai.locale", "en");
  } catch {
    /* ignore */
  }
  window.location.assign("/tour");
}

/** Floating guide shown on every portal page while a tour is running. */
export function TourBar() {
  const [i, setI] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setI(readTourStep());
  }, []);

  if (i === null || !TOUR[i]) return null;
  const step = TOUR[i];

  async function go(n: number) {
    setBusy(true);
    await goToStep(n);
  }

  return (
    <aside className="tour-bar" role="complementary" aria-label="Guided demo" dir="ltr">
      <div className="tour-step">
        <span className="tour-count"><PlayCircle size={14} /> Guided demo · {i + 1}/{TOUR.length}</span>
        <strong>{step.title}</strong>
        <p>{step.look}</p>
        <small>{step.serves}</small>
      </div>
      <div className="tour-actions">
        <button className="secondary" onClick={() => go(i - 1)} disabled={busy || i === 0} aria-label="Previous step"><ChevronLeft size={16} /></button>
        {i < TOUR.length - 1 ? (
          <button className="primary compact" onClick={() => go(i + 1)} disabled={busy}>
            {busy ? "Opening…" : "Next"} <ChevronRight size={16} />
          </button>
        ) : (
          <button className="primary compact" onClick={exitTour}>Finish</button>
        )}
        <button className="plain-icon" onClick={exitTour} aria-label="Exit the guided demo"><X size={16} /></button>
      </div>
    </aside>
  );
}
