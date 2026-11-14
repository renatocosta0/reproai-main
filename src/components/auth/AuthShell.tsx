"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { FileHeart, Languages, LineChart, ShieldCheck, Sparkles, UserRoundCheck } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { useLocale } from "@/components/i18n/LocaleContext";

const S = {
  en: {
    eyebrow: "Fertility intelligence, made human",
    title: "Better decisions for every step of the journey.",
    lead: "An evidence-led view of reproductive potential over time, for individuals and couples, prescribed and supported by your care team.",
    p1: "Change over time, not a single score",
    p1s: "Trends with their uncertainty, and plain-language factors",
    p2: "Individual first, couple ready",
    p2s: "Pair with a partner when you choose, and revoke it at any time",
    p3: "Connected to your clinic",
    p3s: "FHIR R4 records designed for Malaffi and TAMM exchange",
    footer: "Grounded in Daman Thiqa and WHO guidance",
    meta: "Abu Dhabi Digital Health Innovation · Challenge 02",
    lang: "العربية",
    home: "ReproAI home"
  },
  ar: {
    eyebrow: "ذكاء الخصوبة بلمسة إنسانية",
    title: "قرارات أفضل في كل مرحلة من الرحلة.",
    lead: "رؤية مبنية على الأدلة للإمكانات الإنجابية عبر الزمن، للأفراد والأزواج، يصفها فريق رعايتك ويدعمها.",
    p1: "تغيّر عبر الزمن، لا درجة واحدة",
    p1s: "اتجاهات مع مدى عدم اليقين، وعوامل بلغة واضحة",
    p2: "الفرد أولًا، وجاهز للزوجين",
    p2s: "ارتبط بشريكك متى شئت، وألغِ الارتباط في أي وقت",
    p3: "متصل بعيادتك",
    p3s: "سجلات بصيغة FHIR R4 مصمّمة للتبادل مع ملفي وتم",
    footer: "يستند إلى إرشادات ضمان ثقة ومنظمة الصحة العالمية",
    meta: "الابتكار الرقمي في الصحة بأبوظبي · التحدي 02",
    lang: "English",
    home: "الصفحة الرئيسية لـ ReproAI"
  }
};

// Split-screen shell shared by the login, register and pairing pages. The story
// panel states what the product does; it contains no testimonials or user counts.
export function AuthShell({ children }: { children: ReactNode }) {
  const { locale, setLocale } = useLocale();
  const t = S[locale];
  return (
    <main className="login-page">
      <section className="login-story">
        <Link href="/" className="brand-home" aria-label={t.home}>
          <Logo />
        </Link>
        <div className="story-copy">
          <div className="eyebrow light">
            <Sparkles size={14} aria-hidden /> {t.eyebrow}
          </div>
          <h1>{t.title}</h1>
          <p>{t.lead}</p>
          <div className="story-pillars">
            <div>
              <span>
                <LineChart size={16} aria-hidden />
              </span>
              <div>
                <strong>{t.p1}</strong>
                <small>{t.p1s}</small>
              </div>
            </div>
            <div>
              <span>
                <UserRoundCheck size={16} aria-hidden />
              </span>
              <div>
                <strong>{t.p2}</strong>
                <small>{t.p2s}</small>
              </div>
            </div>
            <div>
              <span>
                <FileHeart size={16} aria-hidden />
              </span>
              <div>
                <strong>{t.p3}</strong>
                <small>{t.p3s}</small>
              </div>
            </div>
          </div>
        </div>
        <div className="story-footer">
          <ShieldCheck size={16} aria-hidden /> {t.footer}
        </div>
      </section>

      <section className="login-panel">
        <div className="login-mobile-logo">
          <Link href="/" className="brand-home" aria-label={t.home}>
            <Logo />
          </Link>
        </div>
        <button
          type="button"
          className="secondary login-lang"
          onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
          lang={locale === "ar" ? "en" : "ar"}
        >
          <Languages size={15} aria-hidden /> {t.lang}
        </button>
        {children}
        <div className="login-meta">{t.meta}</div>
      </section>
    </main>
  );
}
