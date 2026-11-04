// Groq LLM client — OpenAI-compatible API, free tier, no credit card required.
// Used as automatic fallback when Azure OpenAI is not configured.
//
// To switch to Azure instead: set AZURE_OPENAI_ENDPOINT + AZURE_OPENAI_DEPLOYMENT
// in .env and the chat-provider will prefer Azure automatically.
//
// Docs: https://console.groq.com/docs/openai

import type { ChatMessage } from "@/lib/azure/openai";

export class GroqNotConfigured extends Error {
  constructor() {
    super("Groq API key is not set (GROQ_API_KEY)");
  }
}

export interface GroqConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
}

// Models tried in order if the configured model returns 404/model_not_found.
// llama-3.1-8b-instant is reliably available on the free developer plan.
// Override the first choice with GROQ_MODEL in .env.
const FALLBACK_MODELS = [
  "llama-3.1-8b-instant",    // free tier — always available
  "llama-3.3-70b-versatile", // enterprise; available if plan allows
  "openai/gpt-oss-20b"       // paid tier fallback
];

export function getGroqConfig(): GroqConfig | null {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  return {
    apiKey,
    // llama-3.1-8b-instant is on Groq's free developer plan.
    // llama-3.3-70b-versatile requires an Enterprise plan.
    // Override with GROQ_MODEL in .env if needed.
    model: process.env.GROQ_MODEL ?? "llama-3.1-8b-instant",
    baseUrl: "https://api.groq.com/openai/v1"
  };
}

async function callGroq(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  options: { temperature?: number; maxTokens?: number }
): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 600
    }),
    cache: "no-store"
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Groq error (${res.status}): ${detail}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Groq returned an empty response");
  return content;
}

export async function groqChatCompletion(
  messages: ChatMessage[],
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  const cfg = getGroqConfig();
  if (!cfg) throw new GroqNotConfigured();

  // Try configured model first, then fallbacks if model is not found on this plan
  const modelsToTry = [
    cfg.model,
    ...FALLBACK_MODELS.filter((m) => m !== cfg.model)
  ];

  let lastError: Error | null = null;
  for (const model of modelsToTry) {
    try {
      return await callGroq(cfg.apiKey, model, messages, options);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      // Only fall through if the model itself is unavailable
      if (msg.includes("model_not_found") || msg.includes("model_decommissioned") || msg.includes("404")) {
        lastError = e instanceof Error ? e : new Error(msg);
        continue;
      }
      throw e; // Other errors (auth, rate limit, etc.) — propagate immediately
    }
  }

  throw lastError ?? new Error("All Groq models unavailable");
}

