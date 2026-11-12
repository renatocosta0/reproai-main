// Assistant chat history ("recent conversations") for the patient assistant and
// the clinician copilot. Conversations are private to the user who asked: every
// query here is scoped by the session's userId, and a clinician chat about a
// case is only readable while that case is still in the clinician's care list.
// Turns are written by the ask/copilot routes themselves (never by the client),
// with the full GroundedAnswer JSON, so a reopened chat re-renders its citations
// without calling the LLM again.

import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getSession, type SessionPayload } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { clinicianCaseIds, canAccessCase } from "@/lib/clinician-scope";
import { prisma } from "@/lib/db";
import type { GroundedAnswer } from "@/lib/rag/answer";

export type AssistantKind = "PATIENT_ASSISTANT" | "CLINICIAN_COPILOT";

const ROLE_FOR: Record<AssistantKind, "PATIENT" | "CLINICIAN"> = {
  PATIENT_ASSISTANT: "PATIENT",
  CLINICIAN_COPILOT: "CLINICIAN"
};

const TITLE_MAX = 80;
const LIST_LIMIT = 50;

export interface ConversationSummary {
  id: string;
  title: string;
  caseId: string | null;
  createdAt: string;
  updatedAt: string;
  turns: number;
}

export interface ConversationTurn {
  id: string;
  question: string;
  reply: string;
  provider: string | null;
  answer: GroundedAnswer | null;
  createdAt: string;
}

export interface ConversationDetail extends ConversationSummary {
  turns: number;
  messages: ConversationTurn[];
}

function titleFrom(question: string): string {
  const q = question.replace(/\s+/g, " ").trim();
  return q.length > TITLE_MAX ? `${q.slice(0, TITLE_MAX - 1).trimEnd()}…` : q;
}

/**
 * Append one answered turn. Continues `conversationId` when it belongs to this
 * user, this assistant and the same case; otherwise starts a new conversation.
 * Returns the conversation id, or null if saving failed (the answer is still
 * returned to the user; history is best-effort and never blocks an answer).
 */
export async function recordTurn(input: {
  userId: string;
  assistant: AssistantKind;
  conversationId?: string | null;
  caseId?: string | null;
  question: string;
  reply: string;
  provider?: string | null;
  answer: GroundedAnswer;
}): Promise<string | null> {
  try {
    const caseId = input.caseId ?? null;
    let id: string | null = null;
    if (input.conversationId) {
      const existing = await prisma.chatConversation.findFirst({
        where: { id: input.conversationId, userId: input.userId, assistant: input.assistant, caseId },
        select: { id: true }
      });
      id = existing?.id ?? null;
    }
    const turn = {
      question: input.question.slice(0, 2000),
      reply: input.reply,
      provider: input.provider ?? null,
      answer: input.answer as unknown as Prisma.InputJsonValue
    };
    if (id) {
      await prisma.$transaction([
        prisma.chatTurn.create({ data: { conversationId: id, ...turn } }),
        prisma.chatConversation.update({ where: { id }, data: { updatedAt: new Date() } })
      ]);
      return id;
    }
    const created = await prisma.chatConversation.create({
      data: {
        userId: input.userId,
        assistant: input.assistant,
        caseId,
        title: titleFrom(input.question),
        turns: { create: turn }
      },
      select: { id: true }
    });
    return created.id;
  } catch (error) {
    console.error("[chat-history] could not save turn:", error);
    return null;
  }
}

async function sessionFor(assistant: AssistantKind): Promise<SessionPayload | null> {
  const session = await getSession();
  return session && session.role === ROLE_FOR[assistant] ? session : null;
}

const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const notFound = () => NextResponse.json({ error: "Conversation not found" }, { status: 404 });

/** GET handler: this user's recent conversations for one assistant, newest first. */
export function listHandler(assistant: AssistantKind) {
  return async function GET() {
    try {
      const session = await sessionFor(assistant);
      if (!session) return unauthorized();
      const rows = await prisma.chatConversation.findMany({
        where: { userId: session.userId, assistant },
        orderBy: { updatedAt: "desc" },
        take: LIST_LIMIT,
        select: { id: true, title: true, caseId: true, createdAt: true, updatedAt: true, _count: { select: { turns: true } } }
      });
      // Clinicians only see case chats for cases still in their care list.
      const scope = assistant === "CLINICIAN_COPILOT" ? await clinicianCaseIds(session.userId) : null;
      const conversations: ConversationSummary[] = rows
        .filter((r) => !r.caseId || !scope || scope.has(r.caseId))
        .map((r) => ({
          id: r.id,
          title: r.title,
          caseId: r.caseId,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
          turns: r._count.turns
        }));
      return NextResponse.json({ conversations });
    } catch (error) {
      console.error("[chat-history] list failed:", error);
      return NextResponse.json({ error: "Could not load your conversations." }, { status: 500 });
    }
  };
}

type Ctx = { params: { id: string } };

/** GET / DELETE handlers for one conversation, scoped to the signed-in user. */
export function itemHandlers(assistant: AssistantKind) {
  async function find(session: SessionPayload, id: string) {
    const conv = await prisma.chatConversation.findFirst({ where: { id, userId: session.userId, assistant } });
    if (!conv) return null;
    if (assistant === "CLINICIAN_COPILOT" && conv.caseId && !(await canAccessCase(session.userId, conv.caseId))) return null;
    return conv;
  }

  async function GET(_req: NextRequest, { params }: Ctx) {
    try {
      const session = await sessionFor(assistant);
      if (!session) return unauthorized();
      const conv = await find(session, params.id);
      if (!conv) return notFound();
      const turns = await prisma.chatTurn.findMany({ where: { conversationId: conv.id }, orderBy: { createdAt: "asc" } });
      if (conv.caseId) await audit(session.userId, "chat_open", `conversation:${conv.id};couple:${conv.caseId}`);
      const detail: ConversationDetail = {
        id: conv.id,
        title: conv.title,
        caseId: conv.caseId,
        createdAt: conv.createdAt.toISOString(),
        updatedAt: conv.updatedAt.toISOString(),
        turns: turns.length,
        messages: turns.map((t) => ({
          id: t.id,
          question: t.question,
          reply: t.reply,
          provider: t.provider,
          answer: (t.answer as unknown as GroundedAnswer | null) ?? null,
          createdAt: t.createdAt.toISOString()
        }))
      };
      return NextResponse.json({ conversation: detail });
    } catch (error) {
      console.error("[chat-history] open failed:", error);
      return NextResponse.json({ error: "Could not open this conversation." }, { status: 500 });
    }
  }

  async function DELETE(_req: NextRequest, { params }: Ctx) {
    try {
      const session = await sessionFor(assistant);
      if (!session) return unauthorized();
      // Deleting needs ownership only: a clinician may remove their own chat
      // about a case that has since left their care list.
      const conv = await prisma.chatConversation.findFirst({
        where: { id: params.id, userId: session.userId, assistant },
        select: { id: true, caseId: true }
      });
      if (!conv) return notFound();
      await prisma.chatConversation.delete({ where: { id: conv.id } });
      await audit(session.userId, "chat_delete", `conversation:${conv.id}${conv.caseId ? `;couple:${conv.caseId}` : ""}`);
      return NextResponse.json({ ok: true });
    } catch (error) {
      console.error("[chat-history] delete failed:", error);
      return NextResponse.json({ error: "Could not delete this conversation." }, { status: 500 });
    }
  }

  return { GET, DELETE };
}
