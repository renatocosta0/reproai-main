"use client";

import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Cpu, FileText, Send, ShieldCheck, Sparkles } from "lucide-react";
import { GroundedReply } from "@/components/assistant/GroundedReply";
import type { GroundedAnswer } from "@/lib/rag/answer";
import { api, userMessage } from "@/lib/api-client";
import type { DirectoryResponse } from "@/types/clinician";

interface Msg {
  role: "user" | "assistant";
  content: string;
  provider?: string;
  answer?: GroundedAnswer;
  error?: boolean;
}

const PROVIDER: Record<string, string> = { azure: "Azure OpenAI", groq: "Groq", scripted: "Scripted summary · AI unavailable", extractive: "Extractive · AI unavailable", none: "No generation" };

const PROMPTS_CASE = [
  "Summarise this case for a 10-minute consultation.",
  "What is missing from the record, and how does it limit interpretation?",
  "Explain the triggered rules and their guideline sources.",
  "Draft a plain-language note to the patient about their latest results."
];
const PROMPTS_GENERAL = [
  "What does the Thiqa guideline say about social egg freezing eligibility?",
  "Summarise WHO 2025 advice on when to refer couples trying to conceive."
];

export default function CopilotPage() {
  return (
    <Suspense fallback={<div className="content"><div className="loading-block" style={{ margin: 0 }} /></div>}>
      <Copilot />
    </Suspense>
  );
}

function Copilot() {
  const params = useSearchParams();
  const [cases, setCases] = useState<{ id: string; name: string }[]>([]);
  const [caseId, setCaseId] = useState<string>(params.get("case") ?? "");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<DirectoryResponse>("/api/clinician/couples")
      .then((d) => setCases([...d.couples, ...d.individuals].map((c) => ({ id: c.id, name: c.displayName }))))
      .catch(() => setCases([]));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, sending]);

  async function ask(q: string) {
    const question = q.trim();
    if (!question || sending) return;
    const history = [...messages.filter((m) => !m.error), { role: "user" as const, content: question }];
    setMessages((m) => [...m, { role: "user", content: question }]);
    setText("");
    setSending(true);
    try {
      const res = await api<{ reply: string; provider: string; answer: GroundedAnswer }>("/api/clinician/copilot", {
        method: "POST",
        body: JSON.stringify({ caseId: caseId || undefined, messages: history.map(({ role, content }) => ({ role, content })) })
      });
      setMessages((m) => [...m, { role: "assistant", content: res.reply, provider: res.provider, answer: res.provider === "scripted" ? undefined : res.answer }]);
    } catch (err) {
      setMessages((m) => [...m, { role: "assistant", content: userMessage(err, "The copilot could not answer."), error: true }]);
    } finally {
      setSending(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void ask(text);
  }

  const caseName = cases.find((c) => c.id === caseId)?.name;

  return (
    <div className="content assistant-page">
      <div className="page-heading">
        <div>
          <p className="date-label">CLINICAL COPILOT</p>
          <h1>Explain a case, grounded in its record</h1>
          <span>Answers come only from the case record and the cited guidance library. Each sentence is checked against its source and flagged if it is not supported. Decisions stay with you.</span>
        </div>
        <label className="field copilot-case">
          <span>Case</span>
          <div className="input-wrap">
            <select value={caseId} onChange={(e) => { setCaseId(e.target.value); setMessages([]); }}>
              <option value="">No case (general questions)</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </label>
      </div>

      <section className="assistant-shell panel">
        <div className="assistant-head">
          <div className="assistant-orb"><Sparkles size={21} /></div>
          <span>
            <strong>ReproAI clinical copilot</strong>
            <small><i /> {caseName ? `Using the record of ${caseName}` : "No case selected"} · cited guidance library</small>
          </span>
        </div>
        <div className="messages" aria-live="polite">
          {messages.length === 0 && (
            <div className="message ai">
              <div className="mini-orb"><Sparkles size={13} /></div>
              <div>
                {caseName
                  ? `I can summarise ${caseName}'s record, explain the triggered rules and their sources, point out missing data, or draft a plain-language note. I will not calculate new numbers.`
                  : "Select a case to discuss a patient's record, or ask a general guideline question."}
              </div>
            </div>
          )}
          {messages.map((m, i) =>
            m.role === "user" ? (
              <div className="message user" key={i}><div>{m.content}</div></div>
            ) : (
              <div className="message ai" key={i}>
                <div className="mini-orb"><Sparkles size={13} /></div>
                <div>
                  {caseName && !m.error && <div className="tool-badges"><span className="tool-badge"><FileText size={12} /> Case record</span></div>}
                  {m.answer ? <GroundedReply answer={m.answer} audience="clinician" /> : <div className="reply-text">{m.content}</div>}
                  {m.provider && <span className="provider-tag"><Cpu size={12} /> {PROVIDER[m.provider] ?? m.provider}</span>}
                </div>
              </div>
            )
          )}
          {sending && (
            <div className="message ai">
              <div className="mini-orb"><Sparkles size={13} /></div>
              <div className="typing" aria-label="Copilot is thinking"><i /><i /><i /></div>
            </div>
          )}
          <div ref={endRef} />
        </div>
        {messages.length === 0 && (
          <div className="suggestions">
            {(caseName ? PROMPTS_CASE : PROMPTS_GENERAL).map((p) => (
              <button key={p} type="button" onClick={() => void ask(p)} disabled={sending}>{p}</button>
            ))}
          </div>
        )}
        <form className="chat-input" onSubmit={submit}>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask about this case or a guideline…" aria-label="Your question" maxLength={2000} />
          <button disabled={sending || !text.trim()} aria-label="Send"><Send size={17} /></button>
        </form>
        <div className="assistant-disclaimer">
          <ShieldCheck size={13} /> Decision support for licensed clinicians. Prototype; not clinically validated. Every query is audit-logged.
        </div>
      </section>
    </div>
  );
}
