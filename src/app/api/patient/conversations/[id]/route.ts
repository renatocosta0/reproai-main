import { itemHandlers } from "@/lib/chat-history";

export const dynamic = "force-dynamic";

// GET /api/patient/conversations/:id: reopen one chat with its stored grounded answers.
// DELETE /api/patient/conversations/:id: delete it (audit-logged).
const handlers = itemHandlers("PATIENT_ASSISTANT");
export const GET = handlers.GET;
export const DELETE = handlers.DELETE;
