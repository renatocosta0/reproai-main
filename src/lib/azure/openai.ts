// Azure OpenAI (AI Foundry) chat client. Supports API-key auth or, when no key
// is set, an Entra ID bearer token supplied by the caller. Returns a typed reply.
// Throws AzureNotConfigured when Azure OpenAI is not set up so callers can return
// an honest 503 instead of a mocked answer.

import { getAzureOpenAIConfig } from "@/lib/azure/config";

export class AzureNotConfigured extends Error {
  constructor() {
    super("Azure OpenAI is not configured");
  }
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  entraToken?: string; // optional Entra ID bearer token when no API key is used
  tools?: Array<{ type: "function"; function: Record<string, unknown> }>;
}

// Raw tool call as returned by the model.
export interface RawToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface ChatResult {
  content: string | null;
  toolCalls: RawToolCall[];
  raw: unknown;
}

function buildHeaders(cfg: NonNullable<ReturnType<typeof getAzureOpenAIConfig>>, options: ChatOptions): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cfg.apiKey) {
    headers["api-key"] = cfg.apiKey;
  } else if (options.entraToken) {
    headers["Authorization"] = `Bearer ${options.entraToken}`;
  } else {
    throw new AzureNotConfigured();
  }
  return headers;
}

// Low-level chat call that preserves tool calls. Accepts raw message objects so
// the agent loop can append assistant/tool messages between turns.
export async function chatRaw(
  messages: unknown[],
  options: ChatOptions = {}
): Promise<ChatResult> {
  const cfg = getAzureOpenAIConfig();
  if (!cfg) throw new AzureNotConfigured();

  const url = `${cfg.endpoint}/openai/deployments/${encodeURIComponent(
    cfg.deployment
  )}/chat/completions?api-version=${cfg.apiVersion}`;

  const body: Record<string, unknown> = {
    messages,
    temperature: options.temperature ?? 0.3,
    max_tokens: options.maxTokens ?? 600
  };
  if (options.tools && options.tools.length > 0) {
    body.tools = options.tools;
    body.tool_choice = "auto";
  }

  const res = await fetch(url, {
    method: "POST",
    headers: buildHeaders(cfg, options),
    body: JSON.stringify(body),
    cache: "no-store"
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Azure OpenAI error (${res.status}): ${detail}`);
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

export async function chatCompletion(
  messages: ChatMessage[],
  options: ChatOptions = {}
): Promise<string> {
  const result = await chatRaw(messages as unknown[], options);
  if (!result.content) throw new Error("Azure OpenAI returned an empty response");
  return result.content;
}
