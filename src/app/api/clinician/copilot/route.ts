import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { canAccessCase } from "@/lib/clinician-scope";
import { buildCaseFacts, scriptedSummary } from "@/lib/copilot";
import { groundedAnswer, answerText } from "@/lib/rag/answer";
import { casePassages } from "@/lib/rag/record-passages";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// POST /api/clinician/copilot { caseId?, messages }
// Explains one case for the clinician using the grounded pipeline: the case
// record and the cited guidance library are the only sources, retrieval always
// runs first, and each sentence is checked against what it cites. Sentences
// that fail are shown flagged, not hidden, so the clinician can judge them.
// When the AI is unavailable a labelled scripted summary is returned instead.
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "CLINICIAN") {
      return NextResponse.json({ error: "Clinician access required" }, { status: 403 });
    }
    const body = await req.json().catch(() => null);
    const userTurns: string[] = Array.isArray(body?.messages)
      ? body.messages.filter((m: any) => m?.role === "user" && typeof m.content === "string").map((m: any) => m.content as string)
      : [];
    const question = userTurns[userTurns.length - 1]?.trim();
    if (!question) return NextResponse.json({ error: "messages are required" }, { status: 400 });

    const caseId = typeof body?.caseId === "string" && body.caseId ? body.caseId : null;
    if (caseId && !(await canAccessCase(session.userId, caseId))) {
      return NextResponse.json({ error: "This case is not in your care list" }, { status: 403 });
    }
    const facts = caseId ? await buildCaseFacts(caseId) : null;

    const answer = await groundedAnswer(question, {
      audience: "clinician",
      record: facts ? casePassages(facts) : [],
      previousQuestion: userTurns[userTurns.length - 2]
    });
    await audit(session.userId, "copilot_query", `${caseId ? `couple:${caseId}` : "general"};status:${answer.status};flagged:${answer.flagged}`);

    if (answer.mode === "extractive" && facts) {
      return NextResponse.json({ answer, reply: scriptedSummary(facts), provider: "scripted" });
    }
    return NextResponse.json({ answer, reply: answerText(answer), provider: answer.provider ?? answer.mode });
  } catch (error: any) {
    console.error("[POST /api/clinician/copilot] error:", error);
    return NextResponse.json({ error: "Copilot failed" }, { status: 500 });
  }
}
