"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icons";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Assistant temporarily unavailable");
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The assistant is temporarily unavailable. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-main">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">Patient workspace</p>
          <h1>Your assistant</h1>
        </div>
      </div>

      <aside className={`info-banner ${error ? "banner-error" : ""}`}>
        <span className="banner-icon">
          <Icon name={error ? "alert" : "info"} />
        </span>
        <p>
          {error
            ? error
            : "Educational, non-diagnostic guidance. This assistant does not replace medical advice."}
        </p>
      </aside>

      <Card className="chat-card">
        <div className="chat-thread">
          <div className="assistant-message">
            <span className="assistant-avatar">
              <Icon name="spark" />
            </span>
            <div>
              <div className="bubble assistant">
                <p>
                  Living with reproductive health concerns can feel complex, but small lifestyle
                  changes and evidence-based guidance may support your wellbeing.
                </p>
                <p>
                  Regular movement, balanced nutrition, restorative sleep, and thermal shift
                  tracking can all help. What would you like to explore today?
                </p>
              </div>
              <div className="chips">
                <span>WHO guideline</span>
                <span>Clinical guidance</span>
              </div>
            </div>
          </div>

          {messages.map((m, i) =>
            m.role === "user" ? (
              <div className="bubble user" key={i}>
                {m.content}
              </div>
            ) : (
              <div className="assistant-message" key={i}>
                <span className="assistant-avatar">
                  <Icon name="spark" />
                </span>
                <div>
                  <div className="bubble assistant" style={{ whiteSpace: "pre-line" }}>
                    {m.content}
                  </div>
                </div>
              </div>
            )
          )}

          {loading && (
            <div className="assistant-message">
              <span className="assistant-avatar">
                <Icon name="spark" />
              </span>
              <div className="bubble assistant typing">
                <i />
                <i />
                <i />
              </div>
            </div>
          )}
        </div>

        <form className="chat-input" onSubmit={send}>
          <input
            placeholder="Type your question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <Button type="submit" disabled={loading || !input.trim()}>
            Send <Icon name="send" size={16} />
          </Button>
        </form>
      </Card>
    </main>
  );
}
