"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, PlayCircle } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { goToStep } from "@/components/tour/TourBar";
import { TOUR } from "@/lib/tour";

// Guided demo for judges and walkthroughs. Available only when demo login is enabled.
export default function TourPage() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [starting, setStarting] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/auth/demo")
      .then((r) => r.json())
      .then((d) => setEnabled(Boolean(d.enabled)))
      .catch(() => setEnabled(false));
  }, []);

  async function start(i: number) {
    setStarting(i);
    await goToStep(i);
  }

  return (
    <main className="tour-page">
      <header className="tour-header">
        <Logo />
        <Link href="/login" className="text-button"><ArrowLeft size={15} /> Sign in</Link>
      </header>
      <section className="tour-intro">
        <p className="date-label">GUIDED DEMO · CHALLENGE 02</p>
        <h1>See ReproAI in twelve steps</h1>
        <p>
          A scripted walk through the clinician and patient experience, with fictional demo personas. Each step says what to look
          at and which part of the Challenge 02 brief it answers. Synthetic data only; prototype, not clinically validated.
        </p>
        {enabled === false && <p className="form-error">The guided demo is not enabled on this deployment.</p>}
        {enabled && (
          <button className="primary" onClick={() => start(0)} disabled={starting !== null}>
            <PlayCircle size={17} /> {starting === 0 ? "Starting…" : "Start the guided demo"}
          </button>
        )}
      </section>
      <ol className="tour-list">
        {TOUR.map((s, i) => (
          <li key={i}>
            <span className="tour-num">{i + 1}</span>
            <div>
              <strong>{s.title}</strong>
              <p>{s.look}</p>
              <small>{s.serves} · as {s.persona.toLowerCase()}{s.locale === "ar" ? " · Arabic" : ""}</small>
            </div>
            {enabled && (
              <button className="secondary" onClick={() => start(i)} disabled={starting !== null}>
                {starting === i ? "Opening…" : "Open"}
              </button>
            )}
          </li>
        ))}
      </ol>
    </main>
  );
}
