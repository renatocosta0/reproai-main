import { NextRequest, NextResponse } from "next/server";
import { runAgent, AgentMessage } from "@/lib/agents/orchestrator";
import { buildGroundedSystemPrompt } from "@/lib/azure/prompt";
import { AzureNotConfigured } from "@/lib/azure/openai";
import { getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const maxDuration = 60; // Allow up to 60s for multi-turn LLM tool execution on Vercel
export const dynamic = "force-dynamic";

// Agentic assistant endpoint. Runs the Azure-backed agent with built-in and MCP
// tools. Never fabricates answers: returns 503 when neither Azure nor Groq is configured.
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json({ error: "messages are required" }, { status: 400 });
    }

    const messages = body.messages as AgentMessage[];
    const system: AgentMessage = { role: "system", content: buildGroundedSystemPrompt([]) };

    const { reply, toolsUsed, provider } = await runAgent([system, ...messages]);
    await audit(session.userId, "agent_message", `user:${session.userId}`);
    return NextResponse.json({ reply, toolsUsed, provider });
  } catch (e: any) {
    console.error("[POST /api/agent] error:", e);
    if (e instanceof AzureNotConfigured || e?.message?.includes("Neither Azure OpenAI nor Groq")) {
      return NextResponse.json(
        {
          error:
            "The agent is not configured yet. Add Azure OpenAI or Groq credentials to enable autonomous agent execution."
        },
        { status: 503 }
      );
    }
    const message = e instanceof Error ? e.message : "Agent error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
