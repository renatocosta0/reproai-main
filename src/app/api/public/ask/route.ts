import { NextRequest, NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { groundedAnswer } from "@/lib/rag/answer";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// POST /api/public/ask { question, previousQuestion?, locale? }
// Public, guidance-only assistant: no account, no personal record, nothing
// stored. It answers only from the cited guidance library through the same
// grounded pipeline as the patient assistant (retrieve first, cite every
// sentence, show only verified sentences, abstain when nothing relevant is
// found). The question text is never logged; only an outcome count is audited.
export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(`public-ask:${clientKey(req.headers)}`, 8, 60_000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: `Too many questions at once. Please wait ${limited.retryAfterS} seconds.` },
        { status: 429, headers: { "Retry-After": String(limited.retryAfterS) } }
      );
    }
    const body = await req.json().catch(() => null);
    const question = typeof body?.question === "string" ? body.question.trim().slice(0, 500) : "";
    if (!question) return NextResponse.json({ error: "Type a question first." }, { status: 400 });
    const previousQuestion = typeof body?.previousQuestion === "string" ? body.previousQuestion.slice(0, 500) : undefined;
    const locale = body?.locale === "ar" ? "ar" : "en";

    const answer = await groundedAnswer(question, { audience: "patient", previousQuestion, locale });
    await audit("public", "public_ask", `status:${answer.status};mode:${answer.mode}`);
    return NextResponse.json({ answer });
  } catch (error) {
    console.error("[POST /api/public/ask] error:", error);
    return NextResponse.json({ error: "The assistant could not answer just now. Please try again." }, { status: 500 });
  }
}
