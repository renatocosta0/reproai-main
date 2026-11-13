import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import "./coverage.css";

export const metadata: Metadata = {
  title: "Demo coverage · ReproAI",
  description: "What runs in the ReproAI prototype, what is simulated and what is proposed, for each Challenge 02 requirement."
};

// Public demo-coverage page: for each Challenge 02 requirement, what runs in the
// prototype, what is simulated, and what is proposed for production, with where
// to see it. Status statements only; no numbers, so nothing here is mocked data.

type Status = "live" | "simulated" | "proposed";

interface Row {
  status: Status;
  text: string;
  where?: { label: string; href: string };
}

interface Requirement {
  id: string;
  title: string;
  ask: string;
  rows: Row[];
}

const REQUIREMENTS: Requirement[] = [
  {
    id: "R1",
    title: "A longitudinal view of reproductive potential",
    ask: "Combine only what the person shares, and show direction of change rather than a one-off label.",
    rows: [
      { status: "live", text: "AMH, antral follicle count and semen parameters charted over time against reference limits and the person's first result, with direction-of-change wording.", where: { label: "Tour step 8 (Reem)", href: "/tour" } },
      { status: "live", text: "Basal temperature and sleep series, logged by the person, combined only with their consent." },
      { status: "live", text: "Estimate history for clinicians, always with its 95% interval." },
      { status: "proposed", text: "Verified lab results imported from Malaffi instead of entered by clinicians; certified device integrations." }
    ]
  },
  {
    id: "R2",
    title: "Plain-language interpretation",
    ask: "Say what is modifiable, what evidence supports the result, and where missing data or uncertainty limits it.",
    rows: [
      { status: "live", text: "A missing required input (AMH or semen analysis) stops the assessment and names what is needed; nothing is guessed.", where: { label: "Tour step 4 (Layla)", href: "/tour" } },
      { status: "live", text: "Missing optional inputs widen the interval and show in a completeness meter." },
      { status: "live", text: "Factors that raised or lowered the estimate (exact Shapley values), modifiable vs fixed, provenance and date on every value, evidence-status labels." },
      { status: "live", text: "English and Arabic with right-to-left layout, in both portals.", where: { label: "Tour step 9", href: "/tour" } },
      { status: "live", text: "Assistants that cite a source for every sentence and say \"not in ReproAI's guidance\" otherwise.", where: { label: "Tour step 6", href: "/tour" } }
    ]
  },
  {
    id: "R3",
    title: "Timely, personalised options",
    ask: "Turn findings into choices without prescribing beyond the intended use.",
    rows: [
      { status: "live", text: "Deterministic rules with IDs and citations (Daman Thiqa ART guideline, WHO): red flags, referral by time trying and age, ovarian-reserve and semen testing, preservation discussion including the Thiqa social egg-freezing pathway, preconception counselling, weight, smoking, sleep.", where: { label: "Tour steps 8, 10, 11", href: "/tour" } },
      { status: "live", text: "Every option states why it appears, its source and the intended-use boundary." },
      { status: "live", text: "What-if view limited to the one modifiable model input (BMI), labelled illustrative; nothing is saved." }
    ]
  },
  {
    id: "R4",
    title: "Clinician and system usefulness",
    ask: "A concise clinician view and population-level insight, with decisions left to professionals.",
    rows: [
      { status: "live", text: "Clinicians see only the people they prescribed: a case record with verified labs, intake, triggered rules, history, a workflow strip, FHIR R4 export and a printable case report.", where: { label: "Tour steps 1 and 3", href: "/tour" } },
      { status: "live", text: "Every model result is a draft until a clinician writes a note and releases it; a discard needs a reason." },
      { status: "live", text: "Population insight: groups who would benefit from earlier advice, named for the clinician's own panel and anonymous service-wide with small groups suppressed.", where: { label: "Tour step 2", href: "/tour" } },
      { status: "proposed", text: "Invitations through premarital screening, IFHAS adult screening and TAMM; a system-level view across clinics." }
    ]
  },
  {
    id: "R5",
    title: "Privacy, non-discrimination and user control",
    ask: "Granular, revocable consent, and no use for employment, insurance or unrelated decisions.",
    rows: [
      { status: "live", text: "Five separate consents (care-team access, lab results, wearables, partner sharing, anonymous statistics), changeable at any time, enforced in the API and audit-logged.", where: { label: "Tour step 12", href: "/tour" } },
      { status: "live", text: "Withdrawing care-team access hides results and blocks assessments.", where: { label: "Tour step 5 (Omar)", href: "/tour" } },
      { status: "live", text: "Non-discrimination guarantee shown to patients; no open patient or clinician sign-up; partners pair only by mutual action." },
      { status: "proposed", text: "UAE hosting, encryption at rest and multi-factor sign-in (required before real patient data)." }
    ]
  },
  {
    id: "R6",
    title: "Evidence of earlier action",
    ask: "Show time to counselling, referral completion and equitable reach, and report calibration and false-reassurance risks.",
    rows: [
      { status: "live", text: "Panel measures from the app's own records with Wilson 95% intervals: time from signal to appointment, referral follow-through, baseline coverage, review turnaround, by sex and age group.", where: { label: "Tour step 7", href: "/tour" } },
      { status: "live", text: "Assistant evaluation with every miss listed, including how Arabic questions are handled." },
      { status: "simulated", text: "Calibration and false reassurance of the reduced-reserve rule, on a labelled synthetic cohort." },
      { status: "proposed", text: "A six-month pilot measuring time to counselling, referral completion, informed-choice quality and equitable reach on real outcomes." }
    ]
  }
];

const AROUND: Row[] = [
  { status: "live", text: "Numbers come only from the versioned model service; the language model explains and never calculates." },
  { status: "live", text: "Every estimate is stored with its exact inputs and model version; views and decisions are audit-logged." },
  { status: "live", text: "Model card describing intended use, what the number means, explanations, uncertainty and limitations.", where: { label: "Model card", href: "/model-card" } },
  { status: "simulated", text: "All demo personas and records are synthetic." },
  { status: "proposed", text: "Recalibration and external validation on Abu Dhabi outcomes before any clinical use." }
];

const LABEL: Record<Status, string> = { live: "Runs in prototype", simulated: "Simulated", proposed: "Proposed for production" };

function Rows({ rows }: { rows: Row[] }) {
  return (
    <ul className="cov-rows">
      {rows.map((r) => (
        <li key={r.text}>
          <span className={`cov-status cov-${r.status}`}>{LABEL[r.status]}</span>
          <p>
            {r.text}
            {r.where && (
              <>
                {" "}
                <Link href={r.where.href} className="cov-where">
                  {r.where.label}
                </Link>
              </>
            )}
          </p>
        </li>
      ))}
    </ul>
  );
}

export default function CoveragePage() {
  return (
    <div className="landing cov">
      <header className="landing-nav">
        <Link href="/" className="brand-home" aria-label="ReproAI home">
          <Logo />
        </Link>
        <Link className="secondary" href="/">
          <ArrowLeft size={15} aria-hidden className="flip-rtl" /> Home
        </Link>
      </header>

      <main className="landing-section cov-body">
        <p className="eyebrow">Demo coverage</p>
        <h1>What is working, what is simulated, what is proposed</h1>
        <p className="cov-lead">
          For each requirement in the Challenge 02 brief, this page says what runs in the prototype today, what is
          simulated, and what is proposed for production, with where to see it in the guided tour.
        </p>
        <div className="cov-legend" aria-label="Status key">
          {(Object.keys(LABEL) as Status[]).map((s) => (
            <span key={s} className={`cov-status cov-${s}`}>
              {LABEL[s]}
            </span>
          ))}
        </div>

        {REQUIREMENTS.map((r) => (
          <section key={r.id} className="cov-req" aria-labelledby={`req-${r.id}`}>
            <div className="cov-req-head">
              <span className="cov-id">{r.id}</span>
              <div>
                <h2 id={`req-${r.id}`}>{r.title}</h2>
                <p>{r.ask}</p>
              </div>
            </div>
            <Rows rows={r.rows} />
          </section>
        ))}

        <section className="cov-req" aria-labelledby="req-around">
          <div className="cov-req-head">
            <span className="cov-id">AI</span>
            <div>
              <h2 id="req-around">Around the model</h2>
              <p>How results are produced, traced and labelled.</p>
            </div>
          </div>
          <Rows rows={AROUND} />
        </section>
      </main>

      <footer className="landing-footer">
        <p>
          Prototype for the Abu Dhabi Future Health Digital Innovation Challenge (Challenge 02, Fertility). Not clinically
          validated and not a diagnostic device.
        </p>
      </footer>
    </div>
  );
}
