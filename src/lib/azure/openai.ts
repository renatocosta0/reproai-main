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
}

export async function chatCompletion(
  messages: ChatMessage[],
  options: ChatOptions = {}
): Promise<string> {
  const cfg = getAzureOpenAIConfig();
  if (!cfg) throw new AzureNotConfigured();

  const url = `${cfg.endpoint}/openai/deployments/${encodeURIComponent(
    cfg.deployment
  )}/chat/completions?api-version=${cfg.apiVersion}`;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cfg.apiKey) {
    headers["api-key"] = cfg.apiKey;
  } else if (options.entraToken) {
    headers["Authorization"] = `Bearer ${options.entraToken}`;
  } else {
    throw new AzureNotConfigured();
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 600
    }),
    cache: "no-store"
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Azure OpenAI error (${res.status}): ${detail}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Azure OpenAI returned an empty response");
  return content;
}
