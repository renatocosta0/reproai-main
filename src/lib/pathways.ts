// Deterministic, cited pathway rules: turn what is known about a person into
// timely, personalised options (Challenge 02, requirement R3). No machine
// learning and no LLM: every option names the rule that produced it and its
// source. Options are suggestions to discuss, never prescriptions.

import { isBelowLimit, LABS, latestByCode, THIQA, type LabCode, type LabPoint } from "@/lib/labs";
import { optionArabic, type OptionAr } from "@/lib/pathways-ar";

export type OptionKind = "RED_FLAG" | "REFER" | "TEST" | "PRESERVATION" | "COUNSEL" | "OPTIMISE";

export interface PathwayOption {
  ruleId: string;
  kind: OptionKind;
  /** 1 = act soon, 2 = worth arranging, 3 = good practice */
  priority: 1 | 2 | 3;
  title: string;
  patientText: string;
  clinicianText: string;
  reason: string;
  source: string;
  /** Arabic patient wording (prototype translation). */
  ar?: OptionAr | null;
}

export interface PathwayContext {
  sex: "female" | "male" | null;
  age: number | null;
  bmi: number | null;
  isPaired: boolean;
  tryingToConceive: boolean | null;
  monthsTrying: number | null;
  cycleRegularity: string | null; // REGULAR | IRREGULAR | AMENORRHEA
  historyFlags: string[];
  familyEarlyMenopause: boolean | null;
  smoking: string | null; // NEVER | FORMER | CURRENT
  preservationIntent: boolean | null;
  labs: LabPoint[];
  amhPercentile: number | null;
  meanSleepHours: number | null;
  bbtMonophasic: boolean;
}

const WHO25 = "WHO guideline on infertility (2025)";
const ESHRE = "ESHRE female fertility preservation guideline (2020)";
const WHO_SEMEN = "WHO semen manual (2021)";

export const INTENDED_USE =
  "These options are for discussion with a qualified clinician. ReproAI does not diagnose, prescribe or replace clinical judgement.";

export function evaluatePathways(c: PathwayContext): PathwayOption[] {
  const out: PathwayOption[] = [];
  const latest = latestByCode(c.labs);
  const has = (code: LabCode) => latest[code] !== undefined;
  const v = (code: LabCode) => latest[code]?.value;
  const female = c.sex === "female";
  const male = c.sex === "male";
  const trying = c.tryingToConceive === true || (c.monthsTrying ?? 0) > 0;
  const months = c.monthsTrying ?? 0;
  const age = c.age;

  // ── Red flags: earlier specialist review regardless of time trying ─────────
  if (female && (c.cycleRegularity === "AMENORRHEA" || c.cycleRegularity === "IRREGULAR")) {
    out.push({
      ruleId: "RF-CYCLE",
      kind: "RED_FLAG",
      priority: 1,
      title: c.cycleRegularity === "AMENORRHEA" ? "Absent periods should be checked" : "Irregular cycles are worth checking",
      patientText:
        "Periods that are irregular or absent can have treatable causes, such as thyroid or hormonal conditions. It is worth seeing a doctor rather than waiting.",
      clinicianText: "Oligo/amenorrhoea: assess for anovulation (PCOS, thyroid, prolactin) without waiting 12 months.",
      reason: `Cycle pattern reported as ${c.cycleRegularity.toLowerCase()}.`,
      source: `${THIQA}: oligo/amenorrhoea; ${WHO25}`
    });
  }
  const riskHistory = c.historyFlags.filter((f) =>
    ["CHEMOTHERAPY", "PELVIC_INFECTION", "PELVIC_SURGERY", "ENDOMETRIOSIS", "GENETIC_DISORDER", "UNDESCENDED_TESTIS"].includes(f)
  );
  if (riskHistory.length > 0) {
    out.push({
      ruleId: "RF-HISTORY",
      kind: "RED_FLAG",
      priority: trying ? 1 : 2,
      title: "Your history means earlier advice may help",
      patientText:
        "Some past conditions or treatments can affect fertility. A specialist can advise you earlier, even if you are not planning a pregnancy yet.",
      clinicianText: `Risk history: ${riskHistory.join(", ").toLowerCase().replace(/_/g, " ")}. Consider early fertility assessment.`,
      reason: "Medical history reported in your intake.",
      source: `${THIQA}: indications for earlier assessment`
    });
  }

  // ── Referral by time trying (WHO / Thiqa) ──────────────────────────────────
  if (trying && months >= 12) {
    out.push({
      ruleId: "REF-12M",
      kind: "REFER",
      priority: 1,
      title: "See a fertility specialist",
      patientText:
        "After a year of trying without a pregnancy, a fertility assessment is recommended for both partners. This is common and many causes are treatable.",
      clinicianText: "≥ 12 months trying: refer couple for fertility assessment (both partners).",
      reason: `Trying for ${months} months.`,
      source: WHO25
    });
  } else if (trying && female && age !== null && age > 35 && months >= 6) {
    out.push({
      ruleId: "REF-6M-35",
      kind: "REFER",
      priority: 1,
      title: "See a fertility specialist now rather than later",
      patientText:
        "Over 35, doctors recommend an assessment after six months of trying, because time matters more for treatment options.",
      clinicianText: "Female age > 35 and ≥ 6 months trying: refer.",
      reason: `Age ${age}, trying for ${months} months.`,
      source: `${THIQA}; ${WHO25}`
    });
  } else if (trying && female && age !== null && age >= 40) {
    out.push({
      ruleId: "REF-40",
      kind: "REFER",
      priority: 1,
      title: "Arrange a specialist review promptly",
      patientText: "From 40, an early specialist review is advised when trying to conceive.",
      clinicianText: "Female age ≥ 40 trying to conceive: prompt referral.",
      reason: `Age ${age}.`,
      source: WHO25
    });
  }

  // ── Ovarian reserve ────────────────────────────────────────────────────────
  const amh = v("AMH");
  const afc = v("AFC");
  const lowReserve = (amh !== undefined && isBelowLimit("AMH", amh)) || (afc !== undefined && isBelowLimit("AFC", afc));
  if (female && lowReserve) {
    out.push({
      ruleId: "RES-LOW",
      kind: "REFER",
      priority: 1,
      title: "Discuss your ovarian reserve result with a specialist",
      patientText:
        "Your result is below the range used to define a typical egg reserve. It does not mean you cannot conceive, but it can mean you have less time to plan, so a specialist conversation is worthwhile.",
      clinicianText: `Reduced ovarian reserve (AMH ${amh ?? "–"} ng/mL, AFC ${afc ?? "–"}; threshold AMH < 1.1 or AFC < 5–7).`,
      reason: "Latest AMH or antral follicle count is below the reference limit.",
      source: `${THIQA}; POSEIDON/Bologna criteria`
    });
  }
  if (female && !has("AMH") && age !== null && (age >= 30 || c.familyEarlyMenopause)) {
    out.push({
      ruleId: "TEST-AMH",
      kind: "TEST",
      priority: c.familyEarlyMenopause || (age !== null && age >= 35) ? 1 : 2,
      title: "Consider an ovarian reserve test (AMH)",
      patientText:
        "An AMH blood test, sometimes with an ultrasound, gives a picture of your egg reserve for your age. It helps you plan, but it does not predict whether you can get pregnant naturally.",
      clinicianText: "No AMH on record. Offer ovarian reserve testing (AMH ± AFC) with counselling on interpretation.",
      reason: c.familyEarlyMenopause ? "Family history of early menopause." : `Age ${age} with no ovarian reserve result on record.`,
      source: `${ESHRE}; ${WHO25}`
    });
  }

  // ── Fertility preservation discussion ─────────────────────────────────────
  if (female && !trying && age !== null && age >= 25 && age <= 38 &&
      (c.preservationIntent || lowReserve || (c.amhPercentile !== null && c.amhPercentile < 25) || c.historyFlags.includes("CHEMOTHERAPY"))) {
    out.push({
      ruleId: "PRES-DISCUSS",
      kind: "PRESERVATION",
      priority: lowReserve || (age >= 35) ? 1 : 2,
      title: "Talk through egg freezing, if it matters to you",
      patientText:
        "Egg freezing tends to work better at younger ages. In Abu Dhabi, Thiqa covers social egg freezing for eligible single members: up to two cycles in a lifetime, storage for five years, and a psychological assessment beforehand. A specialist can tell you whether it suits your situation.",
      clinicianText: "Preservation discussion indicated (intent, reserve or age). Thiqa social egg freezing: max 2 cycles lifetime, 5-year storage, mandatory psychological assessment.",
      reason: c.preservationIntent ? "You said you are considering it." : lowReserve ? "Reserve is below the reference range." : "Reserve is in the lower part of the range for your age.",
      source: `${ESHRE}; ${THIQA}: social egg freezing`
    });
  }

  // ── Semen analysis ─────────────────────────────────────────────────────────
  const semenCodes: LabCode[] = ["SPERM_CONCENTRATION", "SPERM_TOTAL_MOTILITY", "SPERM_PROGRESSIVE_MOTILITY", "SPERM_MORPHOLOGY", "SEMEN_VOLUME"];
  const lowSemen = semenCodes.filter((code) => v(code) !== undefined && isBelowLimit(code, v(code)!));
  if (male && lowSemen.length > 0) {
    out.push({
      ruleId: "SEM-LOW",
      kind: "REFER",
      priority: 1,
      title: "Repeat the semen analysis and see a specialist",
      patientText:
        "One or more results are below the reference range. Results vary from test to test, so a repeat test is the first step, and an andrology or urology review can find treatable causes.",
      clinicianText: `Below reference: ${lowSemen.map((c2) => `${LABS[c2].label} ${v(c2)} ${LABS[c2].unit}`).join("; ")}. Repeat analysis; andrology/urology referral.`,
      reason: "Latest semen analysis has values below the reference limits.",
      source: `${WHO_SEMEN}; ${THIQA}`
    });
  }
  if (male && !has("SPERM_CONCENTRATION") && (trying || c.isPaired || riskHistory.length > 0)) {
    out.push({
      ruleId: "TEST-SEMEN",
      kind: "TEST",
      priority: trying && months >= 6 ? 1 : 2,
      title: "Consider a semen analysis",
      patientText:
        "A semen analysis is a simple, private test. Male factors are involved in about half of couples who have difficulty conceiving, and they are often found late.",
      clinicianText: "No semen analysis on record. Offer analysis per WHO laboratory manual.",
      reason: trying ? "Trying to conceive with no semen analysis on record." : "Paired or relevant history, with no semen analysis on record.",
      source: `${WHO25}; ${WHO_SEMEN}`
    });
  }

  // ── Counselling ────────────────────────────────────────────────────────────
  if (c.bbtMonophasic) {
    out.push({
      ruleId: "BBT-MONO",
      kind: "COUNSEL",
      priority: 2,
      title: "Ask your clinician about your temperature pattern",
      patientText:
        "Your temperature readings have not shown the usual rise after ovulation yet. This varies between cycles and is not a diagnosis, but it is worth reviewing with your clinician.",
      clinicianText: "Monophasic BBT pattern: consider ovulation confirmation (mid-luteal progesterone).",
      reason: "No sustained temperature rise across your recent readings.",
      source: WHO25
    });
  }
  if (trying || c.isPaired) {
    out.push({
      ruleId: "PRECON",
      kind: "COUNSEL",
      priority: 3,
      title: "Preconception check-up",
      patientText:
        "A preconception visit covers folic acid, vaccinations, medicines and any long-term conditions, for both partners.",
      clinicianText: "Offer preconception counselling to both partners.",
      reason: trying ? "You are trying to conceive." : "You are linked with a partner.",
      source: WHO25
    });
  }
  if (c.bmi !== null && c.bmi >= 35 && c.bmi <= 40) {
    out.push({
      ruleId: "BMI-35-40",
      kind: "COUNSEL",
      priority: 2,
      title: "Weight support before any fertility treatment",
      patientText:
        "Before fertility treatment, a dietitian programme of at least three months is recommended at this weight, because it improves the chances of treatment working.",
      clinicianText: "BMI 35–40: counsel on risks; dietitian referral ≥ 3 months before treatment (Thiqa).",
      reason: `BMI ${c.bmi.toFixed(1)}.`,
      source: THIQA
    });
  } else if (c.bmi !== null && (c.bmi > 40 || c.bmi < 19)) {
    out.push({
      ruleId: "BMI-OUT",
      kind: "COUNSEL",
      priority: 2,
      title: "Talk to a doctor about weight and fertility",
      patientText: "Your BMI is outside the range usually needed before fertility treatment. A doctor or dietitian can help you plan.",
      clinicianText: "BMI outside Thiqa ART eligibility range (19–40).",
      reason: `BMI ${c.bmi.toFixed(1)}.`,
      source: THIQA
    });
  }

  // ── Health optimisation (modifiable factors) ───────────────────────────────
  if (c.smoking === "CURRENT") {
    out.push({
      ruleId: "OPT-SMOKING",
      kind: "OPTIMISE",
      priority: 2,
      title: "Stopping smoking helps fertility",
      patientText: "Smoking lowers fertility in both women and men. Free stop-smoking support is available through primary care.",
      clinicianText: "Current smoker: offer cessation support.",
      reason: "You reported that you smoke.",
      source: WHO25
    });
  }
  if (c.bmi !== null && c.bmi >= 25 && c.bmi < 35) {
    out.push({
      ruleId: "OPT-WEIGHT",
      kind: "OPTIMISE",
      priority: 3,
      title: "A healthy weight range supports fertility",
      patientText: "Moving towards a BMI of 20–25 supports regular ovulation and sperm health. Small, steady changes count.",
      clinicianText: "BMI 25–35: lifestyle advice.",
      reason: `BMI ${c.bmi.toFixed(1)}.`,
      source: WHO25
    });
  }
  if (c.meanSleepHours !== null && c.meanSleepHours < 7) {
    out.push({
      ruleId: "OPT-SLEEP",
      kind: "OPTIMISE",
      priority: 3,
      title: "Aim for seven or more hours of sleep",
      patientText: "Regular, sufficient sleep supports the hormones involved in fertility.",
      clinicianText: `Mean sleep ${c.meanSleepHours.toFixed(1)} h.`,
      reason: `Your average sleep is ${c.meanSleepHours.toFixed(1)} hours.`,
      source: "Reproductive health and sleep evidence review (ASRM 2023)"
    });
  }
  if (out.length === 0) {
    out.push({
      ruleId: "OPT-GENERAL",
      kind: "OPTIMISE",
      priority: 3,
      title: "Keep building your picture",
      patientText:
        "Nothing needs action right now. Keeping your information up to date helps you and your clinician see changes early.",
      clinicianText: "No triggers met.",
      reason: "No rule was triggered by your current information.",
      source: WHO25
    });
  }

  return out.map((o) => ({ ...o, ar: optionArabic(o.ruleId, c) })).sort((a, b) => a.priority - b.priority);
}
