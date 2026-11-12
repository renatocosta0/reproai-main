import { itemHandlers } from "@/lib/chat-history";

export const dynamic = "force-dynamic";

// GET /api/clinician/conversations/:id: reopen one chat with its stored grounded answers.
// DELETE /api/clinician/conversations/:id: delete it (audit-logged).
const handlers = itemHandlers("CLINICIAN_COPILOT");
export const GET = handlers.GET;
export const DELETE = handlers.DELETE;
