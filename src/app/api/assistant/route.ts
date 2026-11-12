import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { groundedAnswer, answerText } from "@/lib/rag/answer";

export const dynamic = "force-dynamic";

// Legacy general assistant endpoint, kept for API clients. It now uses the
// grounded pipeline with the guidance library only (no personal record): the
// same retrieval, abstention and per-sentence verification as the portals.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const users = Array.isArray(body?.messages) ? body.messages.filter((m: any) => m?.role === "user" && typeof m.content === "string") : [];
  const question = users[users.length - 1]?.content?.trim();
  if (!question) return NextResponse.json({ error: "messages are required" }, { status: 400 });
  const answer = await groundedAnswer(question, {
    audience: session.role === "CLINICIAN" ? "clinician" : "patient",
    previousQuestion: users[users.length - 2]?.content
  });
  await audit(session.userId, "assistant_message", `status:${answer.status}`);
  return NextResponse.json({ reply: answerText(answer), answer, provider: answer.provider ?? answer.mode });
}
