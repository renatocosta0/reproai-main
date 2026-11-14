"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Cpu, Send, ShieldCheck, Sparkles } from "lucide-react";
import { firstName, usePatient } from "@/components/patient/PatientContext";
import { api, ApiError } from "@/lib/api-client";
import { useLocale } from "@/components/i18n/LocaleContext";
import { GroundedReply } from "@/components/assistant/GroundedReply";
import { ChatHistory, ChatHistoryActions, historyText, useConversations, useHistoryPanel, type ConversationDetail } from "@/components/assistant/ChatHistory";
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


const S = {
  en: {
    eyebrow: "CITED GUIDANCE",
    title: "Ask ReproAI",
    subtitle: "Clear explanations for everyday questions, with your clinician always in the loop.",
    assistantName: "ReproAI care assistant",
    assistantSub: "Answers only from cited guidance and your released record",
    hello: (name: string | null) => `Hello${name ? ` ${name}` : ""}. I can explain your released results and the guidance behind them in plain language. I only answer from the Thiqa and WHO guidance in my library and from your record, and I show the source for every sentence. If something isn't covered, I'll say so rather than guess. I don't diagnose.`,
    englishSources: "",
    thinking: "ReproAI is thinking",
    unavailable: "The assistant isn't available yet: your clinic hasn't enabled it. Your question has been kept so you can send it later.",
    placeholder: "Ask a question about your journey…",
    yourQuestion: "Your question",
    send: "Send",
    disclaimer: "Educational guidance only. ReproAI does not replace advice from your clinical team."
  },
  ar: {
    eyebrow: "إرشادات موثّقة المصادر",
    title: "اسأل ReproAI",
    subtitle: "شرح واضح للأسئلة اليومية، مع إشراك طبيبك دائمًا.",
    assistantName: "مساعد الرعاية من ReproAI",
    assistantSub: "يجيب فقط من الإرشادات الموثّقة ومن سجلك المعتمد",
    hello: (name: string | null) => `مرحبًا${name ? ` ${name}` : ""}. يمكنني أن أشرح نتائجك المعتمدة والإرشادات التي تستند إليها بلغة واضحة. أجيب فقط من إرشادات ضمان ثقة ومنظمة الصحة العالمية في مكتبتي ومن سجلك، وأُظهر المصدر لكل جملة. إذا لم يكن الأمر مشمولًا، سأقول ذلك بدل التخمين. ولا أقدّم تشخيصًا.`,
    englishSources: "المصادر بالإنجليزية فقط، لذا قد لا أجيب عن الأسئلة المكتوبة بالعربية. جرّب طرح السؤال بالإنجليزية.",
    thinking: "ReproAI يفكّر",
    unavailable: "المساعد غير متاح بعد لأن عيادتك لم تفعّله. احتفظنا بسؤالك لترسله لاحقًا.",
    placeholder: "اطرح سؤالًا عن رحلتك…",
    yourQuestion: "سؤالك",
    send: "إرسال",
    disclaimer: "إرشادات تثقيفية فقط. لا يغني ReproAI عن نصيحة فريقك الطبي."
  }
};

export default function AssistantPage() {
  const { data } = usePatient();
  const { locale } = useLocale();
  const L = S[locale];
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [unavailable, setUnavailable] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState(false);
  const history = useConversations("/api/patient/conversations");
  const panel = useHistoryPanel();
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
      const res = await api<{ answer: GroundedAnswer; reply: string; conversationId: string | null }>("/api/patient/ask", {
        method: "POST",
        body: JSON.stringify({ question: q, previousQuestion, locale, conversationId })
      });
      setMessages((m) => [...m, { role: "assistant", content: res.reply, answer: res.answer }]);
      if (res.conversationId) setConversationId(res.conversationId);
      void history.refresh();
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

  const newChat = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setUnavailable("");
    setOpenError(false);
    setText("");
    panel.afterPick();
  }, [panel]);

  async function openChat(id: string) {
    if (sending || opening) return;
    panel.afterPick();
    setOpening(true);
    setOpenError(false);
    setUnavailable("");
    try {
      const conv: ConversationDetail = await history.open(id);
      setMessages(
        conv.messages.flatMap<ChatMessage>((t) => [
          { role: "user", content: t.question },
          { role: "assistant", content: t.reply, answer: t.answer ?? undefined }
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

  return (
    <div className="content patient-content assistant-page has-history">
      <div className="page-heading">
        <div>
          <p className="date-label">{L.eyebrow}</p>
          <h1>{L.title}</h1>
          <span>{L.subtitle}</span>
        </div>
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
        disabled={sending || opening}
      />
      <section className="assistant-shell panel">
        <div className="assistant-head">
          <div className="assistant-orb">
            <Sparkles size={21} />
          </div>
          <span>
            <strong>{L.assistantName}</strong>
            <small>
              <i /> {L.assistantSub}
            </small>
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
          <div className="message ai">
            <div className="mini-orb"><Sparkles size={13} /></div>
            <div>
              {L.hello(name ?? null)}
              {L.englishSources && <p className="muted-note" style={{ marginTop: 8 }}>{L.englishSources}</p>}
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
        {unavailable && (
          <div className="assistant-unavailable" role="alert">
            {L.unavailable}
          </div>
        )}
        {messages.length === 0 && !opening && (
          <div className="suggestions" lang="en" dir="ltr">
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
            placeholder={L.placeholder}
            aria-label={L.yourQuestion}
            maxLength={2000}
          />
          <button disabled={sending || !text.trim()} aria-label={L.send}>
            <Send size={17} className="flip-rtl" />
          </button>
        </form>
        <div className="assistant-disclaimer">
          <ShieldCheck size={13} /> {L.disclaimer}
        </div>
      </section>
      </div>
    </div>
  );
}
