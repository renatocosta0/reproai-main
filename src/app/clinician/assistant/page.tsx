"use client";

import { FormEvent, useRef, useState } from "react";
import {
  BookOpen,
  BrainCircuit,
  Cpu,
  FlaskConical,
  Send,
  ShieldCheck,
  Stethoscope,
  Zap
} from "lucide-react";
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
  predict_fertility_success: { label: "Ran predictive simulation (CDSS)", icon: "zap" },
  search_guidelines: { label: "Grounded in ESHRE / WHO 6th Ed.", icon: "book" }
};

const PROVIDER_LABELS: Record<string, string> = {
  azure: "Azure OpenAI GPT-4o",
  groq: "Groq · Llama 3.3 70B"
};

const CLINICAL_SUGGESTIONS = [
  "Search ESHRE 2020 guidelines for mild stimulation protocols in POSEIDON Group 3 patients.",
  "Female age 32, AMH 0.8 ng/mL, partner sperm count 12 M/mL — compare 3 cycles of IUI vs immediate IVF-ICSI.",
  "What are the POSEIDON criteria classification thresholds for AFC and AMH?",
  "When is elective oocyte vitrification recommended for a 34-year-old with AMH 1.2 ng/mL?",
  "Explain the WHO 6th Edition reference values for sperm concentration, motility, and morphology."
];

export default function ClinicianAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [unavailable, setUnavailable] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || sending) return;
    const history: ChatMessage[] = [...messages.filter((m) => !m.error), { role: "user", content: q }];
    setMessages((m) => [...m, { role: "user", content: q }]);
    setText("");
    setSending(true);
    setUnavailable("");
    try {
      const res = await api<AgentResponse>("/api/agent", {
        method: "POST",
        body: JSON.stringify({
          messages: history.map(({ role, content }) => ({ role, content }))
        })
      });
      setMessages((m) => [
        ...m,
        { role: "assistant", content: res.reply, toolsUsed: res.toolsUsed, provider: res.provider }
      ]);
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        setUnavailable(err.message);
        setMessages((m) => m.slice(0, -1));
        setText(q);
      } else {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: "Unable to retrieve a response at this time. Please try again shortly.",
            error: true
          }
        ]);
      }
    } finally {
      setSending(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 80);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void ask(text);
  }

  return (
    <div className="content assistant-page">
      <div className="page-heading">
        <div>
          <p className="date-label">CLINICAL DECISION SUPPORT · EVIDENCE-BASED</p>
          <h1>Clinical AI Copilot</h1>
          <span>
            Guideline retrieval, protocol comparison, and predictive simulation for licensed specialists.
          </span>
        </div>
      </div>

      <section className="assistant-shell panel">
        <div className="assistant-head">
          <div className="assistant-orb" style={{ background: "var(--teal, #0c655e)" }}>
            <BrainCircuit size={21} />
          </div>
          <span>
            <strong>ReproAI Clinical Copilot</strong>
            <small>
              <Stethoscope size={12} /> Grounded in ESHRE 2020 · WHO 6th Ed. · POSEIDON criteria
            </small>
          </span>
        </div>

        <div className="messages" aria-live="polite">
          {/* Welcome message */}
          <div className="message ai">
            <div className="mini-orb">
              <BrainCircuit size={13} />
            </div>
            <div>
              <div className="reply-text">
                Welcome. I&apos;m your clinical decision support assistant, grounded in ESHRE 2020, WHO 6th
                Edition Semen Analysis Manual, and POSEIDON criteria. I can retrieve guideline excerpts, run
                predictive simulations with Shapley attribution, and compare treatment pathways for specific
                patient profiles. What would you like to explore?
              </div>
            </div>
          </div>

          {messages.map((m, i) =>
            m.role === "user" ? (
              <div className="message user" key={i}>
                <div>{m.content}</div>
              </div>
            ) : (
              <div className="message ai" key={i}>
                <div className="mini-orb">
                  <BrainCircuit size={13} />
                </div>
                <div>
                  {m.toolsUsed && m.toolsUsed.length > 0 && (
                    <div className="tool-badges">
                      {m.toolsUsed.map((t) => {
                        const meta = TOOL_LABELS[t];
                        return (
                          <span className="tool-badge" key={t}>
                            {meta?.icon === "book" ? <BookOpen size={12} /> : <Zap size={12} />}
                            {meta?.label ?? `Tool: ${t}`}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  <div className="reply-text" style={{ opacity: m.error ? 0.6 : 1 }}>
                    {m.content}
                  </div>
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
              <div className="mini-orb">
                <BrainCircuit size={13} />
              </div>
              <div className="typing" aria-label="Retrieving clinical evidence">
                <i /><i /><i />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {unavailable && (
          <div className="assistant-unavailable" role="alert">
            <FlaskConical size={15} /> The agent is not configured yet. Add Azure OpenAI or Groq credentials
            to enable autonomous clinical decision support. Your query has been preserved.
          </div>
        )}

        {messages.length === 0 && (
          <div className="suggestions">
            {CLINICAL_SUGGESTIONS.map((s) => (
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
            placeholder="Ask about guidelines, patient protocols, or run a predictive simulation…"
            aria-label="Clinical query"
            maxLength={3000}
          />
          <button disabled={sending || !text.trim()} aria-label="Send">
            <Send size={17} />
          </button>
        </form>

        <div className="assistant-disclaimer">
          <ShieldCheck size={13} /> For licensed clinicians only. Outputs are decision-support references,
          not autonomous medical orders. Final clinical judgement remains with the treating specialist.
        </div>
      </section>
    </div>
  );
}

