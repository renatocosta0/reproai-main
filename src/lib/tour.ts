// Guided judge tour: a scripted path through the prototype, modelled on the
// reference demo's "Play ready demo". Each step names what it demonstrates and
// which part of the Challenge 02 brief (R1–R6) or judging criterion it serves.

export type TourPersona = "CLINICIAN" | "FEMALE" | "MALE" | "COUPLE";

export interface TourStep {
  title: string;
  persona: TourPersona;
  href: string;
  look: string;
  serves: string;
  locale?: "en" | "ar";
}

export const TOUR: TourStep[] = [
  {
    title: "The clinician's panel",
    persona: "CLINICIAN",
    href: "/clinician/dashboard",
    look: "A clinician sees only the people they prescribed. Note the couples and individuals tabs and the open alert.",
    serves: "R4 clinician usefulness · Responsible AI (access control)"
  },
  {
    title: "Who would benefit from earlier advice",
    persona: "CLINICIAN",
    href: "/clinician/insights",
    look: "Groups found by the same cited rules patients see. Open a group to see who is in it; the service-wide table is anonymous and suppresses small cells.",
    serves: "R4 population-level insight · R5 privacy"
  },
  {
    title: "A record with provenance, and a draft to sign off",
    persona: "CLINICIAN",
    href: "/clinician/patient/demo-couple",
    look: "Every lab shows its source and date. Rules show IDs and sources. Scroll to 'Awaiting your review': inputs, result, factors, then your note before release.",
    serves: "R2 evidence and uncertainty · Responsible AI (human sign-off)"
  },
  {
    title: "Missing data stops the assessment",
    persona: "CLINICIAN",
    href: "/clinician/patient/demo-missing",
    look: "Layla has no AMH result yet. Press 'Run individual assessment': the system names what is missing and produces no estimate. Nothing is guessed.",
    serves: "R2 missing data · Responsible AI (no false certainty)"
  },
  {
    title: "No consent, no access",
    persona: "CLINICIAN",
    href: "/clinician/patient/demo-noconsent",
    look: "Omar withdrew care-team access, so his results are hidden from the clinician and assessments are blocked until he changes his mind.",
    serves: "R5 granular, revocable consent"
  },
  {
    title: "A copilot that explains, never invents",
    persona: "CLINICIAN",
    href: "/clinician/assistant?case=demo-couple",
    look: "Ask for a consultation summary. Numbers come only from the record; each reply is checked and flagged if a number is not found. If the AI is down, a labelled scripted summary appears.",
    serves: "Technical depth · Responsible AI (tool-grounded LLM)"
  },
  {
    title: "Evidence of earlier action",
    persona: "CLINICIAN",
    href: "/clinician/evidence",
    look: "Live panel measures with intervals, then a labelled simulation: false reassurance of the reserve rule and calibration against an independent curve.",
    serves: "R6 evidence, calibration and false reassurance"
  },
  {
    title: "A trajectory, not a score",
    persona: "FEMALE",
    href: "/patient/assessment",
    look: "Reem sees her AMH over time against the reference limit, a plain tier and percentile, her clinician's note, cited options and an illustrative what-if. No probability.",
    serves: "R1 longitudinal view · R2 plain language · R3 options"
  },
  {
    title: "The same view in Arabic",
    persona: "FEMALE",
    href: "/patient/assessment",
    locale: "ar",
    look: "Right-to-left layout with Arabic headings, options, tiers and consent text. Clinician notes keep the language they were written in.",
    serves: "Cultural fit · accessibility"
  },
  {
    title: "Male reproductive health",
    persona: "MALE",
    href: "/patient/assessment",
    look: "Khalid's semen parameters against WHO reference limits over two tests, with referral and lifestyle options and their sources.",
    serves: "R1 · R3 · male-factor pathway"
  },
  {
    title: "A couple, waiting for review",
    persona: "COUPLE",
    href: "/patient/assessment",
    look: "Nadia sees that a new joint assessment is with her clinician; drafts never reach patients. Her options include red flags and a referral.",
    serves: "Responsible AI (release control) · R3"
  },
  {
    title: "You decide who sees what",
    persona: "COUPLE",
    href: "/patient/privacy",
    look: "Five purposes, each changeable at any time, enforced in the API and audited, with the non-discrimination guarantee.",
    serves: "R5 privacy, non-discrimination and user control"
  }
];

export const TOUR_KEY = "reproai.tour";
