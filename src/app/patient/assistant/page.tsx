"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { BookOpen, Cpu, Send, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { firstName, usePatient } from "@/components/patient/PatientContext";
import { api, ApiError } from "@/lib/api-client";
import type { AgentResponse } from "@/types/patient";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  toolsUsed?: string[];
  provider?: AgentResponse["provider"];
  error?: boolean;
}

const TOOL_LABELS: Record<string, { label: string; icon: "zap" | "book" }> = {
  predict_fertility_success: { label: "Ran the assessment model", icon: "zap" },
  search_guidelines: { label: "Checked WHO / ESHRE guidance", icon: "book" }
};

const PROVIDER_LABELS: Record<string, string> = {
  azure: "Azure OpenAI",
  groq: "Groq · High Performance"
};

const SUGGESTIONS: Record<string, string[]> = {
  female: ["What does a temperature rise after ovulation mean?", "How does AMH relate to egg freezing?", "Can PCOS affect my chances?"],
  male: ["What is a normal sperm concentration?", "How can lifestyle improve sperm quality?", "When should I consider sperm banking?"],
  default: ["How does sleep affect fertility?", "What is fertility preservation?"]
};

export default function AssistantPage() {
  const { data } = usePatient();
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
    const history: ChatMessage[] = [...messages.filter((m) => !m.error), { role: "user", content: q }];
    setMessages((m) => [...m, { role: "user", content: q }]);
    setText("");
    setSending(true);
    try {
      const res = await api<AgentResponse>("/api/agent", {
        method: "POST",
        body: JSON.stringify({ messages: history.map(({ role, content }) => ({ role, content })) })
      });
      setMessages((m) => [...m, { role: "assistant", content: res.reply, toolsUsed: res.toolsUsed, provider: res.provider }]);
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
          <p className="date-label">WHO-GROUNDED GUIDANCE</p>
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
              <i /> Grounded in WHO and ESHRE guidance
            </small>
          </span>
        </div>
        <div className="messages" aria-live="polite">
          <div className="message ai">
            <div className="mini-orb"><Sparkles size={13} /></div>
            <div>
              Hello{name ? ` ${name}` : ""}. I can explain your results, your health signals and the guidance behind
              them in plain language. I don&apos;t diagnose, and I&apos;ll point you to your care team when something
              needs their judgement. What would you like to know?
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
                  {m.toolsUsed && m.toolsUsed.length > 0 && (
                    <div className="tool-badges">
                      {m.toolsUsed.map((t) => {
                        const meta = TOOL_LABELS[t];
                        return (
                          <span className="tool-badge" key={t}>
                            {meta?.icon === "book" ? <BookOpen size={12} /> : <Zap size={12} />}
                            {meta?.label ?? `Used tool: ${t}`}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  <div className="reply-text">{m.content}</div>
                  {m.provider && (
                    <span className="provider-tag">
                      <Cpu size={12} /> {PROVIDER_LABELS[m.provider] ?? m.provider}
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
