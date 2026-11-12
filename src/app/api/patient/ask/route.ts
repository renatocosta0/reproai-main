import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { loadPersonRecord } from "@/lib/person-record";
import { groundedAnswer, answerText } from "@/lib/rag/answer";
import { patientRecordPassages } from "@/lib/rag/record-passages";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// POST /api/patient/ask { question, previousQuestion?, locale? }
// The patient assistant. It has no tools: it cannot run the model or compute
// anything. It answers only from the cited guidance library and the patient's
// own released record, and every sentence is checked against the passage it
// cites before it is shown. When nothing relevant is found it says so.
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "PATIENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json().catch(() => null);
    const question = typeof body?.question === "string" ? body.question.trim() : "";
    if (!question) return NextResponse.json({ error: "question is required" }, { status: 400 });
    const previousQuestion = typeof body?.previousQuestion === "string" ? body.previousQuestion.slice(0, 500) : undefined;
    const locale = body?.locale === "ar" ? "ar" : "en";

    const record = await loadPersonRecord(session.userId, "PATIENT");
    const pending = await prisma.prediction.count({
      where: {
        status: "DRAFT",
        OR: [{ userId: session.userId }, ...(session.coupleId ? [{ coupleId: session.coupleId, scope: "COUPLE" }] : [])]
      }
    });
    const passages = record ? patientRecordPassages(record, pending > 0) : [];

    const answer = await groundedAnswer(question, { audience: "patient", record: passages, previousQuestion, locale });
    await audit(session.userId, "patient_ask", `status:${answer.status};mode:${answer.mode};removed:${answer.removed}`);
    return NextResponse.json({ answer, reply: answerText(answer) });
  } catch (error: any) {
    console.error("[POST /api/patient/ask] error:", error);
    return NextResponse.json({ error: "The assistant could not answer just now." }, { status: 500 });
  }
}
