"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    const text = input.trim();
    if (!text) return;
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
      if (!res.ok) throw new Error(data.error ?? "Assistant unavailable");
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-semibold text-brand">Your assistant</h1>
      <Card title="A supportive, judgement-free guide">
        <p className="mb-4 text-sm text-gray-600">
          Ask questions about fertility, PCOS or your treatment journey. The assistant is
          educational and does not provide a diagnosis.
        </p>
        <div className="mb-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-sm text-gray-400">No messages yet. Start the conversation below.</p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "ml-auto max-w-[80%] rounded-lg bg-brand px-4 py-2 text-sm text-white"
                  : "mr-auto max-w-[80%] rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-800"
              }
            >
              {m.content}
            </div>
          ))}
        </div>
        {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Type your question…"
            className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            onClick={send}
            disabled={loading}
            className="rounded-lg bg-brand px-5 py-2 text-white disabled:opacity-50"
          >
            {loading ? "…" : "Send"}
          </button>
        </div>
      </Card>
    </main>
  );
}
