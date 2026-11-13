import { listHandler } from "@/lib/chat-history";

export const dynamic = "force-dynamic";

// GET /api/patient/conversations: the signed-in user's recent assistant chats.
export const GET = listHandler("PATIENT_ASSISTANT");
