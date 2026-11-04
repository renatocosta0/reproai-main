import { NextRequest, NextResponse } from "next/server";
import { chat, NoLLMConfigured, type ChatMessage } from "@/lib/chat-provider";
import { retrieveGrounding } from "@/lib/azure/search";
import { buildGroundedSystemPrompt } from "@/lib/azure/prompt";
import { getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";

// Conversational assistant with automatic LLM provider fallback:
//   Azure OpenAI (AI Foundry) → Groq (free tier) → honest 503
// RAG grounding: Azure AI Search → local WHO guidelines (always available)
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { messages } = (await req.json()) as { messages: ChatMessage[] };
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages are required" }, { status: 400 });
  }

  const lastUser = [...messages].reverse().find((m) => m.role === "user");

  try {
    // Ground on WHO/clinical guidelines — Azure AI Search if configured,
    // otherwise the built-in local guideline library (always available).
    const snippets = lastUser ? await retrieveGrounding(lastUser.content) : [];
    const system = buildGroundedSystemPrompt(snippets.map((s) => s.content));

    const { reply, provider } = await chat([
      { role: "system", content: system },
      ...messages
    ]);

    await audit(session.userId, "assistant_message", `user:${session.userId}`);

    return NextResponse.json({
      reply,
      provider, // "azure" | "groq" — visible in API responses for transparency
      sources: snippets.map((s) => s.source).filter(Boolean)
    });
  } catch (e) {
    if (e instanceof NoLLMConfigured) {
      return NextResponse.json(
        {
          error:
            "The assistant is not configured yet. Add AZURE_OPENAI_* credentials (Azure) or a GROQ_API_KEY (free) to enable live responses."
        },
        { status: 503 }
      );
    }
    const message = e instanceof Error ? e.message : "Assistant error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
