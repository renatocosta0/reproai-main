"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Send, Sparkles, X } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { useLocale } from "@/components/i18n/LocaleContext";
import { GroundedReply } from "@/components/assistant/GroundedReply";
import type { GroundedAnswer } from "@/lib/rag/answer";

/**
 * "Ask" chips next to a result open this side panel with questions about that result.
 * Answers come only from /api/patient/ask, i.e. src/lib/rag/answer.ts: retrieval first,
 * a cited passage for every sentence, abstention when nothing relevant is found.
 * Nothing here writes or explains on its own.
 */

export interface AskTopic {
  /** Shown as the panel title, e.g. "AMH (anti-Müllerian hormone)". */
  title: string;
  /** Suggested questions for this result (English: the guidance library is English). */
  questions: string[];
  /** Active data/card context sent to /api/patient/ask so generic questions ("Explain this") resolve to it. */
  context?: string;
  /** Automatically asks an initial explanation as soon as the panel opens. */
  autoExplain?: boolean | string;
}

interface Turn {
  question: string;
  answer?: GroundedAnswer;
  error?: string;
}

const T = {
  en: {
    ask: "Ask",
    askAbout: "Ask about",
    sub: "Answers come only from cited guidance and your released record.",
    placeholder: "Ask your own question…",
    send: "Send",
    thinking: "Finding the guidance…",
    failed: "The assistant couldn't answer just now. Please try again in a moment.",
    unavailable: "The assistant isn't available yet: your clinic hasn't enabled it.",
    more: "Continue in Ask ReproAI",
    close: "Close",
    note: "Educational guidance only. Your clinician makes clinical decisions with you."
  },
  ar: {
    ask: "اسأل",
    askAbout: "اسأل عن",
    sub: "الإجابات من الإرشادات الموثّقة ومن سجلك المعتمد فقط.",
    placeholder: "اطرح سؤالك…",
    send: "إرسال",
    thinking: "جارٍ البحث في الإرشادات…",
    failed: "تعذّر على المساعد الإجابة الآن. يُرجى المحاولة بعد قليل.",
    unavailable: "المساعد غير متاح بعد لأن عيادتك لم تفعّله.",
    more: "المتابعة في «اسأل ReproAI»",
    close: "إغلاق",
    note: "إرشادات تثقيفية فقط. يتخذ طبيبك القرارات السريرية معك."
  }
};

const AskContext = createContext<((topic: AskTopic) => void) | null>(null);

export function useAsk() {
  return useContext(AskContext);
}

export function AskProvider({ children }: { children: ReactNode }) {
  const { locale } = useLocale();
  const L = T[locale];
  const [topic, setTopic] = useState<AskTopic | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const panelRef = useRef<HTMLElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  const runAsk = useCallback(async (question: string, activeTopic: AskTopic | null, reset = false) => {
    const q = question.trim();
    if (!q || (!reset && busy)) return;
    const previousQuestion = reset ? undefined : turns[turns.length - 1]?.question;
    const activeConvId = reset ? null : conversationId;
    setTurns((t) => (reset ? [{ question: q }] : [...t, { question: q }]));
    setText("");
    setBusy(true);
    try {
      const res = await api<{ answer: GroundedAnswer; conversationId: string | null }>("/api/patient/ask", {
        method: "POST",
        body: JSON.stringify({
          question: q,
          previousQuestion,
          context: activeTopic?.context ?? activeTopic?.title,
          locale,
          conversationId: activeConvId
        })
      });
      if (res.conversationId) setConversationId(res.conversationId);
      setTurns((t) => t.map((x, i) => (i === t.length - 1 ? { ...x, answer: res.answer } : x)));
    } catch (err) {
      const error = err instanceof ApiError && err.status === 503 ? L.unavailable : L.failed;
      setTurns((t) => t.map((x, i) => (i === t.length - 1 ? { ...x, error } : x)));
    } finally {
      setBusy(false);
    }
  }, [busy, turns, conversationId, locale, L.unavailable, L.failed]);

  const open = useCallback((t: AskTopic) => {
    opener.current = document.activeElement as HTMLElement | null;
    setTopic(t);
    setTurns([]);
    setText("");
    setConversationId(null);
    if (t.autoExplain) {
      const initialQ = typeof t.autoExplain === "string" ? t.autoExplain : t.questions[0];
      if (initialQ) void runAsk(initialQ, t, true);
    }
  }, [runAsk]);

  const close = useCallback(() => {
    setTopic(null);
    opener.current?.focus();
  }, []);

  useEffect(() => {
    if (!topic) return;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [topic, close]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [turns, busy]);

  function ask(question: string) {
    return runAsk(question, topic, false);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void ask(text);
  }

  const asked = new Set(turns.map((t) => t.question));

  return (
    <AskContext.Provider value={open}>
      {children}
      {topic && (
        <>
          <div className="ask-scrim" onClick={close} aria-hidden />
          <aside ref={panelRef} className="ask-panel" role="dialog" aria-modal="true" aria-label={`${L.askAbout} ${topic.title}`} tabIndex={-1}>
            <header>
              <div>
                <span className="ask-eyebrow">
                  <Sparkles size={13} aria-hidden /> {L.askAbout}
                </span>
                <h2>{topic.title}</h2>
                <p>{L.sub}</p>
              </div>
              <button type="button" className="ghost compact" onClick={close} aria-label={L.close}>
                <X size={17} />
              </button>
            </header>

            <div className="ask-body">
              {turns.map((t, i) => (
                <div key={i} className="ask-turn">
                  <p className="ask-question" dir="auto">{t.question}</p>
                  {t.answer ? (
                    <GroundedReply answer={t.answer} audience="patient" locale={locale} />
                  ) : t.error ? (
                    <p className="ask-error">{t.error}</p>
                  ) : (
                    <p className="ask-thinking">
                      <Loader2 size={14} className="spin" aria-hidden /> {L.thinking}
                    </p>
                  )}
                </div>
              ))}

              <div className="ask-suggestions">
                {topic.questions
                  .filter((q) => !asked.has(q))
                  .map((q) => (
                    <button key={q} type="button" onClick={() => void ask(q)} disabled={busy} dir="ltr">
                      {q}
                    </button>
                  ))}
              </div>
              <div ref={endRef} />
            </div>

            <form className="ask-form" onSubmit={submit}>
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder={L.placeholder} aria-label={L.placeholder} maxLength={500} />
              <button type="submit" className="primary compact" disabled={busy || !text.trim()} aria-label={L.send}>
                <Send size={15} />
              </button>
            </form>
            <footer>
              <small>{L.note}</small>
              <Link href="/patient/assistant" onClick={close}>
                {L.more} <ArrowRight size={13} className="flip-rtl" />
              </Link>
            </footer>
          </aside>
        </>
      )}
    </AskContext.Provider>
  );
}

/** Small "Ask" chip that opens the panel for one result. Renders nothing outside AskProvider. */
export function AskChip({ topic, className = "" }: { topic: AskTopic; className?: string }) {
  const open = useAsk();
  const { locale } = useLocale();
  if (!open) return null;
  return (
    <button type="button" className={`ask-chip ${className}`} onClick={() => open(topic)} aria-label={`${T[locale].askAbout} ${topic.title}`}>
      <Sparkles size={12} aria-hidden /> {T[locale].ask}
    </button>
  );
}
