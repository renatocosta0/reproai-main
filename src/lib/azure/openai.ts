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

// Reasoning models (GPT-5/6 families, o-series, gpt-chat-latest) reject
// `temperature` and require `max_completion_tokens` instead of `max_tokens`.
// Detected from the deployment name; set AZURE_OPENAI_REASONING=true|false to
// override when a deployment is renamed away from its model id.
function isReasoningDeployment(deployment: string): boolean {
  const override = process.env.AZURE_OPENAI_REASONING;
  if (override === "true") return true;
  if (override === "false") return false;
  return /gpt-[56]|gpt-chat|^o[134](-|$)/.test(deployment.toLowerCase());
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

  const reasoning = isReasoningDeployment(cfg.deployment);
  // Reasoning tokens count inside max_completion_tokens, so give reasoning
  // models headroom above the caller's visible-output budget.
  const budget = options.maxTokens ?? 600;
  const completionTokens = reasoning ? Math.min(budget + 1600, 8192) : budget;
  const body: Record<string, unknown> = { messages };
  if (reasoning) {
    body.max_completion_tokens = completionTokens;
  } else {
    body.temperature = options.temperature ?? 0.3;
    body.max_tokens = completionTokens;
  }
  if (options.tools && options.tools.length > 0) {
    body.tools = options.tools;
    body.tool_choice = "auto";
  }

  let res = await fetch(url, {
    method: "POST",
    headers: buildHeaders(cfg, options),
    body: JSON.stringify(body),
    cache: "no-store"
  });

  // Defensive fallback: if Azure rejects the sampling parameters (a reasoning
  // model whose deployment name slipped past detection), retry once without them.
  if (!res.ok && res.status === 400) {
    const detail = await res.text();
    if (/Unsupported parameter|max_tokens|temperature/i.test(detail)) {
      const retry: Record<string, unknown> = { messages };
      retry.max_completion_tokens = completionTokens;
      if (options.tools && options.tools.length > 0) {
        retry.tools = options.tools;
        retry.tool_choice = "auto";
      }
      res = await fetch(url, {
        method: "POST",
        headers: buildHeaders(cfg, options),
        body: JSON.stringify(retry),
        cache: "no-store"
      });
      if (res.ok) {
        const data = (await res.json()) as {
          choices?: Array<{ message?: { content?: string; tool_calls?: RawToolCall[] } }>;
        };
        const message = data.choices?.[0]?.message;
        return { content: message?.content ?? null, toolCalls: message?.tool_calls ?? [], raw: message ?? null };
      }
      throw new Error(`Azure OpenAI error (${res.status}): ${detail}`);
    }
    throw new Error(`Azure OpenAI error (${res.status}): ${detail}`);
  }

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
