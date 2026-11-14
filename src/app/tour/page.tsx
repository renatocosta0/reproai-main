"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Languages, PlayCircle } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { goToStep, setTourLocale } from "@/components/tour/TourBar";
import { LocaleProvider, useLocale } from "@/components/i18n/LocaleContext";
import { TOUR } from "@/lib/tour";


const S = {
  en: {
    signIn: "Sign in",
    lang: "العربية",
    eyebrow: "GUIDED DEMO · CHALLENGE 02",
    title: "See ReproAI in twelve steps",
    lead: "A scripted walk through the clinician and patient experience, with fictional demo personas. Each step says what to look at and which part of the Challenge 02 brief it answers. Synthetic data only; prototype, not clinically validated.",
    disabled: "The guided demo is not enabled on this deployment.",
    starting: "Starting…",
    start: "Start the guided demo",
    persona: { CLINICIAN: "clinician", FEMALE: "female patient", MALE: "male patient", COUPLE: "couple" } as Record<string, string>,
    as: (p: string) => `as ${p}`,
    arabic: "Arabic",
    opening: "Opening…",
    open: "Open"
  },
  ar: {
    signIn: "تسجيل الدخول",
    lang: "English",
    eyebrow: "جولة إرشادية · التحدي 02",
    title: "تعرّف على ReproAI في اثنتي عشرة خطوة",
    lead: "جولة معدّة مسبقًا في تجربة الطبيب والمريض، بشخصيات تجريبية خيالية. تذكر كل خطوة ما يجب النظر إليه وأي جزء من متطلبات التحدي 02 تجيب عنه. بيانات اصطناعية فقط؛ نموذج أولي لم يُتحقق منه سريريًا.",
    disabled: "الجولة الإرشادية غير مفعّلة في هذا النشر.",
    starting: "جارٍ البدء…",
    start: "ابدأ الجولة الإرشادية",
    persona: { CLINICIAN: "طبيب", FEMALE: "مريضة", MALE: "مريض", COUPLE: "زوجان" } as Record<string, string>,
    as: (p: string) => `بصفة ${p}`,
    arabic: "بالعربية",
    opening: "جارٍ الفتح…",
    open: "فتح"
  }
};

// Guided demo for judges and walkthroughs. Available only when demo login is enabled.
export default function TourPage() {
  return (
    <LocaleProvider>
      <TourContent />
    </LocaleProvider>
  );
}

function TourContent() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [starting, setStarting] = useState<number | null>(null);
  const { locale, setLocale } = useLocale();
  const ar = locale === "ar";
  const L = S[locale];

  useEffect(() => {
    fetch("/api/auth/demo")
      .then((r) => r.json())
      .then((d) => setEnabled(Boolean(d.enabled)))
      .catch(() => setEnabled(false));
  }, []);

  async function start(i: number) {
    setStarting(i);
    setTourLocale(locale);
    await goToStep(i);
  }

  return (
    <main className="tour-page">
      <header className="tour-header">
        <Logo />
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button type="button" className="secondary" onClick={() => setLocale(ar ? "en" : "ar")} lang={ar ? "en" : "ar"}>
            <Languages size={15} aria-hidden /> {L.lang}
          </button>
          <Link href="/login" className="text-button"><ArrowLeft size={15} className="flip-rtl" /> {L.signIn}</Link>
        </div>
      </header>
      <section className="tour-intro">
        <p className="date-label">{L.eyebrow}</p>
        <h1>{L.title}</h1>
        <p>{L.lead}</p>
        {enabled === false && <p className="form-error">{L.disabled}</p>}
        {enabled && (
          <button className="primary" onClick={() => start(0)} disabled={starting !== null}>
            <PlayCircle size={17} /> {starting === 0 ? L.starting : L.start}
          </button>
        )}
      </section>
      <ol className="tour-list">
        {TOUR.map((s, i) => (
          <li key={i}>
            <span className="tour-num">{i + 1}</span>
            <div>
              <strong>{ar ? s.ar.title : s.title}</strong>
              <p>{ar ? s.ar.look : s.look}</p>
              <small>{ar ? s.ar.serves : s.serves} · {L.as(L.persona[s.persona] ?? s.persona)}{s.locale === "ar" ? ` · ${L.arabic}` : ""}</small>
            </div>
            {enabled && (
              <button className="secondary" onClick={() => start(i)} disabled={starting !== null}>
                {starting === i ? L.opening : L.open}
              </button>
            )}
          </li>
        ))}
      </ol>
    </main>
  );
}
