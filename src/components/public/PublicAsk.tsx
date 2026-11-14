"use client";

// Public, guidance-only assistant page. Questions and answers live only in this
// page's memory: nothing is saved, and there is no account. Answers come from
// the cited guidance library through /api/public/ask.

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Languages, Send, ShieldCheck, Stethoscope } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { GroundedReply } from "@/components/assistant/GroundedReply";
import { useLocale } from "@/components/i18n/LocaleContext";
import type { GroundedAnswer } from "@/lib/rag/answer";

const STRINGS = {
  en: {
    home: "Home",
    lang: "العربية",
    eyebrow: "Guidance assistant",
    title: "Ask about reproductive health",
    lead: "General guidance from cited sources: the Daman Thiqa assisted-reproduction guideline, WHO, and how ReproAI works. Every sentence shows its source, and the assistant says so when its sources don't cover a question.",
    notYou: "This is general information, not advice about you. For your own situation, speak to a clinician.",
    nothingSaved: "Nothing you type is saved, and there's no account.",
    clinic: "ReproAI's personal record is available through participating clinics, by invitation.",
    arNote: "",
    placeholder: "For example: when should we see a doctor if we're trying to conceive?",
    ask: "Ask",
    asking: "Checking the sources…",
    you: "You",
    tryOne: "Try a question",
    suggestions: [
      "When should a couple see a doctor if they're trying to conceive?",
      "What AMH level counts as reduced ovarian reserve?",
      "Should my husband be tested too?",
      "Who is eligible for social egg freezing?"
    ],
    error: "The assistant could not answer just now. Please try again.",
    footer: "Prototype for the Abu Dhabi Future Health Digital Innovation Challenge (Challenge 02, Fertility). Not clinically validated and not a diagnostic device. In an emergency, call 998."
  },
  ar: {
    home: "الرئيسية",
    lang: "English",
    eyebrow: "مساعد الإرشادات",
    title: "اسأل عن الصحة الإنجابية",
    lead: "إرشادات عامة من مصادر موثّقة: دليل ضمان ثقة للمساعدة على الإنجاب، ومنظمة الصحة العالمية، وطريقة عمل ReproAI. تُظهر كل جملة مصدرها، ويصرّح المساعد عندما لا تغطي مصادره السؤال.",
    notYou: "هذه معلومات عامة وليست نصيحة خاصة بك. للحديث عن حالتك، تحدّث إلى طبيب.",
    nothingSaved: "لا يُحفظ أي شيء تكتبه، ولا يوجد حساب.",
    clinic: "يتوفر سجل ReproAI الشخصي عبر العيادات المشاركة، بدعوة منها.",
    arNote: "المصادر بالإنجليزية فقط، لذا قد لا يجيب المساعد عن الأسئلة المكتوبة بالعربية. جرّب طرح السؤال بالإنجليزية.",
    placeholder: "مثال: متى يجب أن نراجع الطبيب إذا كنا نحاول الإنجاب؟",
    ask: "اسأل",
    asking: "جارٍ التحقق من المصادر…",
    you: "أنت",
    tryOne: "جرّب سؤالاً",
    suggestions: [
      "When should a couple see a doctor if they're trying to conceive?",
      "What AMH level counts as reduced ovarian reserve?",
      "Should my husband be tested too?",
      "Who is eligible for social egg freezing?"
    ],
    error: "تعذّر على المساعد الإجابة الآن. يُرجى المحاولة مرة أخرى.",
    footer: "نموذج أولي لتحدي أبوظبي للابتكار الرقمي في الصحة المستقبلية (التحدي 02، الخصوبة). لم يُتحقق منه سريريًا وليس جهازًا تشخيصيًا. في حالات الطوارئ، اتصل بالرقم 998."
  }
} as const;

interface Turn {
  q: string;
  answer?: GroundedAnswer;
  error?: string;
}

export function PublicAsk() {
  const { locale, setLocale } = useLocale();
  const t = STRINGS[locale];
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);

  async function ask(q: string) {
    const text = q.trim();
    if (!text || busy) return;
    const previousQuestion = turns.length ? turns[turns.length - 1].q : undefined;
    setBusy(true);
    setQuestion("");
    setTurns((prev) => [...prev, { q: text }]);
    try {
      const res = await fetch("/api/public/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text, previousQuestion, locale })
      });
      const data = await res.json().catch(() => null);
      setTurns((prev) => {
        const next = [...prev];
        next[next.length - 1] = res.ok && data?.answer ? { q: text, answer: data.answer } : { q: text, error: data?.error ?? t.error };
        return next;
      });
    } catch {
      setTurns((prev) => {
        const next = [...prev];
        next[next.length - 1] = { q: text, error: t.error };
        return next;
      });
    } finally {
      setBusy(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void ask(question);
  }

  return (
    <div className="landing public-ask">
      <header className="landing-nav">
        <Link href="/" className="brand-home" aria-label="ReproAI home">
          <Logo />
        </Link>
        <div className="landing-nav-actions">
          <button type="button" className="secondary" onClick={() => setLocale(locale === "ar" ? "en" : "ar")} lang={locale === "ar" ? "en" : "ar"}>
            <Languages size={15} aria-hidden /> {t.lang}
          </button>
          <Link className="secondary" href="/">
            <ArrowLeft size={15} aria-hidden className="flip-rtl" /> {t.home}
          </Link>
        </div>
      </header>

      <main className="landing-section pa-body">
        <p className="eyebrow">{t.eyebrow}</p>
        <h1>{t.title}</h1>
        <p className="pa-lead">{t.lead}</p>

        <div className="pa-notice" role="note">
          <p><Stethoscope size={16} aria-hidden /> <strong>{t.notYou}</strong></p>
          <p><ShieldCheck size={16} aria-hidden /> {t.nothingSaved} {t.clinic}</p>
          {t.arNote && <p>{t.arNote}</p>}
        </div>

        {turns.length > 0 && (
          <ol className="pa-thread" aria-live="polite">
            {turns.map((turn, i) => (
              <li key={i}>
                <p className="pa-q"><span>{t.you}</span> <bdi>{turn.q}</bdi></p>
                {turn.answer ? (
                  <GroundedReply answer={turn.answer} audience="patient" locale={locale} />
                ) : turn.error ? (
                  <p className="pa-error" role="alert">{turn.error}</p>
                ) : (
                  <p className="pa-wait">{t.asking}</p>
                )}
              </li>
            ))}
          </ol>
        )}

        <form className="pa-form" onSubmit={submit}>
          <label htmlFor="public-question" className="sr-only">{t.title}</label>
          <textarea
            id="public-question"
            rows={2}
            maxLength={500}
            value={question}
            placeholder={t.placeholder}
            dir="auto"
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void ask(question);
              }
            }}
          />
          <button className="primary" disabled={busy || !question.trim()}>
            <Send size={15} aria-hidden className="flip-rtl" /> {busy ? t.asking : t.ask}
          </button>
        </form>

        {turns.length === 0 && (
          <div className="pa-suggest">
            <p>{t.tryOne}</p>
            <div lang="en" dir="ltr">
              {t.suggestions.map((s) => (
                <button key={s} type="button" className="secondary" onClick={() => void ask(s)} disabled={busy}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="landing-footer">
        <p>{t.footer}</p>
      </footer>
    </div>
  );
}
