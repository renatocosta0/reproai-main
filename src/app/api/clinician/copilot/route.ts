import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { canAccessCase } from "@/lib/clinician-scope";
import { runAgent, type AgentMessage } from "@/lib/agents/orchestrator";
import { buildCaseFacts, copilotSystemPrompt, scriptedSummary, unverifiedNumbers } from "@/lib/copilot";

// POST /api/clinician/copilot { caseId?, messages }
// Explains one case's record for the clinician. The scoring tool is not
// available to the LLM; it may only search guidelines. Numbers in the reply
// are checked against the record, and a failed LLM call returns a labelled
// scripted summary rather than pretending to be live AI.
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "CLINICIAN") {
      return NextResponse.json({ error: "Clinician access required" }, { status: 403 });
    }
    const body = await req.json().catch(() => null);
    const messages = Array.isArray(body?.messages)
      ? (body.messages as AgentMessage[]).filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string").slice(-12)
      : [];
    if (messages.length === 0) {
      return NextResponse.json({ error: "messages are required" }, { status: 400 });
    }
    const caseId = typeof body?.caseId === "string" && body.caseId ? body.caseId : null;
    if (caseId && !(await canAccessCase(session.userId, caseId))) {
      return NextResponse.json({ error: "This case is not in your care list" }, { status: 403 });
    }

    const facts = caseId ? await buildCaseFacts(caseId) : null;
    await audit(session.userId, "copilot_query", caseId ? `couple:${caseId}` : "general");

    try {
      const result = await runAgent([{ role: "system", content: copilotSystemPrompt(facts) }, ...messages], {
        allowTools: ["search_guidelines"]
      });
      return NextResponse.json({
        reply: result.reply,
        toolsUsed: result.toolsUsed,
        provider: result.provider,
        unverifiedNumbers: unverifiedNumbers(result.reply, facts),
        factsUsed: Boolean(facts)
      });
    } catch (llmError) {
      console.warn("[copilot] LLM unavailable, returning scripted summary:", llmError);
      return NextResponse.json({
        reply: scriptedSummary(facts),
        toolsUsed: [],
        provider: "scripted",
        unverifiedNumbers: [],
        factsUsed: Boolean(facts)
      });
    }
  } catch (error: any) {
    console.error("[POST /api/clinician/copilot] error:", error);
    return NextResponse.json({ error: error?.message ?? "Copilot failed" }, { status: 500 });
  }
}
