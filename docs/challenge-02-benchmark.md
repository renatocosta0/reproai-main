# Challenge 02 benchmark, gap analysis and winning strategy

Prepared 12 November 2026 for issue #2. Prototype deadline: **20 November 2026**. Evaluation 20–30 November; top three present at GITEX (7–11 December).

This document does four things:

1. Restates what the official Challenge 02 brief and judging criteria actually ask for.
2. Extracts the design patterns from the reference demo the organisers showed (Inception42 "Brain Health Agent Lab").
3. Grounds the product in how fertility care really works in Abu Dhabi today.
4. Scores the current ReproAI build against all three and sets a prioritised plan for the eight days left.

---

## 1. What the challenge actually asks for

### 1.1 The official brief (Fertility · Challenge 02, "Reproductive Potential")

Source: the challenge page on Hack2skill, read 12 November 2026.

> How can we help individuals and health systems identify changes in reproductive potential earlier and translate them into timely, evidence informed and personalized choices?

The brief is explicit that the answer is **not** a deterministic fertility score. It asks for an "evidence-led, understandable view of change over time that supports informed choices without creating anxiety, discrimination or false certainty". It names Abu Dhabi's existing assets to connect to: screening programmes, Health Age, patient healthcare apps and reproductive-health pathways, on an integrated health and genomics data foundation.

The six things a solution should do, verbatim headings:

| # | Requirement (official heading) | What it means in practice |
| --- | --- | --- |
| R1 | **A longitudinal view of reproductive potential** | Combine only inputs the user is authorised and willing to share (age, history, lifestyle, conditions, labs/hormones, device data) to show **direction of change rather than a one-off label**. |
| R2 | **Plain-language interpretation** | Say which factors are modifiable and which are not, **what evidence supports the assessment, and where missing data or uncertainty limits the result**. |
| R3 | **Timely, personalised options** | Turn findings into choices: health optimisation, testing, preconception counselling, fertility-preservation discussion or specialist referral, **without prescribing beyond the intended use**. |
| R4 | **Clinician and system usefulness** | A concise clinician view **and population-level insight** that identifies groups who may benefit from earlier advice, with individual decisions left to qualified professionals. |
| R5 | **Privacy, non-discrimination and user control** | **Granular, revocable consent**; prevent use of reproductive data for **employment, insurance or other unrelated decisions**; confidentiality across the pathway. |
| R6 | **Evidence of earlier action** | Show improvement in **time from risk signal to counselling or assessment, informed-choice quality, referral completion and equitable reach**, with **calibration and false-reassurance risks reported**. |

### 1.2 Judging criteria and submission

Six criteria, no published weights, under the heading "Impact first. Then proof that it works":

1. Health impact and clinical relevance
2. Technical depth and architecture
3. Working solution and demonstration quality
4. Responsible AI, safety and data governance
5. Scalability and deployment readiness
6. Commercial viability and path to pilot

Submission (due 20 November): a **working prototype with technical documentation, assumptions and limitations**. The top three are chosen "solely based on evaluations".

**Implication:** two of six criteria (4 and 6) and two of six requirements (R5 and R6) are about governance and evidence rather than features. A polished UI that over-claims will lose to a plainer one that is honest about uncertainty and shows how it would be measured. The organisers' own reference demo (section 2) is built exactly that way.

---

## 2. Lessons from the reference demo (Inception42 Brain Health Agent Lab)

Sources: `Implementations/questions.md` and the 19 screenshots in `Implementations/`.

| Pattern in the reference demo | Why it matters to judges | Where ReproAI stands |
| --- | --- | --- |
| **Deterministic numbers, LLM only explains.** "0 scores written by an LLM. All numbers come from the tool." The LLM's explanation must pass a schema check, and if the call fails the record shows a *labelled* scripted explanation. | Separates calculation from generation; no hallucinated numbers. | ✅ Scores come from the FastAPI model. ⚠️ The assistant is free-form chat, not tool-grounded explanation of a specific result, and there is no visible "fails visibly" behaviour. |
| **Explicit gates in a fixed order.** 12 stages (permission → safety → context → data quality → baseline → change analysis → … → clinician review → follow-up → equity audit). A failed gate **stops** later stages; missing data stops or lowers confidence. | Directly answers "where missing data or uncertainty limits the result". | ❌ The model **silently substitutes AMH = 1.5 ng/mL and sperm = 15 M/mL** when values are missing and still returns a narrow interval. This is the single most damaging gap. |
| **Clinician decides and signs off.** AI prepares a draft; the clinician reviews contributing factors, edits the note and care plan, approves; only then is follow-up created. | Human oversight made concrete, not asserted. | ❌ Results go straight to the patient. No review or approval step, no editable clinician note on a result. |
| **Separation of observed, calculated and AI-generated content.** Each section labelled so the clinician can verify its origin. | Auditability. | ⚠️ Partially: labs and wearables are shown separately from the estimate, but provenance (self-reported vs clinician-verified vs device) is not labelled. |
| **Compare each person with their own baseline.** "Two charts, two different questions": recorded observations over time vs adjusted change from personal baseline, each with an interval. | This *is* R1, "direction of change rather than a one-off label". | ⚠️ We have an estimate-history chart, but the patient headline is a single probability ("62%"), which reads as a score. |
| **Validation dashboard with honest statistics.** Sensitivity, specificity, test–retest reliability, false-referral burden, time-to-assessment, all with Wilson 95% CIs and denominators; confusion matrix; filters by language, age and education; DECIDE-AI reporting reference; "What the pilot still needs to measure". | This *is* R6 and criterion 4. | ❌ None. The repo states "ROC-AUC 0.792, Brier 0.174 … calibrated via isotonic scaling" as a hard-coded string with no supporting evaluation. |
| **Evidence-status labels everywhere.** "Runs in prototype", "Simulated / synthetic", "Proposed for production", "Benefit not yet proven", "not a claim of compliance". | Builds trust with clinical judges. | ❌ The product and docs over-claim (calibration, AUC, "AES-256" in older copy). |
| **Bilingual English / Arabic.** Explanations and the care-plan summary are produced in both. | Cultural fit; the male-health brief demands cultural sensitivity and judges are DoH. | ❌ English only. |
| **Guided, replayable demo for the audience.** "Play ready demo", scripted walkthrough, fictional case selector (including a missing-data case and a no-permission case). | Criterion 3, demonstration quality, especially for a panel reviewing many submissions. | ⚠️ We have one-click demo personas but no guided tour and no "missing data" or "no consent" scenario. |
| **One visit, one record, every handoff documented.** Exportable visit record (HTML/JSON/PDF) with an audit timeline. | Deployment readiness, governance. | ⚠️ FHIR export and a printable case report exist; no per-encounter record with an audit trail of who did what. |

---

## 3. How it works in real life in Abu Dhabi

### 3.1 The people and the moments that matter

| Moment | Who | What happens today | Opportunity for ReproAI |
| --- | --- | --- | --- |
| **Premarital screening** (mandatory for Emiratis; genetic panel of 570 genes integrated since 2024–25, at 22 primary-care centres) | Engaged couples, primary care | Couples are already tested and counselled on inherited risk. Reproductive *potential* is not discussed. | The natural, system-level "front door": a consented invitation at screening to start a reproductive-potential baseline. |
| **IFHAS adult screening** (ADPHC, Thiqa holders 18+, booked via Sahatna, now TAMM) | Adults, primary care | Annual screening of cardiometabolic, vision and mental health. | Add a short reproductive-health module (history, cycle, lifestyle) that flags who should be offered AMH or semen testing. Population reach. |
| **Biological Health Age** (ADPHC × Ultrahuman model in development) | Wellness users | A longevity framing of sleep, metabolism and recovery. | "Reproductive potential over time" fits the same life-course narrative and the same device data (sleep, temperature). |
| **GP / OB-GYN visit** | Women 25–40, men rarely | AMH ordered ad hoc; men are assessed late, often only after the female partner. | Clinician view that shows who in a panel lacks a baseline and who is approaching a decision point. |
| **Fertility clinic** | Couples trying ≥12 months (≥6 months if over 35) | Full work-up: AMH, FSH, LH, E2, TSH, prolactin, ultrasound AFC, WHO semen analysis, infection screen (these are the Thiqa baseline investigations). | Pre-visit summary and an evidence trail; joint couple view. |
| **Fertility preservation decision** | Single women (social egg freezing), oncology patients | Since October 2025 Thiqa covers **social egg freezing** for eligible single individuals: max **two cycles per lifetime**, storage covered **5 years**, **mandatory psychological assessment**, medications by pre-approval. Oncology preservation is covered for married or single patients. | Timely, informed discussion: who is in the window where preservation is most effective, and what the pathway involves. |

### 3.2 Rules that should shape the product (Daman Thiqa ART adjudication guideline v3.6, updated 26 Nov 2025)

- Medical necessity: trying for ≥1 year, or earlier with red flags: oligo/amenorrhoea, female age >35, prior cancer therapy, pelvic infection or surgery, reduced ovarian reserve, any semen parameter below WHO reference (concentration 15 M/mL, total 39 M, total motility 40% or progressive 32%, morphology 4%, volume 1.5 mL, vitality 58%), known genetic disorders.
- Reduced ovarian reserve is defined operationally as **AFC < 5–7 or AMH < 1.1 ng/mL**, or a prior poor response (≤3 oocytes).
- Eligibility: women 18–47 (46–47 only with AFC ≥ 5); BMI 19–40, with counselling and dietitian referral for BMI 35–40.
- Coverage: up to six retrievals and three embryo transfers per patient per year; storage reviewed yearly up to 5 years or age 47.
- Donor gametes are not lawful in the UAE.

These give us **explicit, citable, local triggers** for R3 ("timely options") that are far stronger than generic advice.

### 3.3 Context worth citing in the pitch

- UAE total fertility rate is about 1.2–1.35 births per woman (2024–25), down from 3.76 in 1994; Emirati births fell ~11% between 2015 and 2022. A federal fertility centre and a national family-growth strategy are in progress; Abu Dhabi runs the Emirati Family Growth Programme.
- WHO's first global infertility guideline (28 November 2025, 40 recommendations) emphasises prevention and education in primary care, stepped care that is "not just about IVF", male-factor assessment and psychosocial support.
- DoH Responsible AI Standard (DoH/ST/DDGO/RAI/V1/2025, effective October 2025) applies to any AI deployed by licensed entities; ADHICS covers security. Malaffi already serves a Patient Risk Profile to authorised doctors, which is the integration precedent for a reproductive-potential view.

### 3.4 Competitive landscape

Consumer at-home hormone kits and trackers (Modern Fertility-style AMH panels, Mira, Inito, Oova, Proov, temperature-based apps) sell directly to consumers and are criticised by clinicians for implying that AMH predicts the chance of pregnancy. None of them is connected to a clinician pathway, a payer rule set or a population programme. ReproAI's defensible position is the opposite: **a system-integrated, clinician-governed longitudinal view that triggers the right next step at the right time**, with honest uncertainty.

---

## 4. Scorecard: the current build against the brief

Legend: ✅ meets · ⚠️ partial · ❌ missing.

| Brief requirement | Status | Evidence in the code | What is wrong or missing |
| --- | --- | --- | --- |
| R1 Longitudinal view | ⚠️ | Estimate history (clinician record), BBT and sleep series, demo personas with history | Patient headline is a single probability. No per-person baseline or "direction of change" for the markers that matter (AMH-for-age percentile, semen parameters). The age-adjusted AMH percentile is computed by the model but never stored or shown. |
| R2 Plain language, evidence, missing data | ❌/⚠️ | Modifiable vs fixed factors, SHAP, limitations list, calm tier wording | **Silent default values for missing AMH and sperm.** No data-completeness indicator, no per-claim evidence citation, hard-coded calibration claim. |
| R3 Timely, personalised options | ⚠️ | `recommended_options` strings, preservation guidance | Not rule-driven or local. No triggers tied to Thiqa/WHO thresholds, no "who should be tested", no red flags, no clear "intended use" boundary. |
| R4 Clinician and population usefulness | ⚠️ | Clinician dashboard, follow-up board, case record, FHIR export | No population insight beyond a donut chart; every clinician sees every case; clinician cannot enter verified labs or sign off a result. |
| R5 Privacy, non-discrimination, control | ⚠️ | Revocable partner pairing, per-user data scoping, audit log, auth on all routes | Consent is recorded but not granular or enforced; no purpose-limitation (employment/insurance) statement or control; anyone can create a clinician account; encryption at rest not applied. |
| R6 Evidence of earlier action | ❌ | Audit log and follow-up timestamps exist | No measurement at all: no time-to-action, referral completion, equity breakdown, calibration or false-reassurance report. |

| Judging criterion | Today | Main risk |
| --- | --- | --- |
| Health impact and clinical relevance | ⚠️ | Framed as "IVF success probability", which is the wrong outcome for people not yet trying. |
| Technical depth and architecture | ✅/⚠️ | Solid full stack, explainable model, FHIR. Missing the visible gated pipeline judges were shown. |
| Working solution and demo quality | ⚠️ | Works end to end with demo personas; no guided story, no Arabic. |
| Responsible AI, safety, governance | ❌/⚠️ | Silent imputation and the unsupported AUC claim are disqualifying-level issues for a clinical panel. |
| Scalability and deployment readiness | ⚠️ | Vercel + Neon + separate ML service is credible; no Malaffi/TAMM story, no per-clinic tenancy. |
| Commercial viability and path to pilot | ⚠️ | Savings metric is a single assumption. No buyer, pilot design or payer logic. |

### 4.1 Validation of the NewPrompt.md plan

**Keep:**

- Clinician-verified labs. AMH, AFC and semen analysis come from laboratories and ultrasound; patients should not type them. This matches real practice and the Thiqa baseline investigations.
- Clinician AI copilot, read-only verified lab cards for patients, what-if simulator limited to modifiable factors.

**Change:**

1. **"Prescription only" entry is too narrow for an *earlier*-detection brief.** If the only way in is a fertility-clinic prescription, the product only reaches people already in care, which is the opposite of R1 and R4. Keep the B2B2C model but make the *system* the prescriber too: invitations through premarital screening, IFHAS and primary care (a DoH/ADPHC programme invitation is still a governed, consented entry, not open sign-up).
2. **Patients should enter what they know: history, cycle, symptoms, lifestyle.** This is the low-friction "earlier signal" layer the brief asks for, and it is clearly labelled *self-reported*. Labs remain clinician-verified (or imported from Malaffi in production). The "no lab form for patients" rule stays.
3. **Replace the probability headline for individuals.** For someone not trying to conceive, a "probability of success" is a fertility score by another name. Lead with the markers' trajectory against age-specific reference ranges and the personal baseline, plus a data-completeness indicator. Keep the probability for couples who are trying, in the clinician view, with its interval.
4. **Add the missing safety and evidence layers** the plan does not mention: data-completeness gates, clinician sign-off before release, provenance labels, granular consent, an evaluation dashboard and honest evidence labels.

---

## 5. Strategy: what a winning ReproAI looks like

**One-line pitch:** ReproAI turns scattered reproductive-health signals into an honest, longitudinal view and the right next step at the right time, for individuals, their clinicians and the health system, with the clinician in control and the person in control of their data.

Five pillars, each mapped to the brief:

1. **Earlier front door (R1, R4).** Programme invitations at premarital screening, IFHAS and primary care, plus clinician prescription. A 3-minute self-reported intake (history, cycle, symptoms, lifestyle, family history of early menopause) produces an *earlier signal*: "consider an AMH test" or "consider a semen analysis", with the reason.
2. **Gated, deterministic assessment (R2, criterion 4).** Consent → data completeness → calculation → explanation → clinician review → release. Missing critical inputs stop the assessment or visibly widen uncertainty. Every number comes from a versioned tool; the LLM only explains.
3. **Trajectory, not a score (R1, R2).** Per-marker charts against age-specific reference ranges and the person's own baseline, with direction of change, provenance (self-reported, clinician-verified, device) and plain-language meaning in English and Arabic.
4. **Rule-based pathways with local triggers (R3).** Deterministic, cited rules (WHO 2025 guideline, WHO 6th-edition semen reference, ESHRE/POSEIDON, the Thiqa ART guideline): optimise, test, counsel, discuss preservation (including what the Thiqa social egg-freezing pathway involves), refer. Each rule shows its source and stays inside the intended use.
5. **Measured, governed, fair (R5, R6, criteria 4–6).** Granular, revocable consent with a purpose-limitation guarantee; clinician sign-off; an evaluation dashboard with real pathway metrics from the app (signal → counselling → referral completion, by group) and a clearly labelled simulated-cohort report on calibration and false reassurance with Wilson intervals; DECIDE-AI-style limitations.

**Commercial story (criterion 6):** buyer is DoH/ADPHC (population programme, integrated with screening and TAMM) and fertility providers (clinician view). Value: fewer late presentations, preservation discussed inside the effective window, fewer futile cycles; Thiqa already funds the downstream services (social egg freezing, ART bundles), so earlier and better-timed use is directly measurable. Pilot design: one primary-care cluster and one fertility centre, 6 months, primary outcome time-to-counselling.

---

## 6. Prioritised plan for the eight days

**P0: must ship by 20 November (changes the score most)**

| # | Item | Brief / criterion |
| --- | --- | --- |
| P0-1 | **Data-completeness gates and honest uncertainty.** Remove silent defaults in the ML service; return `insufficient_data` with the missing inputs; show completeness and provenance; remove the hard-coded calibration claim; add evidence-status labels. | R2, C4 |
| P0-2 | **Trajectory-first patient view.** Store and chart the AMH-for-age percentile and semen parameters over time against reference ranges and the personal baseline; direction-of-change wording; the probability moves to the couple/clinician context. | R1, R2, C1 |
| P0-3 | **Clinician-verified labs and sign-off.** Lab entry on the patient record (value, unit, date, source); run assessment; clinician note and **approve before release**; patients see only released results. Patient lab form replaced by a self-reported history and lifestyle intake. | R4, C4, NewPrompt Step 3/5 |
| P0-4 | **Rule-based options engine** with cited WHO/ESHRE/Thiqa triggers and red flags, shown to patients in plain language and to clinicians with the rule ID. | R3, C1 |
| P0-5 | **Granular, revocable consent** (labs, wearables, partner sharing, clinician sharing, population analytics), enforced in the API, with a purpose-limitation statement. Close open clinician registration; clinicians see only cases they prescribed or were assigned. | R5, C4 |
| P0-6 | **Evidence dashboard.** Live pathway metrics from app data (time from signal to follow-up, to appointment, referral completion, by sex/age/nationality group) plus a clearly labelled simulated cohort for calibration and false-reassurance rates with Wilson CIs. | R6, C4 |
| P0-7 | **Submission documentation:** technical documentation, assumptions and limitations, mapped to the six criteria. | Submission rule |

**P1: strong differentiators if time allows**

- Arabic for patient-facing summaries and key screens (RTL).
- Guided judge tour ("Play demo") including a missing-data case and a no-consent case.
- Clinician AI copilot page, tool-grounded, explaining a specific case's results.
- Population insight view: who in the panel would benefit from earlier advice.
- What-if simulator restricted to modifiable factors, labelled illustrative.

**P2: production story (document, don't build)**

Malaffi/FHIR import of verified labs, TAMM/Sahatna entry point, Health Age linkage, per-clinic tenancy, encryption at rest, DoH Responsible AI Standard conformity checklist.

---

## Sources

- Challenge statement, criteria and timeline: [Hack2skill · Future Health Digital Innovation Challenge](https://hack2skill.com/event/futurehealthchallenge/); [Future Health press release](https://futurehealthinitiative.ae/future-health-launches-global-challenge-to-move-health-innovation-towards-real-world-application/)
- Reference demo: `Implementations/questions.md` and screenshots (Inception42 Brain Health Agent Lab)
- [Daman · Thiqa Coverage for Assisted Reproductive Treatment & Services, v3.6 (26 Nov 2025)](https://www.damanhealth.ae/wp-content/uploads/2026/01/Thiqa-Coverage-for-Assisted-Reproductive-Treatment-Services-External.pdf)
- [WHO · First global guideline on infertility (28 Nov 2025)](https://www.who.int/news/item/28-11-2025-who-issues-first-global-guideline-on-infertility)
- [DoH · Premarital screening expanded to 570 genetic conditions](https://www.doh.gov.ae/en/news/doh-to-expand-pre-marital-screening-for-570-genetic-medical-conditions)
- [ADPHC × Ultrahuman · Biological Health Age model](https://www.wam.ae/en/article/c2q0nsf-abu-dhabi-public-health-centre-ultrahuman)
- [ADPHC · IFHAS screening expansion](https://www.mediaoffice.abudhabi/en/health/abu-dhabi-public-health-centre-expands-comprehensive-screening-programme-ifhas-to-advance-community-health-and-preventive-care/)
- [Sahatna moving to TAMM](https://www.wam.ae/en/article/bm8fhwg-abu-dhabi-advances-smart-intelligent-health-system)
- [DoH and Malaffi · AI patient risk profiles](https://www.doh.gov.ae/en/news/Department-of-Health-and-Malaffi-use-AI-to-predict-patients-future-risk-of-disease-in-Abu-Dhabi)
- [UAE fertility-rate decline and federal fertility centre (Khaleej Times)](https://www.khaleejtimes.com/uae/federal-fertility-centre-citizens-birth-rates); [UAE Minister of Family on fertility strategy (The National)](https://www.thenationalnews.com/news/uae/2025/07/05/uae-minister-of-family-outlines-vision-for-boosting-nations-fertility-rates)
- [UAE 2023 assisted-reproduction law changes (The National)](https://thenationalnews.com/uae/2023/10/26/change-in-law-allows-unmarried-non-muslim-couples-to-undergo-ivf-in-uae)
- [At-home fertility testing, clinician critique (CCRM)](https://www.ccrmivf.com/?p=4496); [ParentData review of at-home tests](https://parentdata.org/trying-to-conceive/what-do-at-home-fertility-testing-kits-actually-tell-you/)
- AMH-age model calibration: [Journal of Ovarian Research, external validation of an AMH-age nomogram](https://ovarianresearch.biomedcentral.com/track/pdf/10.1186/1757-2215-6-3)
