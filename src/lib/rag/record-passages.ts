// Turns a person's record (or a clinician's case facts) into citable passages,
// so answers about "my results" are grounded in the record the same way answers
// about guidance are grounded in the corpus. Patients get released information
// only, and no probability (the patient UI shows tier and percentile, not a %).

import type { CaseFacts } from "@/lib/copilot";
import type { PersonRecord } from "@/lib/person-record";
import { LABS } from "@/lib/labs";

export interface RecordPassage {
  id: string;
  title: string;
  text: string;
}

const day = (iso: string) => iso.slice(0, 10);
const sourceWords = (s: string) => s.toLowerCase().replace(/_/g, " ");

export function patientRecordPassages(rec: PersonRecord, pendingReview: boolean): RecordPassage[] {
  const out: RecordPassage[] = [];
  const p = rec.profile;
  if (p) {
    const bits = [
      p.sex ? `sex ${p.sex}` : null,
      p.age !== null && p.age !== undefined ? `age ${p.age}` : null,
      p.bmi ? `BMI ${Number(p.bmi.toFixed(1))}` : null,
      p.tryingToConceive ? `trying to conceive${p.infertilityDurationMonths ? ` for ${p.infertilityDurationMonths} months` : ""}` : null,
      p.smoking ? `smoking ${p.smoking.toLowerCase()}` : null
    ].filter(Boolean);
    out.push({ id: "REC-PROFILE", title: "Your profile", text: `Your profile records ${bits.join(", ")}. These details are self-reported in your intake.` });
  }
  if (!rec.consents.LAB_RESULTS.granted) {
    out.push({ id: "REC-LABS", title: "Your lab results", text: "You have chosen not to share lab results, so none are shown or used." });
  } else {
    const byCode = new Map<string, typeof rec.labs>();
    for (const l of rec.labs) byCode.set(l.code, [...(byCode.get(l.code) ?? []), l]);
    for (const [code, points] of byCode) {
      const def = LABS[code as keyof typeof LABS];
      const sorted = [...points].sort((a, b) => b.collectedAt.localeCompare(a.collectedAt));
      const latest = sorted[0];
      const limit =
        def.lowerLimit !== undefined
          ? ` The reference limit used is ${def.lowerLimit} ${def.unit} (${def.limitSource}); this result is ${latest.value < def.lowerLimit ? "below" : "at or above"} it.`
          : "";
      const history = sorted.length > 1 ? ` Earlier results: ${sorted.slice(1, 4).map((x) => `${x.value} on ${day(x.collectedAt)}`).join(", ")}.` : "";
      out.push({
        id: `REC-${code}`,
        title: `Your ${def.label}`,
        text: `Your latest ${def.label} is ${latest.value} ${def.unit}, measured on ${day(latest.collectedAt)} (${sourceWords(latest.source)}).${limit}${history}`
      });
    }
    if (byCode.size === 0) out.push({ id: "REC-LABS", title: "Your lab results", text: "There are no lab results in your record yet." });
  }
  const released = rec.assessments.filter((a) => a.status === "RELEASED");
  const a = released[0];
  if (a) {
    const factors = (a.factors ?? [])
      .filter((f) => typeof f.shapley_value === "number" && Math.abs(f.shapley_value) > 0.02)
      .map((f) => `${f.feature} ${f.shapley_value! > 0 ? "raised" : "lowered"} it`);
    out.push({
      id: "REC-ASSESSMENT",
      title: "Your latest released assessment",
      text:
        `Your latest assessment was released by your clinician on ${day(a.reviewedAt ?? a.createdAt)} (${a.scope === "COUPLE" ? "joint, with your partner" : "individual"}). ` +
        `${a.tier ? `Its tier is ${a.tier.toLowerCase()}. ` : ""}` +
        `${a.percentile !== null ? `Your AMH is at about the ${Math.round(a.percentile)}th percentile for your age. ` : ""}` +
        `${factors.length ? `Factors: ${factors.join("; ")}. ` : ""}` +
        `${a.missingOptional.length ? `Not available for it: ${a.missingOptional.join(", ")}. ` : ""}` +
        `${a.clinicianNote ? `Your clinician's note: ${a.clinicianNote}` : ""}`
    });
  } else {
    out.push({ id: "REC-ASSESSMENT", title: "Your assessments", text: "No assessment has been released to you yet." });
  }
  if (pendingReview) out.push({ id: "REC-PENDING", title: "Assessment in review", text: "A new assessment is with your clinician for review. You will see it once they release it." });
  if (rec.options.length) {
    out.push({
      id: "REC-OPTIONS",
      title: "Your options to discuss",
      text: rec.options.slice(0, 6).map((o) => `${o.title} (rule ${o.ruleId}; ${o.source}): ${o.patientText} Why: ${o.reason}`).join(" ")
    });
  }
  const w = rec.observationsSummary;
  if (rec.consents.WEARABLES.granted && (w.temperatureReadings > 0 || w.sleepNights > 0)) {
    out.push({
      id: "REC-WEARABLES",
      title: "Your wearable data",
      text: `Your record has ${w.temperatureReadings} temperature readings and ${w.sleepNights} nights of sleep${w.meanSleepHours !== null ? `, averaging ${w.meanSleepHours} hours` : ""}. The temperature pattern is ${w.bbtStatus.toLowerCase().replace(/_/g, " ")}.`
    });
  }
  return out;
}

export function casePassages(facts: CaseFacts): RecordPassage[] {
  const out: RecordPassage[] = [];
  facts.members.forEach((m, i) => {
    const n = i + 1;
    const head = `${m.name} (${m.sex ?? "sex not recorded"}, age ${m.age ?? "not recorded"})`;
    if (!m.sharesWithClinician) {
      out.push({ id: `CASE-M${n}`, title: m.name, text: `${head} has not given care-team access, so their results are hidden.` });
      return;
    }
    const intake = m.intake as Record<string, unknown> | undefined;
    out.push({
      id: `CASE-M${n}`,
      title: m.name,
      text: `${head}. Intake (self-reported): trying to conceive ${intake?.tryingToConceive ? `yes, ${intake?.monthsTrying ?? "unknown"} months` : "no"}; cycle ${intake?.cyclePattern ?? "not recorded"}; BMI ${intake?.bmi ?? "not recorded"}; smoking ${intake?.smoking ?? "not recorded"}; history ${(intake?.history as string[] | undefined)?.join(", ") || "none recorded"}.`
    });
    if (m.labs?.length) {
      out.push({
        id: `CASE-M${n}-LABS`,
        title: `${m.name}: labs`,
        text: m.labs.map((l) => `${l.marker} ${l.value} ${l.unit} on ${l.date} (${sourceWords(l.source)})${l.belowReference ? ", below reference" : ""}`).join("; ") + "."
      });
    } else {
      out.push({ id: `CASE-M${n}-LABS`, title: `${m.name}: labs`, text: `${m.name} has no lab results in the record.` });
    }
    if (m.triggeredRules?.length) {
      out.push({
        id: `CASE-M${n}-RULES`,
        title: `${m.name}: triggered rules`,
        text: m.triggeredRules.map((r) => `Rule ${r.id}, ${r.title}: ${r.reason} (${r.source})`).join(" ")
      });
    }
  });
  facts.assessments.slice(0, 3).forEach((a, i) => {
    out.push({
      id: `CASE-A${i + 1}`,
      title: `${i === 0 ? "most recent " : ""}${a.scope.toLowerCase()} assessment, ${a.status.toLowerCase()}`,
      text:
        `${i === 0 ? "Most recent assessment. " : "Earlier assessment. "}${a.scope} assessment dated ${a.date}, status ${a.status}. Model estimate (prototype, not clinically validated) ${a.estimatePercent}% with 95% interval ${a.interval95[0] ?? "?"}–${a.interval95[1] ?? "?"}%. ` +
        `Tier ${a.tier ?? "none"}. Completeness ${a.completeness !== null ? Math.round(a.completeness * 100) + "%" : "not recorded"}. ` +
        `${a.missingOptional.length ? `Missing optional inputs: ${a.missingOptional.join(", ")}. ` : ""}` +
        `${a.amhPercentile !== null ? `AMH percentile for age ${Math.round(a.amhPercentile)}. ` : ""}` +
        `Factors: ${a.factors.map((f) => `${f.factor} ${(f.shapleyValue ?? 0) >= 0 ? "raised" : "lowered"} the estimate`).join("; ")}. ` +
        `${a.clinicianNote ? `Clinician note: ${a.clinicianNote}` : "No clinician note yet."}`
    });
  });
  return out;
}
