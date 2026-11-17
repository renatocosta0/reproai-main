"use client";

import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Cpu, FileText, Send, ShieldCheck, Sparkles, Workflow, X } from "lucide-react";
import { GroundedReply } from "@/components/assistant/GroundedReply";
import { ChatHistory, ChatHistoryActions, historyText, useConversations, useHistoryPanel, type ConversationDetail } from "@/components/assistant/ChatHistory";
import type { GroundedAnswer } from "@/lib/rag/answer";
import type { AgentProposal } from "@/lib/agent-action";
import { storeDraftNote } from "@/lib/draft-note";
import { api, userMessage } from "@/lib/api-client";
import type { DirectoryResponse } from "@/types/clinician";
import { useClinicianText } from "@/components/clinician/useClinicianText";

interface Msg {
  role: "user" | "assistant";
  content: string;
  provider?: string;
  answer?: GroundedAnswer;
  error?: boolean;
}

// Suggested questions stay in English in both languages: the guidance corpus is English-only.
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
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState(false);
  // Governed agent action: propose → clinician approves/dismisses → audited.
  const [proposal, setProposal] = useState<AgentProposal | null>(null);
  const [proposalState, setProposalState] = useState<"idle" | "loading" | "ready" | "approved" | "dismissed" | "none" | "error">("idle");
  const history = useConversations("/api/clinician/conversations");
  const panel = useHistoryPanel();
  const endRef = useRef<HTMLDivElement>(null);
  const { L, ar, locale } = useClinicianText();

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
    const turns = [...messages.filter((m) => !m.error), { role: "user" as const, content: question }];
    setMessages((m) => [...m, { role: "user", content: question }]);
    setText("");
    setSending(true);
    try {
      const res = await api<{ reply: string; provider: string; answer: GroundedAnswer; conversationId: string | null }>("/api/clinician/copilot", {
        method: "POST",
        body: JSON.stringify({ caseId: caseId || undefined, conversationId, messages: turns.map(({ role, content }) => ({ role, content })) })
      });
      setMessages((m) => [...m, { role: "assistant", content: res.reply, provider: res.provider, answer: res.provider === "scripted" ? undefined : res.answer }]);
      if (res.conversationId) setConversationId(res.conversationId);
      void history.refresh();
    } catch (err) {
      setMessages((m) => [...m, { role: "assistant", content: userMessage(err, L.copilotError), error: true }]);
    } finally {
      setSending(false);
    }
  }

  function resetProposal() {
    setProposal(null);
    setProposalState("idle");
  }

  async function propose() {
    if (!caseId) return;
    setProposalState("loading");
    try {
      const res = await api<{ proposal: AgentProposal | null }>("/api/clinician/actions", {
        method: "POST",
        body: JSON.stringify({ caseId, action: "PROPOSE" })
      });
      setProposal(res.proposal);
      setProposalState(res.proposal ? "ready" : "none");
    } catch {
      setProposalState("error");
    }
  }

  async function approveProposalAction() {
    if (!caseId || !proposal) return;
    setProposalState("loading");
    try {
      await api<{ followUp: { id: string } }>("/api/clinician/actions", {
        method: "POST",
        body: JSON.stringify({ caseId, action: "APPROVE" })
      });
      storeDraftNote(proposal.draftNote); // prefills the release note on the case page
      setProposalState("approved");
    } catch {
      setProposalState("error");
    }
  }

  async function dismissProposal() {
    if (!caseId) return;
    try {
      await api("/api/clinician/actions", { method: "POST", body: JSON.stringify({ caseId, action: "DISMISS" }) });
    } catch {
      /* the dismissal still stands locally; the audit entry is best-effort */
    }
    setProposalState("dismissed");
  }

  function newChat() {
    setMessages([]);
    setConversationId(null);
    setOpenError(false);
    setText("");
    panel.afterPick();
  }

  async function openChat(id: string) {
    if (sending || opening) return;
    panel.afterPick();
    setOpening(true);
    setOpenError(false);
    try {
      const conv: ConversationDetail = await history.open(id);
      setCaseId(conv.caseId ?? "");
      setMessages(
        conv.messages.flatMap<Msg>((t) => [
          { role: "user", content: t.question },
          {
            role: "assistant",
            content: t.reply,
            provider: t.provider ?? undefined,
            answer: t.provider === "scripted" ? undefined : t.answer ?? undefined
          }
        ])
      );
      setConversationId(conv.id);
    } catch {
      setOpenError(true);
      void history.refresh();
    } finally {
      setOpening(false);
    }
  }

  async function deleteChat(id: string) {
    await history.remove(id);
    if (id === conversationId) newChat();
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void ask(text);
  }

  const caseName = cases.find((c) => c.id === caseId)?.name;

  return (
    <div className="content assistant-page has-history">
      <div className="page-heading">
        <div>
          <p className="date-label">{L.copilotEyebrow}</p>
          <h1>{L.copilotTitle}</h1>
          <span>{L.copilotSubtitle}</span>
        </div>
        <label className="field copilot-case">
          <span>{L.caseLabel}</span>
          <div className="input-wrap">
            <select value={caseId} onChange={(e) => { setCaseId(e.target.value); newChat(); resetProposal(); }}>
              <option value="">{L.noCase}</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </label>
      </div>

      <div className={`assistant-layout${panel.open ? " history-open" : ""}`}>
      <ChatHistory
        locale={locale}
        open={panel.open}
        onClose={() => panel.setOpen(false)}
        items={history.items}
        error={history.error}
        onRetry={() => void history.refresh()}
        activeId={conversationId}
        onSelect={(id) => void openChat(id)}
        onNew={newChat}
        onDelete={deleteChat}
        metaFor={(c) => (c.caseId ? cases.find((x) => x.id === c.caseId)?.name : undefined)}
        disabled={sending || opening}
      />
      <section className="assistant-shell panel">
        <div className="assistant-head">
          <div className="assistant-orb"><Sparkles size={21} /></div>
          <span>
            <strong>{L.copilotName}</strong>
            <small><i /> {caseName ? L.usingRecord(caseName) : L.noCaseSelected} · {L.guidanceLibrary}</small>
          </span>
          <ChatHistoryActions
            locale={locale}
            open={panel.open}
            onToggle={() => panel.setOpen(!panel.open)}
            onNew={newChat}
            disabled={sending || opening}
          />
        </div>
        <div className="messages" aria-live="polite">
          {messages.length === 0 && !opening && (
            <div className="message ai">
              <div className="mini-orb"><Sparkles size={13} /></div>
              <div>
                {caseName ? L.introCase(caseName) : L.introGeneral}
              </div>
            </div>
          )}
          {messages.map((m, i) =>
            m.role === "user" ? (
              <div className="message user" key={i}><div dir="auto">{m.content}</div></div>
            ) : (
              <div className="message ai" key={i}>
                <div className="mini-orb"><Sparkles size={13} /></div>
                <div>
                  {caseName && !m.error && <div className="tool-badges"><span className="tool-badge"><FileText size={12} /> {L.caseRecord}</span></div>}
                  {m.answer ? <GroundedReply answer={m.answer} audience="clinician" locale={locale} /> : <div className="reply-text" dir="auto">{m.content}</div>}
                  {m.provider && <span className="provider-tag"><Cpu size={12} /> {L.providers[m.provider] ?? m.provider}</span>}
                </div>
              </div>
            )
          )}
          {opening && <p className="chat-loading" role="status">{historyText(locale, "opening")}</p>}
          {openError && <div className="assistant-unavailable" role="alert">{historyText(locale, "openError")}</div>}
          {sending && (
            <div className="message ai">
              <div className="mini-orb"><Sparkles size={13} /></div>
              <div className="typing" aria-label={L.thinking}><i /><i /><i /></div>
            </div>
          )}
          <div ref={endRef} />
        </div>
        {caseId && (proposalState === "idle" || proposalState === "error") && (
          <div className="proposal-bar">
            <button type="button" className="secondary" onClick={() => void propose()} disabled={sending}>
              <Workflow size={15} /> {L.proposeAction}
            </button>
            {proposalState === "error" && <span className="form-error" role="alert">{L.proposalError}</span>}
          </div>
        )}
        {proposalState === "loading" && <p className="chat-loading" role="status">{L.proposing}</p>}
        {proposalState === "none" && <div className="action-proposal muted-note">{L.proposalNone}</div>}
        {proposalState === "ready" && proposal && (
          <div className="action-proposal" aria-live="polite">
            <div className="proposal-head"><Workflow size={15} aria-hidden /><strong>{L.proposalTitle}</strong></div>
            <p className="proposal-sub" dir="auto">{proposal.title}</p>
            <ul className="proposal-rationale">
              {proposal.rationale.map((r, i) => <li key={i} dir="auto">{r}</li>)}
            </ul>
            {proposal.rules.length > 0 && (
              <div className="tool-badges" lang="en">
                {proposal.rules.map((r) => <span className="tool-badge" key={r.id} title={r.source}>{r.id}</span>)}
              </div>
            )}
            <label className="field">
              <span>{L.proposalDraftNote}</span>
              <textarea dir="auto" rows={3} readOnly value={proposal.draftNote} onFocus={(e) => e.target.select()} />
            </label>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => void dismissProposal()}><X size={15} /> {L.proposalDismiss}</button>
              <button type="button" className="primary" onClick={() => void approveProposalAction()}><CheckCircle2 size={15} /> {L.proposalApprove}</button>
            </div>
          </div>
        )}
        {proposalState === "approved" && (
          <div className="action-proposal approved" aria-live="polite">
            <div className="proposal-head"><CheckCircle2 size={15} aria-hidden /><strong>{L.proposalApproved}</strong></div>
            <p dir="auto">{L.proposalApprovedHint}</p>
            <div className="modal-actions">
              <Link href="/clinician/follow-up" className="secondary">{L.proposalViewFollowUp}</Link>
              <Link href={`/clinician/patient/${caseId}`} className="primary">{L.proposalOpenCase}</Link>
            </div>
          </div>
        )}
        {proposalState === "dismissed" && (
          <div className="action-proposal">
            <p dir="auto">{L.proposalDismissed}</p>
            <button type="button" className="secondary" onClick={() => void propose()} disabled={sending}><Workflow size={15} /> {L.proposeAction}</button>
          </div>
        )}
        {messages.length === 0 && !opening && (
          <div className="suggestions" lang="en" dir="ltr">
            {ar && <small className="muted-note" lang="ar" dir="rtl" style={{ width: "100%" }}>{L.englishPrompts}</small>}
            {(caseName ? PROMPTS_CASE : PROMPTS_GENERAL).map((p) => (
              <button key={p} type="button" onClick={() => void ask(p)} disabled={sending}>{p}</button>
            ))}
          </div>
        )}
        <form className="chat-input" onSubmit={submit}>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder={L.askPlaceholder} aria-label={L.yourQuestion} maxLength={2000} dir={text ? "auto" : undefined} />
          <button disabled={sending || !text.trim()} aria-label={L.send}><Send size={17} className="flip-rtl" /></button>
        </form>
        <div className="assistant-disclaimer">
          <ShieldCheck size={13} /> {L.copilotDisclaimer}
        </div>
      </section>
      </div>
    </div>
  );
}
