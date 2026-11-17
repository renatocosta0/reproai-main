# Submission pack: slide-by-slide content

Source of truth for the official *Future Health Digital Innovation Challenge* submission template (13 required slides + 1 optional). Every claim here is labelled and matches the code on 16 Nov 2026. Items marked **TO FILL** need the team; do not fill them with estimates.

Status labels: **Runs in prototype** · **Simulated** · **Proposed for production** · **Not yet measured**.

---

## Slide 1: Team, size, problem statement

- **Team name:** ReproAI · **Team size:** TO FILL
- **Problem statement (Fertility, Challenge 02, Reproductive Potential):**
  Most people in Abu Dhabi get a meaningful view of their reproductive potential only once they are already trying to conceive or struggling, often years after the window for simple action has narrowed. Couples sit through mandatory premarital screening for 570 genetic conditions, yet nobody looks at reproductive potential: there is no trigger, no owner and no next step. ReproAI turns signals people and clinicians already have into an honest, longitudinal view and a clinician-approved, cited next step, before trying, not after.

## Slide 2: Team members

TO FILL: name, country, role, organisation, age confirmation for each member. Name advisors only if they have agreed.

## Slide 3: Team capability summary (max 1,000 characters)

TO FILL with real backgrounds. Draft structure (about 700 characters with placeholders):

> ReproAI combines [clinical: role/experience], [engineering: full-stack, ML, data], and [product/design]. In two weeks the team built a working, bilingual (English/Arabic) clinician-governed prototype: a gated assessment pipeline with missing-data refusal and clinician sign-off, a deterministic rules engine cited to the Daman Thiqa ART guideline and WHO, a retrieve-first assistant that cites every sentence and abstains when unsupported, five revocable consents enforced in the API, FHIR R4 export, and a self-assessment against the DoH Responsible AI Standard and Risk Management Protocol. [Clinical input: who, with permission.]

## Slide 4: Architecture or workflow diagram

Use `docs/images/reproai-architecture.png` (source `docs/reproai-architecture.html`). One-line caption:

> Governed entry → consent → completeness gate → deterministic scoring and cited rules → clinician review and note → release → follow-up → audit. The LLM only words answers from cited passages; it never computes a number or takes an action.

Detail: [architecture.md](architecture.md), [technical-documentation.md](technical-documentation.md).

## Slide 5: Target users and intended outcome

| Role | Who | What they get |
| --- | --- | --- |
| **Buyer** | The health system: ADPHC/DoH programmes (premarital screening, IFHAS, TAMM) and provider groups running primary care, OB-GYN and fertility services | Earlier reach through existing touchpoints, anonymous insight on who would benefit from earlier advice, measured outcomes |
| **User** | GPs, OB-GYNs, fertility specialists | One sourced record with provenance, a draft to review and sign, options cited to Thiqa/WHO rules, a follow-up board |
| **Beneficiary** | Individuals and couples, before or while trying to conceive; never pays | A private, clinician-governed route; markers over time, not a score; English and Arabic; control over their data |

**One person, one moment** (fictional, matches the demo data): *Reem, early 30s, not yet trying*, invited at a routine or premarital visit. A short self-reported intake raises a signal ("consider an AMH test"), her clinician approves, the result is tracked against the Thiqa reference limit, and a preservation discussion happens while it can still help. Couple example: *Nadia and Yousef*, trying for 18 months, joint assessment awaiting clinician review.

**Intended outcome:** shorter time from first risk signal to counselling or assessment, with no false certainty and no use of reproductive data for unrelated decisions.

Entry points: GP/OB-GYN prescription and fertility clinic **run in prototype**; premarital screening and IFHAS invitations are **proposed for production**.

## Slide 6: How will success be measured?

Measures are the brief's own (R6). Live measures come from the app's audit trail with Wilson 95% intervals (`/clinician/evidence`).

| Measure | Type | Prototype | Pilot |
| --- | --- | --- | --- |
| Days from first risk signal to counselling or assessment | Primary | Runs in prototype (signal → appointment, signal → closure) | Compare against current practice at the pilot sites; target TO SET with the partner |
| Referral follow-through (flagged → acted on) | Secondary | Runs in prototype | Measured |
| Baseline coverage (AMH or semen analysis on record) by sex and age group | Equity | Runs in prototype; small groups suppressed | Add nationality with consent |
| Clinician review turnaround (draft → release) | Process | Runs in prototype | Measured |
| False reassurance of the reduced-reserve rule | Safety | Simulated (synthetic cohort, AMH test variability) | On local outcomes |
| Calibration | Safety | Pipeline self-check only (synthetic) | First pilot measure, before any probability is shown outside clinician review |
| Informed-choice quality, anxiety, clinician workload | Secondary | Not yet measured | Validated questionnaires |
| Assistant grounding (retrieval hit, correct abstention) | Quality | Runs in prototype: 36/36 answerable questions retrieved a supporting passage; 9/12 out-of-scope questions correctly abstained (team-written questions) | Re-run on questions collected from users |

## Slide 7: Evidence supporting the approach

- **The need:** WHO's first global infertility guideline (Nov 2025) stresses prevention, primary care, male-factor assessment and care that is not only IVF. UAE total fertility rate about 1.2–1.35 (2024–25) and a national family-growth agenda (prefer an official statistic in the deck).
- **The rules:** Daman Thiqa ART guideline v3.6 (reduced ovarian reserve AMH < 1.1 ng/mL or AFC < 5–7; semen reference limits; referral after 6 months over 35; social egg freezing coverage), WHO 2025, ESHRE female fertility preservation (2020). Every option shows its rule ID and source.
- **The model:** curve shapes informed by HFEA 2022, CDC ART 2022, ESHRE/POSEIDON and Bhattacharya et al. 2021; coefficients hand-set. **Not trained or validated; no accuracy claim.**
- **Prior testing (prototype only, synthetic data):** missing-data refusal and withdrawn-consent blocking demonstrated in the tour; assistant evaluation (48 team-written questions, English and Arabic) with every miss listed; simulated false-reassurance check of the AMH < 1.1 rule under 20% test variability.
- **Reference pattern:** the organisers' Inception42 Brain Health Agent Lab demo (deterministic numbers, gated pipeline, clinician sign-off, evidence labels), which ReproAI follows.

Full register: [EVIDENCE_REGISTER.md](EVIDENCE_REGISTER.md).

## Slide 8: Data sources and legal right to use them

| Source | Type | Owner | Sensitivity | Permission / basis | Personal data? |
| --- | --- | --- | --- | --- | --- |
| Demo personas, labs, wearable series (`prisma/demo.ts`, `seed.ts`) | Synthetic records | ReproAI team | None (fictional) | Created by the team | No |
| Simulated evaluation cohort (`src/lib/evaluation.ts`) | Synthetic, generated in memory | ReproAI team | None | Created by the team | No |
| Daman Thiqa ART guideline v3.6 | Public payer guideline (PDF) | Daman | Public | Publicly available; quoted with section and page for reference | No |
| WHO infertility guideline news release (2025) | Public | WHO | Public | Publicly available; short quotations with citation | No |
| ESHRE female fertility preservation guideline (2020) | Public guideline | ESHRE | Public | Publicly available; short quotations with citation | No |
| WHO semen manual (6th ed.) via a published review (PMC) | Public | WHO / authors | Public | Open-access article; cited | No |
| HFEA, CDC registry summaries; published studies | Public statistics | HFEA, CDC, authors | Public | Used to shape curves; no data copied | No |
| In production: clinician-entered labs, self-reported intake, consented wearable readings, Malaffi lab import | Personal health data | The patient; held by the operating provider | Very high (reproductive health) | Patient consent per purpose (five revocable consents); provider data-sharing agreement; DoH approval | **Yes (production only)** |

The prototype processes **no real personal data**. The assistants use Azure OpenAI gpt-5-mini in UAE North, but the database is hosted outside the UAE and Groq (US) is the LLM fallback; both are acceptable only for synthetic data. Production requires UAE hosting (DoH Responsible AI Standard 3.1.4.5.1).

## Slide 9: Risks and safeguards

| Area | Risk | Safeguard in the prototype | Still needed |
| --- | --- | --- | --- |
| Privacy | Reproductive data exposed or used for employment/insurance | Five granular, revocable consents enforced in the API; purpose-limitation statement; clinician scoping; audit log; no open sign-up; AES-256-GCM encryption at rest on sensitive text fields (names, history, notes, assessment inputs, chat) | Managed keys with rotation; encrypt lab values; MFA; UAE hosting for the database |
| Security | Account or API misuse | bcrypt, HTTP-only signed JWT, role gating, invite tokens bound to email, rate limiting on the public guidance assistant | ADHICS assessment; penetration test |
| Bias | Curves from UK/EU/US data may not fit UAE patients | Estimate shown only to clinicians, with interval and limitations; equity breakdown by sex and age with small-cell suppression | Local recalibration; nationality (with consent) in equity measures |
| Explainability | Black-box output | Additive model with per-factor contributions; every option has a rule ID and source; assistants cite every sentence | Clinician co-design of explanations |
| Misuse | Read as a fertility score or a diagnosis | No probability shown to patients; tier and markers over time; "not a diagnosis" on every result; intended-use statement | Pilot monitoring of how results are read |
| Human oversight | AI acts without a clinician | Assessments are clinician-created drafts; release needs a note; the agent proposes and writes nothing until approved; discards need a reason | Named accountable clinical lead |
| Failure modes | Missing data, wrong inputs, LLM errors | Missing required input → no estimate (`insufficient_data`); provenance on every value; patients cannot write labs; assistant abstains when retrieval is weak and shows patients only verified sentences | Clinical safety case |

Formal rating: [risk-register.md](risk-register.md), rated with the DoH Responsible AI Risk Management Protocol (asset criticality High; residual risks Medium, none High or Very high as configured; data residency becomes Very high with real data outside the UAE).

## Slide 10: Hardware requirements

**No hardware is required.** ReproAI runs in a web browser on any phone or computer. Optional basal body temperature and sleep readings come from devices people already own: typed or pasted, or read directly from a **standard Bluetooth health thermometer** in Chrome or Edge on Android or a computer (runs in prototype; not iPhone browsers, and thermometers with a proprietary protocol cannot connect). ReproAI does not source or supply any device, and wearable data is not a model input. Every reading keeps its source and device name. A device import endpoint accepting Apple Health and Health Connect samples runs today; the native app that reads them (Capacitor wrapper) and an Ultrahuman adapter are **proposed**. Lab values come from accredited laboratories through the clinician.

## Slide 11: Path to pilot and scale

- **Stakeholders:** ADPHC (premarital screening, IFHAS), DoH (DDGO for Responsible AI conformity), a provider group with primary care and a fertility centre, Daman (Thiqa rules), Malaffi (lab data).
- **Pilot (designed, not started):** one primary-care cluster and one fertility centre, six months. Primary outcome: days from first risk signal to counselling or assessment. Secondary: referral completion, informed-choice quality, equitable reach, false reassurance and calibration on local outcomes.
- **Integration:** FHIR R4 export runs today; Malaffi lab import and a TAMM entry point are proposed.
- **Regulatory before real data:** DoH Responsible AI Standard conformity and DoH review of the risk register; ADHICS; UAE hosting for the app, database and scoring service (Azure UAE North, where the LLM already runs); managed encryption keys and lab-value encryption; MFA; recalibration and external validation before any probability is shown outside clinician review.
- **Timeline assumptions:** TO SET with the partner (governance and hosting first, then a silent-mode period, then live use).
- **Sustainability:** individuals never pay and data is never sold. A programme licence (ADPHC/DoH, per enrolled person or site) or a provider licence (per clinician or site), plus integration and training. Price points TO SET from a sourced benchmark; no cost-saving figures are claimed.
- **Partner:** TO FILL only with a real, permissioned contact (letter of intent if available).

## Slide 12: Pre-existing IP and third-party materials

- **Ownership:** all ReproAI source code, rules, corpus summaries and documentation were written by the team during the challenge. TO CONFIRM: any member's employer IP terms.
- **Design reference:** a Figma Make export used as a visual reference only; no code copied. TO CONFIRM the account owner.
- **Open-source components (all permissive, no copyleft):**

| Component | Licence |
| --- | --- |
| Next.js 14, React 18, Tailwind CSS 3, bcryptjs, jose, zod, PostCSS, Autoprefixer, ESLint, ts-node, Vitest | MIT |
| lucide-react (icons) | ISC |
| Prisma, TypeScript | Apache-2.0 |
| FastAPI, Pydantic, Uvicorn | MIT / BSD-3-Clause |
| Manrope, DM Sans (fonts, via next/font) | SIL Open Font License 1.1 |

- **Third-party services:** Resend (invitation email, optional), Azure OpenAI and Groq (LLM wording), Azure AI Search (optional retrieval), Vercel and Neon (prototype hosting), each under its own terms of service.
- **Third-party content:** guideline passages are short quotations with citations (Daman, WHO, ESHRE); no full documents are redistributed.
- **Restrictions:** none known beyond the services' terms. Clinical guidelines remain the property of their publishers.

## Slide 13: Conflict of interest declaration

TO FILL by each team member: any relationship with the organisers (DoH, ADPHC, Inception, MBZUAI, Hack2skill), partners or judges, including employment, study, funding or advisory roles. If none: "No team member has a relationship with the organisers, partners or judges."

## Slide 14 (optional): Demo access and coverage

- Guided tour: `/tour` (nine steps, fictional personas, English and Arabic). Public link: TO FILL.
- Coverage table, live vs simulated vs proposed per requirement: `/coverage`.
- Model card: `/model-card`. Evidence page: `/clinician/evidence`.
