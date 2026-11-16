import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { canAccessCase } from "@/lib/clinician-scope";
import { approveProposal, buildProposal } from "@/lib/agent-action";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

// POST /api/clinician/actions { caseId, action: "PROPOSE" | "APPROVE" | "DISMISS" }
// The governed agent action. PROPOSE observes the record and reasons to a
// concrete proposal (deterministic, cited rules). APPROVE takes the action —
// it opens a FollowUp triage card — only on explicit clinician confirmation,
// and rebuilds the proposal server-side so the client cannot supply its own
// text. DISMISS rejects it. Nothing is written without APPROVE, and every
// step lands in the AuditLog.
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "CLINICIAN") {
      return NextResponse.json({ error: "Clinician access required" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const caseId = typeof body?.caseId === "string" ? body.caseId : "";
    const action = body?.action;
    if (!caseId || !["PROPOSE", "APPROVE", "DISMISS"].includes(action)) {
      return NextResponse.json({ error: "caseId and action (PROPOSE | APPROVE | DISMISS) are required" }, { status: 400 });
    }
    if (!(await canAccessCase(session.userId, caseId))) {
      return NextResponse.json({ error: "This case is not in your care list" }, { status: 403 });
    }

    if (action === "PROPOSE") {
      const proposal = await buildProposal(caseId);
      if (!proposal) return NextResponse.json({ proposal: null });
      const ids = proposal.rules.map((r) => r.id).join("+") || "none";
      await audit(session.userId, "agent_proposal_created", `couple:${caseId};rules:${ids}`);
      return NextResponse.json({ proposal });
    }

    if (action === "APPROVE") {
      const result = await approveProposal(caseId, session.userId);
      if (!result) {
        return NextResponse.json({ error: "There is no action to approve for this case." }, { status: 409 });
      }
      return NextResponse.json({ followUp: result.item, proposal: result.proposal }, { status: 201 });
    }

    await audit(session.userId, "agent_action_dismissed", `couple:${caseId}`);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[POST /api/clinician/actions] error:", error);
    return NextResponse.json({ error: error?.message ?? "Agent action failed" }, { status: 500 });
  }
}
