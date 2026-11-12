// Clinical copilot support: builds the fact sheet for one case, the system
// prompt, a number-verification check on the LLM's reply, and a labelled
// scripted fallback. Mirrors the reference-demo rule: numbers come from tools
// and the record; the LLM only explains.

import { prisma } from "@/lib/db";
import { loadPersonRecord } from "@/lib/person-record";
import { LABS } from "@/lib/labs";

export interface CaseFacts {
  caseId: string;
  members: {
    name: string;
    sex: string | null;
    age: number | null;
    sharesWithClinician: boolean;
    intake?: Record<string, unknown>;
    labs?: { marker: string; value: number; unit: string; date: string; source: string; belowReference: boolean }[];
    triggeredRules?: { id: string; title: string; reason: string; source: string }[];
  }[];
  assessments: {
    scope: string;
    status: string;
    date: string;
    estimatePercent: number;
    interval95: [number | null, number | null];
    tier: string | null;
    completeness: number | null;
    missingOptional: string[];
    amhPercentile: number | null;
    factors: { factor: string; shapleyValue: number | undefined }[];
    clinicianNote: string | null;
  }[];
}

export async function buildCaseFacts(caseId: string): Promise<CaseFacts | null> {
  const users = await prisma.user.findMany({ where: { coupleId: caseId, role: "PATIENT" } });
  if (users.length === 0) return null;
  const records = await Promise.all(users.map((u) => loadPersonRecord(u.id, "CLINICIAN")));
  const assessmentsById = new Map<string, CaseFacts["assessments"][number]>();

  const members = records.filter(Boolean).map((r) => {
    const rec = r!;
    const shares = rec.consents.CLINICIAN_ACCESS.granted;
    const base = { name: rec.profile?.name ?? rec.email, sex: rec.profile?.sex ?? null, age: rec.profile?.age ?? null, sharesWithClinician: shares };
    if (!shares) return base;
    for (const a of rec.assessments) {
      assessmentsById.set(a.id, {
        scope: a.scope,
        status: a.status,
        date: a.createdAt.slice(0, 10),
        estimatePercent: a.probability,
        interval95: [a.confidenceLow, a.confidenceHigh],
        tier: a.tier,
        completeness: a.completeness,
        missingOptional: a.missingOptional,
        amhPercentile: a.percentile,
        factors: (a.factors ?? []).map((f) => ({ factor: f.feature, shapleyValue: f.shapley_value })),
        clinicianNote: a.clinicianNote
      });
    }
    return {
      ...base,
      intake: rec.profile
        ? {
            tryingToConceive: rec.profile.tryingToConceive,
            monthsTrying: rec.profile.infertilityDurationMonths,
            cyclePattern: rec.profile.cycleRegularity,
            bmi: rec.profile.bmi,
            smoking: rec.profile.smoking,
            history: rec.profile.historyFlags ? JSON.parse(rec.profile.historyFlags) : [],
            source: "self-reported"
          }
        : undefined,
      labs: rec.labs.map((l) => ({
        marker: LABS[l.code].label,
        value: l.value,
        unit: l.unit,
        date: l.collectedAt.slice(0, 10),
        source: l.source,
        belowReference: LABS[l.code].lowerLimit !== undefined && l.value < LABS[l.code].lowerLimit!
      })),
      triggeredRules: rec.options.map((o) => ({ id: o.ruleId, title: o.title, reason: o.reason, source: o.source }))
    };
  });

  return { caseId, members, assessments: [...assessmentsById.values()] };
}

export function copilotSystemPrompt(facts: CaseFacts | null): string {
  return `You are ReproAI's clinical copilot for licensed fertility clinicians in Abu Dhabi.

Rules you must follow:
1. Every number you state must come from CASE FACTS below or from a tool result. Never calculate, estimate or invent a probability, percentile, threshold or statistic. If a number is not available, say it is not in the record.
2. You explain and summarise; you do not diagnose or prescribe. Decisions remain with the clinician.
3. Cite where each point comes from: a lab result (with its source and date), a rule ID such as REF-12M with its guideline source, or the search_guidelines tool.
4. Point out missing data and how it limits interpretation.
5. Be concise and clinical. Use short paragraphs or bullets. End with a line starting "Sources:".
6. If asked for medication doses or anything outside reproductive-potential assessment, say this is outside the copilot's intended use.
7. Describe any estimate only as "model estimate (prototype, not clinically validated)" with its 95% interval. Do not attach an outcome or time horizon (such as "chance of conception within 12 months") that is not stated in CASE FACTS.
8. Describe factor effects in words ("raised the estimate", "lowered the estimate"), using the sign of shapleyValue: positive raised it, negative lowered it. Quote Shapley values only if asked.
9. Cite in plain text, for example "(record: AMH, 8 Oct, clinician verified)" or "(rule REF-12M; WHO 2025)". Do not use bracketed reference markers.

${facts ? `CASE FACTS (from the record; JSON):\n${JSON.stringify(facts, null, 1)}` : "No case is selected. Answer general questions using search_guidelines, and do not state patient-specific numbers."}`;
}

/** Numbers in the reply that do not appear in the facts (years and short list numbers are allowed). */
export function unverifiedNumbers(reply: string, facts: CaseFacts | null): string[] {
  const allowed = new Set<string>();
  const add = (v: unknown) => {
    if (typeof v === "number" && Number.isFinite(v)) {
      // Signs are dropped when numbers are extracted from text, so compare magnitudes.
      for (const d of [0, 1, 2, 3]) allowed.add(String(Math.abs(Number(v.toFixed(d)))));
      if (Math.abs(v) <= 1) for (const d of [0, 1]) allowed.add(String(Math.abs(Number((v * 100).toFixed(d))))); // completeness as %
    } else if (typeof v === "string") {
      for (const m of v.match(/\d+(?:\.\d+)?/g) ?? []) allowed.add(String(Number(m)));
    } else if (Array.isArray(v)) v.forEach(add);
    else if (v && typeof v === "object") Object.values(v).forEach(add);
  };
  add(facts);
  // Reference limits used by the rules are part of the cited guidance.
  Object.values(LABS).forEach((l) => l.lowerLimit !== undefined && allowed.add(String(l.lowerLimit)));
  ["12", "6", "35", "40", "38", "25", "30", "95", "7", "19", "47", "18", "2", "5", "1", "3", "4"].forEach((x) => allowed.add(x));
  const found = reply.match(/\d+(?:\.\d+)?/g) ?? [];
  return Array.from(
    new Set(found.filter((x) => !/^(19|20)\d{2}$/.test(x) && !allowed.has(String(Number(x)))))
  );
}

/** Deterministic, labelled summary used when the LLM is unavailable. */
export function scriptedSummary(facts: CaseFacts | null): string {
  if (!facts) return "The AI service is unavailable. Select a case to see a scripted summary of its record.";
  const lines: string[] = ["Scripted summary (the AI service is unavailable; this text is generated by a template from the record):", ""];
  for (const m of facts.members) {
    lines.push(`• ${m.name} (${m.sex ?? "sex not recorded"}, ${m.age ?? "age not recorded"})${m.sharesWithClinician ? "" : ": has not shared their record."}`);
    for (const l of m.labs ?? []) lines.push(`  – ${l.marker}: ${l.value} ${l.unit} on ${l.date} (${l.source.toLowerCase().replace("_", " ")})${l.belowReference ? ", below reference" : ""}`);
    for (const r of m.triggeredRules ?? []) lines.push(`  – Rule ${r.id}: ${r.title}. ${r.reason} [${r.source}]`);
  }
  const latest = facts.assessments[0];
  if (latest) {
    lines.push("", `Latest ${latest.scope.toLowerCase()} assessment (${latest.status.toLowerCase()}, ${latest.date}): ${latest.estimatePercent}% (95% ${latest.interval95[0]}–${latest.interval95[1]}), completeness ${Math.round((latest.completeness ?? 0) * 100)}%.`);
  }
  lines.push("", "Sources: ReproAI record; rules engine (src/lib/pathways.ts).");
  return lines.join("\n");
}
