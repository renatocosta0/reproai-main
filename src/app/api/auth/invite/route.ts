import { NextRequest, NextResponse } from "next/server";
import { resolveInviteToken } from "@/lib/invites";

// GET /api/auth/invite?token=... — read-only check used by the register page.
// Does not consume the token. Returns only what the invitee needs to see.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  try {
    const invite = await resolveInviteToken(token);
    if (!invite) {
      return NextResponse.json({ valid: false }, { status: 404 });
    }
    if (invite.kind === "CLINIC") {
      return NextResponse.json({
        valid: true,
        kind: invite.kind,
        scope: invite.scope,
        email: invite.allowedEmails[0] ?? null,
        name: invite.name,
        sex: invite.sex
      });
    }
    return NextResponse.json({
      valid: true,
      kind: invite.kind,
      email: invite.allowedEmails[0] ?? null,
      senderName: invite.senderName
    });
  } catch (error: any) {
    console.error("[GET /api/auth/invite] error:", error);
    return NextResponse.json({ valid: false, error: "Could not verify invitation" }, { status: 500 });
  }
}
