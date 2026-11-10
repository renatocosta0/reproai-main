import { NextRequest, NextResponse } from "next/server";
import { POST as unifiedInvitePost } from "../invite/route";

// Backwards-compatible route for legacy callers of POST /api/clinician/invite-couple.
// Forwards directly to the unified clinician invitation handler supporting both Individual and Couple scopes.
export async function POST(req: NextRequest) {
  return unifiedInvitePost(req);
}
