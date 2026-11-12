// Groq LLM client — OpenAI-compatible API, free tier, no credit card required.
// Used as automatic fallback when Azure OpenAI is not configured.
//
// To switch to Azure instead: set AZURE_OPENAI_ENDPOINT + AZURE_OPENAI_DEPLOYMENT
// in .env and the chat-provider will prefer Azure automatically.
//
// Docs: https://console.groq.com/docs/openai

import type { ChatMessage, ChatOptions, ChatResult, RawToolCall } from "@/lib/azure/openai";

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
// Prioritizes high-reasoning, active tool-calling models on Groq.
const FALLBACK_MODELS = [
  "openai/gpt-oss-120b",     // 120B reasoning + tool-calling (fast, active on Groq)
  "qwen/qwen3.8-27b",        // 27B high-quality conversational + tool use
  "openai/gpt-oss-20b",      // 20B fast reasoning model
  "llama-3.3-70b-versatile", // Llama 3.3 70B (if enabled for the account)
  "llama-3.1-8b-instant"     // Llama 3.1 8B (if enabled for the account)
];

function sanitizeEnvVal(val: string | undefined): string | null {
  if (!val) return null;
  const trimmed = val.trim().replace(/^["']|["']$/g, "").trim();
  return trimmed || null;
}

export function getGroqConfig(): GroqConfig | null {
  const apiKey = sanitizeEnvVal(process.env.GROQ_API_KEY) || sanitizeEnvVal(process.env.GROK_API_KEY);
  if (!apiKey) return null;
  const configuredModel = sanitizeEnvVal(process.env.GROQ_MODEL) || sanitizeEnvVal(process.env.GROK_MODEL);
  return {
    apiKey,
    model: configuredModel || "openai/gpt-oss-120b",
    baseUrl: "https://api.groq.com/openai/v1"
  };
}

// Dynamically retrieves active chat models from Groq if hardcoded fallbacks fail
async function fetchAvailableChatModels(apiKey: string): Promise<string[]> {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store"
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { data?: Array<{ id: string; active?: boolean }> };
    const nonChatRegex = /whisper|guard|tts|embed|rerank/i;
    return (data.data ?? [])
      .filter((m) => m.active !== false && !nonChatRegex.test(m.id))
      .map((m) => m.id);
  } catch {
    return [];
  }
}

// Low-level Groq chat call that supports function/tool calling in OpenAI format
export async function groqChatRaw(
  messages: unknown[],
  options: ChatOptions = {}
): Promise<ChatResult> {
  const cfg = getGroqConfig();
  if (!cfg) throw new GroqNotConfigured();

  const body: Record<string, unknown> = {
    model: cfg.model,
    messages,
    temperature: options.temperature ?? 0.3,
    max_tokens: options.maxTokens ?? 700
  };

  if (options.tools && options.tools.length > 0) {
    body.tools = options.tools;
    body.tool_choice = "auto";
  }

  // Build candidate model list starting with configured model, then hardcoded fallbacks
  let modelsToTry = [cfg.model, ...FALLBACK_MODELS.filter((m) => m !== cfg.model)];
  let res: Response | null = null;
  let lastDetail = "";

  for (const model of modelsToTry) {
    res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`
      },
      body: JSON.stringify({ ...body, model }),
      cache: "no-store"
    });
    if (res.ok) break;
    lastDetail = await res.text();
    const unavailable = res.status === 404 || /model_not_found|model_decommissioned/.test(lastDetail);
    if (!unavailable) break;
  }

  // If all known models failed with 404, query the Groq models endpoint dynamically
  if (!res || !res.ok) {
    const isModelNotFound = res?.status === 404 || /model_not_found|model_decommissioned/.test(lastDetail);
    if (isModelNotFound) {
      const liveModels = await fetchAvailableChatModels(cfg.apiKey);
      const remainingModels = liveModels.filter((m) => !modelsToTry.includes(m));
      for (const model of remainingModels) {
        res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${cfg.apiKey}`
          },
          body: JSON.stringify({ ...body, model }),
          cache: "no-store"
        });
        if (res.ok) break;
        lastDetail = await res.text();
      }
    }
  }

  if (!res || !res.ok) {
    throw new Error(`Groq error (${res?.status ?? "no response"}): ${lastDetail}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string; tool_calls?: RawToolCall[] } }>;
  };

  const message = data.choices?.[0]?.message;
  return {
    content: message?.content ?? null,
    toolCalls: message?.tool_calls ?? [],
    raw: message ?? null
  };
}

/** Wait suggested by a 429 response ("try again in 705ms" / "in 2.5s"), capped. */
function retryDelayMs(detail: string): number | null {
  const m = detail.match(/try again in ([\d.]+)(ms|s)/i);
  if (!m) return null;
  const ms = Number(m[1]) * (m[2].toLowerCase() === "s" ? 1000 : 1);
  return ms <= 8000 ? Math.ceil(ms) + 150 : null;
}

async function callGroq(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  options: { temperature?: number; maxTokens?: number },
  attempt = 0
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
      max_tokens: options.maxTokens ?? 600,
      // Reasoning models otherwise spend the token budget thinking and return nothing.
      ...(model.startsWith("openai/gpt-oss") ? { reasoning_effort: "low" } : {})
    }),
    cache: "no-store"
  });

  if (!res.ok) {
    const detail = await res.text();
    // Free-tier rate limits are short; wait as told and retry up to twice.
    const wait = res.status === 429 && attempt < 2 ? retryDelayMs(detail) : null;
    if (wait !== null) {
      await new Promise((r) => setTimeout(r, wait));
      return callGroq(apiKey, model, messages, options, attempt + 1);
    }
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
      if (msg.includes("model_not_found") || msg.includes("model_decommissioned") || msg.includes("404")) {
        lastError = e instanceof Error ? e : new Error(msg);
        continue;
      }
      throw e;
    }
  }

  // Dynamic discovery if hardcoded list fails
  const liveModels = await fetchAvailableChatModels(cfg.apiKey);
  for (const model of liveModels.filter((m) => !modelsToTry.includes(m))) {
    try {
      return await callGroq(cfg.apiKey, model, messages, options);
    } catch {
      continue;
    }
  }

  throw lastError ?? new Error("All Groq models unavailable");
}
