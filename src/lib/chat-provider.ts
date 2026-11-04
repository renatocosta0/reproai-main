// LLM provider abstraction layer.
//
// Priority order (automatic, no code changes needed to switch):
//   1. Azure OpenAI / AI Foundry  — preferred for production
//      Activated by: AZURE_OPENAI_ENDPOINT + AZURE_OPENAI_DEPLOYMENT (+ key or Entra ID)
//   2. Groq (free tier)           — fallback while Azure credits are pending
//      Activated by: GROQ_API_KEY
//   3. 503 error                  — honest failure, never a fake answer
//
// When Azure credentials arrive, fill in AZURE_OPENAI_* in .env and this file
// will automatically prefer Azure without any code changes.

import { chatCompletion, AzureNotConfigured, type ChatMessage } from "@/lib/azure/openai";
import { groqChatCompletion, GroqNotConfigured } from "@/lib/groq/client";

export { AzureNotConfigured, GroqNotConfigured };
export type { ChatMessage };

export class NoLLMConfigured extends Error {
  constructor() {
    super(
      "No LLM provider is configured. " +
        "Set AZURE_OPENAI_ENDPOINT + AZURE_OPENAI_DEPLOYMENT for Azure OpenAI, " +
        "or GROQ_API_KEY for Groq (free tier)."
    );
  }
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  entraToken?: string; // Azure Entra ID token (Azure only)
}

export interface ChatResult {
  reply: string;
  provider: "azure" | "groq";
}

/**
 * Send a chat completion request to whichever LLM provider is configured.
 * Azure is always tried first; Groq is the automatic fallback.
 */
export async function chat(
  messages: ChatMessage[],
  options: ChatOptions = {}
): Promise<ChatResult> {
  // ── 1. Azure OpenAI ──────────────────────────────────────────────────────
  try {
    const reply = await chatCompletion(messages, options);
    return { reply, provider: "azure" };
  } catch (e) {
    if (!(e instanceof AzureNotConfigured)) throw e;
    // Azure not configured — fall through to Groq
  }

  // ── 2. Groq (free-tier fallback) ─────────────────────────────────────────
  try {
    const reply = await groqChatCompletion(messages, options);
    return { reply, provider: "groq" };
  } catch (e) {
    if (!(e instanceof GroqNotConfigured)) throw e;
    // Groq not configured — fall through to error
  }

  // ── 3. No provider available ─────────────────────────────────────────────
  throw new NoLLMConfigured();
}

