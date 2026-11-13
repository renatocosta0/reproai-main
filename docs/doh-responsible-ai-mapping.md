# ReproAI against the DoH Responsible AI Standard

Mapping of the ReproAI prototype against the Abu Dhabi Department of Health
**Responsible Artificial Intelligence (AI) Standard**, ref. DoH/ST/DDGO/RAI/V1/2025,
version V1, published and effective October 2025, owner: Data and Digital Governance Office
([PDF](https://www.doh.gov.ae/-/media/Feature/Resources/Standards/2025/Responsible-AI-Standard-V1.ashx)).

Clause numbers are the standard's own. Requirement text is paraphrased; read the standard for
the exact wording. This is a self-assessment by the ReproAI team, not a conformity assessment.
The standard's risk process is detailed in the separate DoH Responsible AI Risk Management
Protocol, which this document does not cover.

**Status key**

| Mark | Meaning |
| --- | --- |
| ✅ | In place in the prototype |
| 🟡 | Partly in place |
| ❌ | Gap in the prototype |
| 🏢 | Obligation of the deploying entity (governance, hosting, training); the prototype can support it but cannot meet it alone |

Features marked *(PR #10)* or *(PR #11)* are in open pull requests, not yet on `main`.

## Summary

| Section | Where ReproAI is strong | Main gaps |
| --- | --- | --- |
| 3.1 Core foundations | Human oversight (clinician sign-off, override with reason), traceability (inputs and model version per estimate, audit log), role-specific explanations, consent enforced in the API, transparency (model card, labelled evidence status) | No clinical validation; no co-design with clinicians and patients yet; no MFA; no encryption at rest; no UAE hosting; no automated post-deployment monitoring |
| 3.2 Data management | Inputs are clinician-verified with source and date; nothing is imputed; no patient data is used to train the model | No training dataset exists, so dataset versioning, datasheets and representativeness audits apply only to the guidance corpus and evaluation set |
| 3.3 Risk management | Draft risk register with 18 risks, controls, provisional ratings and owner roles | Ratings not yet made with the DoH protocol; owners not named |
| 3.4 AI literacy | In-product explanation (guided tour, model card, Evidence page, limitations in every view) | Staff training programmes are the deploying entity's role |

## 3.1 Core foundations

### 3.1.1 Human-centred design

| Clause | Requirement (paraphrase) | Status | ReproAI evidence |
| --- | --- | --- | --- |
| 3.1.1.1.1 | Co-design with clinicians, patients and technologists | ❌ | Built by the team from guidelines and the Challenge 02 brief; no structured clinician or patient co-design sessions yet. Planned for the pilot (technical documentation, roadmap). |
| 3.1.1.1.2 | Account for personal factors; tailored, equitable interventions | 🟡 | Sex-adaptive record and assessments (female, male, couple); options triggered by each person's own data (`src/lib/pathways.ts`). The model itself is a population curve, not personalised beyond its inputs. |
| 3.1.1.1.3 | Integrate into existing clinical workflows | 🟡 | Clinician prescribes, reviews and releases inside one record; follow-up board; FHIR R4 export designed for Malaffi (`docs/fhir-interoperability.md`). Not integrated with a live EHR. |
| 3.1.1.2.1 | Human-in-the-loop or on-the-loop mechanisms | ✅ | Every model output is a DRAFT until a clinician releases it (`/api/clinician/assessments/:id`); patients see only RELEASED assessments. |
| 3.1.1.2.2 | Always under human oversight; escalation protocols by risk level | 🟡 | Oversight: as above. Escalation: urgent-symptom messages get a fixed call-998/emergency reply without generation (`src/lib/rag/answer.ts`); "act soon" options and referral rules; follow-up board for alerts. No written escalation protocol by risk level. |

### 3.1.2 Safety and integrity

| Clause | Requirement (paraphrase) | Status | ReproAI evidence |
| --- | --- | --- | --- |
| 3.1.2.1.1 | Operate reliably under variable conditions, failures and adversarial threats | 🟡 | Input validation and ranges in the ML service; required-input gate; assistant tested with rule-breaking prompts (evaluation set). No formal adversarial testing. |
| 3.1.2.1.2 | Graceful degradation and fallback | ✅ | Missing required data returns `insufficient_data`, never a guess; if the LLM fails the assistant shows source passages as written and the copilot falls back to a labelled scripted summary; model card page says when the model service is down. |
| 3.1.2.1.3 | Safety testing and failure-mode analysis before deployment | 🟡 | P0 end-to-end safety checks run as scripts; assistant evaluation (`npm run rag:eval`). No written failure-mode analysis. |
| 3.1.2.1.4 | Continuous post-deployment monitoring with alerts | ❌ | Live panel measures on the Evidence page; no automated drift or anomaly alerts. Prototype is not deployed clinically. |
| 3.1.2.2.1 | Feedback mechanisms for monitoring and improvement | 🟡 | Clinician discard reasons and oversight counts on the Evidence page *(PR #11)*; assistant misses listed on the Evidence page. |
| 3.1.2.2.2 | Automated and human feedback loops including real-world outcomes | 🟡 | Human loop as above; no outcome data is collected yet (first pilot measure, per technical documentation). |

### 3.1.3 Accuracy and reliability

| Clause | Requirement (paraphrase) | Status | ReproAI evidence |
| --- | --- | --- | --- |
| 3.1.3.1.1 | Validate against benchmarks before deployment | ❌ | Not validated on patient outcomes; stated on the model card, in every assessment ("Prototype · not clinically validated") and in the docs. Calibration is checked only against a labelled simulation. |
| 3.1.3.1.2 | Test across diverse datasets and contexts | ❌ | As above. Simulation and evaluation sets are team-written. |
| 3.1.3.1.3 | Continuous post-deployment monitoring | ❌ | See 3.1.2.1.4. |
| 3.1.3.1.4 | Performance decline triggers review and correction | ❌ | No monitoring triggers yet. |
| 3.1.3.1.5 | Keep validation and monitoring documentation for audit | 🟡 | Evidence page with intervals; `src/lib/rag/eval-results.json` committed per run; model version stored with each estimate. |

### 3.1.4 Data privacy and cybersecurity

| Clause | Requirement (paraphrase) | Status | ReproAI evidence |
| --- | --- | --- | --- |
| 3.1.4.1.1 | Formal security and privacy governance | 🏢 | Deploying entity. `docs/data-governance.md` describes the intended model. |
| 3.1.4.1.2 | Layered defences, threat modelling, secure development lifecycle | 🟡 | Role checks in middleware and in every API route; consent checks in the API; code review via pull requests. No written threat model. |
| 3.1.4.2.1–3 | Role-based access, MFA, least privilege, logged access | 🟡 | Roles enforced (`src/middleware.ts`); clinicians see only their own cases (`src/lib/clinician-scope.ts`); patients see only their own released data; views and decisions audit-logged (`src/lib/audit.ts`). **No multi-factor authentication.** No periodic access review. |
| 3.1.4.3.1 | Secure code review and automated vulnerability scanning | ❌ | Pull-request review only; no automated scanning (e.g. OWASP/NIST-based) in CI. |
| 3.1.4.3.2 | Keep systems updated | 🟡 | Dependencies managed with npm and pip; no update policy. |
| 3.1.4.4.1 | Privacy by design, data minimisation, purpose-specific, consent-aligned | ✅ | Five separate consents (clinician access, lab results, wearables, partner sharing, population analytics), each revocable and enforced in the API (`src/lib/consent.ts`); data used only for care, never for employment or insurance (stated in the consent text). |
| 3.1.4.4.2 | Encryption at rest and in transit, key management; no training on production data | 🟡 | In transit: HTTPS and TLS to the database. **At rest: not applied** (helper exists in `src/lib/encryption.ts`; known limitation). The model is not trained on any data, so production data is never used for training. |
| 3.1.4.4.3 | Anonymisation, differential privacy, secure computation, federated learning | 🟡 | Population insight is anonymous counts with cells under 5 suppressed (`src/lib/insights.ts`). No differential privacy, secure computation or federated learning. |
| 3.1.4.5.1 | Compute and storage in the UAE, remote access from the UAE | ❌ 🏢 | Prototype uses a cloud database and LLM providers outside the UAE. Production needs UAE hosting (technical documentation, roadmap). |
| 3.1.4.5.2–3 | Segmented networks, intrusion detection, centralised logging | 🏢 | Hosting responsibility. Application audit log exists. |
| 3.1.4.6.1–2 | Physical security of facilities and hardware | 🏢 | Hosting responsibility. |

### 3.1.5 Fairness and equity

| Clause | Requirement (paraphrase) | Status | ReproAI evidence |
| --- | --- | --- | --- |
| 3.1.5.1.1 | Training, validation and test data reflect the target population | ❌ | No training data; curves come mostly from UK, European and US sources, and transferability to the UAE is unknown (model card *(PR #10)*). |
| 3.1.5.1.2 | Regular representativeness audits; flag subgroup gaps | 🟡 | Evidence page reports baseline coverage and referral follow-through by sex and age group, warns that small groups are unstable, and flags that nationality is not recorded. Assistant measured separately for Arabic questions *(PR #11)*. |
| 3.1.5.1.3 | Bias detection; traceable mitigation | 🟡 | Subgroup reporting as above; no bias-mitigation methods applied yet. |

### 3.1.6 Transparency and explainability

| Clause | Requirement (paraphrase) | Status | ReproAI evidence |
| --- | --- | --- | --- |
| 3.1.6.1.1 | Tell patients and clinicians when AI contributes, its function and limits | ✅ | Every assessment shows its evidence status; patient views explain that a clinician reviewed the result; landing page and model card *(PR #10)* describe what the model does and does not do. |
| 3.1.6.1.2 | Plain-language summaries for diverse audiences | ✅ | Patient views in plain English and Arabic with tiers and percentiles; clinician views with the estimate and its 95% interval. |
| 3.1.6.1.3 | Right to opt out; clear consent | 🟡 | Consents are separate and revocable at any time; a patient can withdraw care-team access, which blocks assessments. There is no single explicit "opt out of AI" switch. |
| 3.1.6.2.1 | Document data sources, provenance, preprocessing, limitations | ✅ | Every lab value carries its source and date (`LabResult.source`); model card lists evidence sources and limitations *(PR #10)*; guidance corpus cites document, section and page (`src/lib/rag/corpus.ts`). |
| 3.1.6.2.2 | Record model architecture, logic and decision criteria | ✅ | `ml-service/main.py` docstring and `/model-info`; technical documentation; model card *(PR #10)*. |
| 3.1.6.2.3 | End-to-end traceability of inputs, outputs and versions | ✅ | Each estimate is stored with its exact inputs and model version (`Prediction.inputs`, `modelVersion`); reviewer and review time stored; audit log; changes in git. |
| 3.1.6.3.1 | Role-specific explanations | ✅ | Clinician: estimate, 95% interval, exact Shapley factors, completeness. Patient: tier, age percentile, plain-language factors, clinician note. |
| 3.1.6.3.2 | Clinician view: rationale, confidence, next steps | ✅ | Factors with direction and size, 95% interval, cited options with rule IDs and sources. |
| 3.1.6.3.3 | Patient view: plain language, health-literacy aligned | 🟡 | Plain language in English and Arabic; not formally tested against a health-literacy standard. |

### 3.1.7 Accountability and responsibility

| Clause | Requirement (paraphrase) | Status | ReproAI evidence |
| --- | --- | --- | --- |
| 3.1.7.1.1 | Designated owners for each AI system | 🏢 | To be named by the deploying entity. |
| 3.1.7.1.2.1–3 | Named people for monitoring, reviewing overrides, reporting adverse outcomes | 🟡 🏢 | The product supports it: overrides (discards) need a reason and are counted *(PR #11)*; follow-up board. Named roles and adverse-event reporting are organisational. |
| 3.1.7.1.3 | All decisions and changes logged and traceable to a person | ✅ | Audit log with actor for views, releases and discards; reviewer stored on each assessment; version-controlled code. |
| 3.1.7.2.1 | Oversight, escalation and intervention mechanisms | ✅ | Clinician release required; discard with reason; urgent-message handling. |
| 3.1.7.2.2 | Clinicians keep final authority | ✅ | Nothing reaches a patient without clinician release; the assistants never calculate estimates. |
| 3.1.7.2.3 | Override mechanisms and audit trails | ✅ | Discard (override) with a required reason recorded in the audit log *(PR #11)*; release recorded with the reviewer. |

### 3.1.8 Sustainability

| Clause | Requirement (paraphrase) | Status | ReproAI evidence |
| --- | --- | --- | --- |
| 3.1.8.1.1–2 | Energy-efficient design | 🟡 | The scoring model is a small additive formula that runs on CPU in milliseconds; LLM calls use a low reasoning setting and short token budgets. No energy measurement or sustainability assessment. |
| 3.1.8.2.1 | Modular components | ✅ | Separate ML service, app, retrieval and LLM provider layers, each replaceable. |
| 3.1.8.2.2 | End-of-life with minimal e-waste | 🏢 | Hosting responsibility. |

## 3.2 Data management

| Clause | Requirement (paraphrase) | Status | ReproAI evidence |
| --- | --- | --- | --- |
| 3.2.1.1 | Data from authenticated sources with provenance | ✅ | Lab values entered or verified by clinicians, with source and date; patients cannot write lab values. |
| 3.2.1.2 | Privacy safeguards: encryption, role-based access, consent, auditable logs | 🟡 | Access, consent and audit in place; encryption at rest missing (see 3.1.4.4.2). |
| 3.2.1.3 | Every dataset tied to a defined AI task; no indefinite-purpose collection | ✅ | Data collected only for the declared care and consent purposes. |
| 3.2.1.4–6 | Third-party data due diligence; open-data licences; avoid web scraping | 🟡 🏢 | No third-party patient data. The guidance corpus paraphrases published documents with citations (Daman Thiqa, WHO); licence review by a legal office is organisational. No scraping of health data. |
| 3.2.1.7 | Patient data used only as consented | ✅ | Consent enforced in the API before each use (`src/lib/consent.ts`). |
| 3.2.2.1 | Report how attributes are used (feature, proxy, label) | 🟡 | Model card lists required and optional inputs per assessment *(PR #10)*; no explicit feature/proxy/label statement. |
| 3.2.2.2 | Report dataset limitations, including for unknown or "other" groups | 🟡 | Limitations on the model card and in the docs; not analysed by group. |
| 3.2.2.3 | Report gaps between dataset purpose and intended use | 🟡 | Model card states the curves come from treatment-outcome figures but the score is not a calibrated probability for any person *(PR #10)*. |
| 3.2.3.1–2 | Data clinically validated, appropriate, representative, complete | 🟡 | Clinician-verified inputs; required inputs never imputed; value ranges validated. No representativeness evidence (no training data). |
| 3.2.3.3 | Continuous data-quality monitoring and drift checks | ❌ | Not yet. |
| 3.2.4.1–2 | Unique dataset versions, immutable archive, change logs | 🟡 | Guidance corpus and evaluation set are versioned in git with each result file; no semantic dataset versioning or immutable archive. |
| 3.2.5.1–3 | Dataset documentation, metadata registry, datasheets or data cards | 🟡 | Corpus passages carry source, section, page and status; no formal datasheet or central registry. |

## 3.3 Risk management

| Clause | Requirement (paraphrase) | Status | ReproAI evidence |
| --- | --- | --- | --- |
| 3.3.1.1.1 | Risk assessment for all AI systems | 🟡 | Draft assessment of 18 risks in [risk-register.md](risk-register.md), built from the documented limitations; provisional ratings, not yet with the DoH protocol. |
| 3.3.1.1.2 | Track risks in a risk register | 🟡 | Draft register: [risk-register.md](risk-register.md) (v0.1). |
| 3.3.1.1.3 | Owner for each risk | 🟡 | Each risk has an owner role; named people not yet assigned. |
| 3.3.1.2.1–2 | Rate risks, apply controls, determine residual risk and treatment by tier | 🟡 | Provisionally rated (inherent and residual, with controls and further treatment) in the draft register; seven residual risks are high, none very high in the prototype as configured. The tiers (very high: prohibited; high: conformity assessment with DDGO before and after deployment; medium; low) are defined here and the method is in the Risk Management Protocol. ReproAI should be rated with that protocol before any deployment. |
| 3.3.1.3.1–2 | Monitor treatment plans and control effectiveness | 🟡 | Review cadence set in the draft register (every release, monthly in a pilot); not yet exercised. |
| 3.3.1.4.1 | Communicate risk assessments to stakeholders including DoH | 🏢 | On deployment. |

## 3.4 AI literacy

| Clause | Requirement (paraphrase) | Status | ReproAI evidence |
| --- | --- | --- | --- |
| 3.4.1.1.1–3 | Train staff in AI ethics and regulation, by role, with case studies | 🏢 | Organisational. The product supports it with the guided tour, model card and Evidence page. |
| 3.4.1.2.1–3 | Help staff integrate AI, assess outputs critically, know when human judgement prevails | 🟡 | Interval, completeness, evidence status and limitations are shown next to every estimate; "not in ReproAI's guidance" when the assistant cannot answer from a source. |
| 3.4.1.2.4 | Track literacy metrics on dashboards | 🏢 | Organisational. |

## Sections 4–6

- **4. Roles.** The standard names a Product Owner, Digital Governance Specialist, Data Users,
  Data Scientist and Legal Affairs. For a pilot, the team and the host clinic should name who
  holds each role.
- **5. Monitoring and evaluation.** Periodic compliance reporting to DoH and internal audits are
  the deploying entity's duty; the Evidence page and audit log provide inputs.
- **6. Enforcement.** Sanctions follow the Abu Dhabi healthcare disciplinary regulations.

## Priority gaps before any pilot

1. Re-rate the draft [risk register](risk-register.md) with the DoH Responsible AI Risk
   Management Protocol and name an owner for each risk (3.3.1).
2. Clinical validation and recalibration on local outcomes (3.1.3).
3. Encryption at rest with managed keys, MFA, and UAE hosting (3.1.4.2, 3.1.4.4.2, 3.1.4.5.1).
4. Clinician and patient co-design sessions (3.1.1.1.1).
5. Automated post-deployment monitoring and drift alerts (3.1.2.1.4, 3.1.3.1.3, 3.2.3.3).
6. Vulnerability scanning in CI (3.1.4.3.1).
7. An explicit "opt out of AI-assisted assessment" choice alongside the existing consents (3.1.6.1.3).
