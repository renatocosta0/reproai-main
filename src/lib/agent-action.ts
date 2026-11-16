// Governed agent action: turns one case's facts into a concrete, auditable
// workflow step — observe (record + triggered rules), reason (why this action
// now), act (open a FollowUp triage card), human-in-the-loop (nothing is
// written until the clinician approves; proposal, approval and dismissal are
// all audit-logged).
//
// The proposal is deterministic (record + cited rules, no LLM), so it is
// reproducible in a live demo; the LLM copilot explains the case, this takes
// the action.

import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { buildCaseFacts } from "@/lib/copilot";

export interface ProposedRule {
  id: string;
  title: string;
  reason: string;
  source: string;
}

export interface AgentProposal {
  caseId: string;
  title: string;
  /** What the agent observed and why it is proposing to act now. */
  rationale: string[];
  rules: ProposedRule[];
  /** Plain-language note the clinician can edit and release to the patient. */
  draftNote: string;
  nextStep: string;
}

/** The fallback "no triggers met" option — never a reason to act. */
const NO_TRIGGER = "OPT-GENERAL";

function nextStepFor(rules: ProposedRule[]): string {
  const ids = new Set(rules.map((r) => r.id));
  if (ids.has("RES-LOW") || ids.has("RF-CYCLE") || ids.has("RF-HISTORY")) return "specialist counselling within 14 days";
  if (ids.has("PRES-DISCUSS")) return "a preservation discussion while the window is open";
  if (ids.has("REF-12M") || ids.has("REF-6M-35") || ids.has("REF-40")) return "fertility specialist referral";
  if (ids.has("SEM-LOW") || ids.has("TEST-SEMEN")) return "repeat semen analysis and andrology review";
  if (ids.has("TEST-AMH")) return "confirm ovarian reserve testing";
  if (ids.has("BBT-MONO")) return "review of the temperature pattern";
  return "a counselling follow-up";
}

/**
 * Build the proposal for one case from persisted facts only. Returns null when
 * there is nothing to act on (no triggered rules and no draft assessment), so
 * the assistant can say so honestly instead of inventing work.
 */
export async function buildProposal(caseId: string): Promise<AgentProposal | null> {
  const facts = await buildCaseFacts(caseId);
  if (!facts) return null;

  const seen = new Map<string, ProposedRule>();
  const rationale: string[] = [];

  for (const m of facts.members) {
    if (!m.sharesWithClinician) {
      rationale.push(`${m.name}: clinician access is not shared, so nothing is proposed for this member.`);
      continue;
    }
    for (const r of m.triggeredRules ?? []) {
      if (r.id === NO_TRIGGER) continue;
      if (!seen.has(r.id)) {
        seen.set(r.id, r);
        rationale.push(`${m.name}: ${r.title} — ${r.reason} (rule ${r.id}; ${r.source})`);
      }
    }
    for (const l of (m.labs ?? []).filter((x) => x.belowReference)) {
      rationale.push(`${m.name}: ${l.marker} ${l.value} ${l.unit} (${l.date}, ${l.source}) is below the reference limit.`);
    }
  }

  const latest = [...facts.assessments].sort((a, b) => b.date.localeCompare(a.date))[0];
  if (latest) {
    rationale.push(
      `Latest assessment is ${latest.status.toLowerCase()} from ${latest.date} — tier ${latest.tier ?? "none"}, completeness ${
        latest.completeness !== null ? `${Math.round(latest.completeness * 100)}%` : "unknown"
      }${latest.missingOptional.length ? `, missing ${latest.missingOptional.join(", ")}` : ""}.`
    );
  }

  const rules = [...seen.values()];
  if (rules.length === 0 && latest?.status !== "DRAFT") return null;

  const nextStep = nextStepFor(rules);
  const ids = rules.map((r) => r.id);
  const summary = rules.length > 0 ? rules.map((r) => r.title).join("; ") : "your latest assessment is awaiting review";
  const date = new Date().toISOString().slice(0, 10);
  const draftNote =
    `Reviewed ${date}. ${summary}. The next step we suggest is ${nextStep}. ` +
    `Please book a counselling appointment so we can discuss this together — this summary is not a diagnosis.`;

  return {
    caseId,
    title: rules.length > 0 ? `Open a follow-up triage card (${ids.slice(0, 3).join(", ")})` : "Open a follow-up for the draft assessment",
    rationale,
    rules,
    draftNote,
    nextStep
  };
}

/**
 * APPROVE: rebuild the proposal server-side (the client cannot smuggle in its
 * own text), open the FollowUp triage card, and audit the approval. Returns
 * null when there is nothing to approve.
 */
export async function approveProposal(caseId: string, actorId: string) {
  const proposal = await buildProposal(caseId);
  if (!proposal) return null;
  const ids = proposal.rules.map((r) => r.id).join(", ") || "draft review";
  const item = await prisma.followUp.create({
    data: { coupleId: caseId, note: `[Agent proposal approved] ${ids}. ${proposal.draftNote}` }
  });
  await audit(actorId, "agent_action_approved", `follow_up:${item.id}:couple:${caseId}`);
  return { item, proposal };
}
