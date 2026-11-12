"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Cpu, Send, ShieldCheck, Sparkles } from "lucide-react";
import { firstName, usePatient } from "@/components/patient/PatientContext";
import { api, ApiError } from "@/lib/api-client";
import { useLocale } from "@/components/i18n/LocaleContext";
import { GroundedReply } from "@/components/assistant/GroundedReply";
import type { GroundedAnswer } from "@/lib/rag/answer";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  answer?: GroundedAnswer;
  error?: boolean;
}

const PROVIDER_LABELS: Record<string, string> = {
  azure: "Azure OpenAI",
  groq: "Groq · High Performance"
};

const SUGGESTIONS: Record<string, string[]> = {
  female: ["What does my AMH result mean?", "Who can have social egg freezing under Thiqa?", "When should I see a specialist?"],
  male: ["Is my sperm concentration in the normal range?", "What lifestyle changes does WHO recommend?", "Why do both partners get tested?"],
  default: ["When should we see a specialist?", "Who can see my information?"]
};

export default function AssistantPage() {
  const { data } = usePatient();
  const { locale } = useLocale();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [unavailable, setUnavailable] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const name = firstName(data?.profile.name);
  const suggestions = SUGGESTIONS[data?.profile.sex ?? "default"] ?? SUGGESTIONS.default;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, sending]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || sending) return;
    const previousQuestion = [...messages].reverse().find((m) => m.role === "user")?.content;
    setMessages((m) => [...m, { role: "user", content: q }]);
    setText("");
    setSending(true);
    try {
      const res = await api<{ answer: GroundedAnswer; reply: string }>("/api/patient/ask", {
        method: "POST",
        body: JSON.stringify({ question: q, previousQuestion, locale })
      });
      setMessages((m) => [...m, { role: "assistant", content: res.reply, answer: res.answer }]);
    } catch (err) {
      console.error("[Ask ReproAI error]:", err);
      if (err instanceof ApiError && err.status === 503) {
        setUnavailable(err.message);
        setMessages((m) => m.slice(0, -1));
        setText(q);
      } else {
        const errorDetail = err instanceof ApiError && err.message
          ? err.message
          : (err instanceof Error ? err.message : "I couldn't answer that just now. Please try again in a moment.");
        setMessages((m) => [
          ...m,
          { role: "assistant", content: errorDetail, error: true }
        ]);
      }
    } finally {
      setSending(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void ask(text);
  }

  return (
    <div className="content patient-content assistant-page">
      <div className="page-heading">
        <div>
          <p className="date-label">CITED GUIDANCE</p>
          <h1>Ask ReproAI</h1>
          <span>Clear explanations for everyday questions, with your clinician always in the loop.</span>
        </div>
      </div>
      <section className="assistant-shell panel">
        <div className="assistant-head">
          <div className="assistant-orb">
            <Sparkles size={21} />
          </div>
          <span>
            <strong>ReproAI care assistant</strong>
            <small>
              <i /> Answers only from cited guidance and your released record
            </small>
          </span>
        </div>
        <div className="messages" aria-live="polite">
          <div className="message ai">
            <div className="mini-orb"><Sparkles size={13} /></div>
            <div>
              Hello{name ? ` ${name}` : ""}. I can explain your released results and the guidance behind them in plain
              language. I only answer from the Thiqa and WHO guidance in my library and from your record, and I show the
              source for every sentence. If something isn&apos;t covered, I&apos;ll say so rather than guess. I don&apos;t diagnose.
            </div>
          </div>
          {messages.map((m, i) =>
            m.role === "user" ? (
              <div className="message user" key={i}>
                <div>{m.content}</div>
              </div>
            ) : (
              <div className="message ai" key={i}>
                <div className="mini-orb"><Sparkles size={13} /></div>
                <div>
                  {m.answer ? <GroundedReply answer={m.answer} audience="patient" locale={locale} /> : <div className="reply-text">{m.content}</div>}
                  {m.answer?.provider && (
                    <span className="provider-tag">
                      <Cpu size={12} /> {PROVIDER_LABELS[m.answer.provider] ?? m.answer.provider}
                    </span>
                  )}
                </div>
              </div>
            )
          )}
          {sending && (
            <div className="message ai">
              <div className="mini-orb"><Sparkles size={13} /></div>
              <div className="typing" aria-label="ReproAI is thinking"><i /><i /><i /></div>
            </div>
          )}
          <div ref={endRef} />
        </div>
        {unavailable && (
          <div className="assistant-unavailable" role="alert">
            The assistant isn&apos;t available yet: your clinic hasn&apos;t enabled it. Your question has been kept so
            you can send it later.
          </div>
        )}
        {messages.length === 0 && (
          <div className="suggestions">
            {suggestions.map((s) => (
              <button key={s} type="button" onClick={() => void ask(s)} disabled={sending}>
                {s}
              </button>
            ))}
          </div>
        )}
        <form className="chat-input" onSubmit={submit}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ask a question about your journey…"
            aria-label="Your question"
            maxLength={2000}
          />
          <button disabled={sending || !text.trim()} aria-label="Send">
            <Send size={17} />
          </button>
        </form>
        <div className="assistant-disclaimer">
          <ShieldCheck size={13} /> Educational guidance only. ReproAI does not replace advice from your clinical team.
        </div>
      </section>
    </div>
  );
}
