# ReproAI risk register (draft)

Starter register for clause 3.3.1 of the DoH Responsible AI Standard (V1, Oct 2025), which
requires a risk assessment, a risk register and an owner for every risk. See
[doh-responsible-ai-mapping.md](doh-responsible-ai-mapping.md).

**Status: draft, prototype stage.** Likelihood and impact are the team's judgement, not a formal
assessment. The official rating method is the DoH *Responsible AI Risk Management Protocol*
(DoH/Protocol/DDGO/RALRM/V1/2025, Annex 1, in `docs/`); the re-rating under it is in
[Rating under the DoH protocol](#rating-under-the-doh-protocol-annex-1) below. The provisional
L×I scores are kept for traceability.
Owners are roles; names are to be assigned by the team and, at pilot, by the host clinic.

## Rating scale (provisional)

**Likelihood** (L): 1 rare · 2 unlikely · 3 possible · 4 likely · 5 almost certain.
**Impact** (I): 1 negligible · 2 minor · 3 moderate (avoidable distress, delay or rework) ·
4 major (wrong clinical decision, privacy breach affecting individuals) · 5 severe (serious
patient harm, large breach, regulatory sanction).

**Score** = L × I. Bands, aligned in name with the standard's tiers (3.3.1.2.2):
1–4 Low · 5–9 Medium · 10–16 High · 20–25 Very high.

*Inherent* is the rating with no controls; *residual* is with the controls already in the
prototype. Under the standard, a very high residual risk means the system must not be deployed,
and a high residual risk needs a conformity assessment with DoH DDGO before and after deployment.

## Register

| ID | Risk | Category | Inherent L×I | Controls in place | Residual L×I | Further treatment | Owner (role) | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R1 | The estimate is miscalibrated for UAE patients: the curves are literature-derived, mostly from UK, European and US sources, and not validated locally | Model | 5×4 = 20 Very high | Estimate shown only to clinicians, always with its 95% interval; patients see a tier and their AMH compared with a typical value for age only; "not clinically validated" shown on every assessment; model card states it is not a calibrated probability | 4×3 = 12 High | Recalibrate and externally validate on Abu Dhabi outcomes before any clinical use; real-world calibration as the first pilot measure | Product owner, data scientist | Open |
| R2 | False reassurance: a reassuring tier or "typical range" when reserve is actually reduced, partly from test-to-test AMH variation (about 1 in 9 truly low reserves missed in the simulation) | Clinical safety | 4×5 = 20 Very high | Reference limits, dates and provenance on every lab; repeat-testing suggestions; clinician review before release; red-flag rules regardless of the estimate; simulation reports false reassurance on the Evidence page | 3×4 = 12 High | Model measurement error and trends; repeat-test prompt when a value is near the limit; measure false reassurance in the pilot | Clinical lead, data scientist | Open |
| R3 | An estimate is produced from incomplete or wrong inputs | Clinical safety | 4×4 = 16 High | Required inputs gate: no estimate when missing, nothing imputed; completeness shown; patients cannot write lab values; clinician-verified labs with source and date; workflow strip shows missing data *(PR #11)* | 2×3 = 6 Medium | Laboratory feed from Malaffi instead of manual entry | Product owner | Open |
| R4 | A patient sees an unreviewed draft or a probability | Clinical safety, transparency | 3×4 = 12 High | Patients see RELEASED assessments only; report route clinician-only (fixed in PR #8, after a leak was found); P0 checks | 1×4 = 4 Low | Add an automated test for patient-visible routes | Engineering lead | Mitigated |
| R5 | The assistant states something unsupported or wrong (hallucination) | Clinical safety, AI | 4×4 = 16 High | Retrieval before every answer; abstains when nothing relevant; every sentence must cite a passage; number, wording, quote and attribution checks; patients see only verified sentences; urgent-symptom fixed reply; evaluation on the Evidence page | 2×3 = 6 Medium | Clinician review of a sample of answers; expand the corpus only with real sources | Product owner | Open |
| R6 | Arabic speakers get less help: the guidance corpus is English only, so most Arabic questions are refused; parts of the patient UI are English only | Equity | 5×3 = 15 High | Refusal rather than an unsourced answer; Arabic measured and shown on the Evidence page *(PR #11)*; Arabic UI in both portals for most screens | 5×2 = 10 High | Translate and clinically review the corpus; finish Arabic for intake and tracking pages; native-speaking clinician review of all Arabic | Product owner | Open |
| R7 | Unequal performance across groups cannot be detected: nationality and language are not recorded; live samples are small | Equity | 4×3 = 12 High | Evidence page reports by sex and age group and warns that small groups are unstable; no fairness claim made | 4×2 = 8 Medium | Record nationality and language with consent; subgroup reporting in the pilot | Data scientist | Open |
| R8 | Personal health data is exposed from the database | Privacy, security | 3×5 = 15 High | Role-based access in middleware and every route; clinicians limited to their own cases; consent checks; audit log; TLS in transit; AES-256-GCM encryption at rest on sensitive text fields (name, medical history, clinician notes, assessment inputs and factors, chat) via Prisma client extension in `src/lib/db.ts`; numeric lab values and emails are not encrypted; key held in an environment variable | 1×4 = 4 Low | Azure Key Vault / managed HSM key rotation for production (3.1.4.4.2) | Engineering lead | Mitigated |
| R9 | Account takeover: password-only sign-in, no multi-factor authentication | Security | 3×4 = 12 High | JWT cookie sessions; no open patient sign-up (invitation only); clinician accounts provisioned | 3×4 = 12 High | Multi-factor authentication for clinicians first (3.1.4.2); session and lockout policy | Engineering lead | Open |
| R10 | Data stored or processed outside the UAE: cloud database and LLM providers abroad | Regulatory, privacy | 5×4 = 20 Very high | Demonstration data is synthetic; no real patient data in the prototype | 5×1 = 5 Medium (prototype only) | UAE-hosted database and LLM (or UAE-region Azure) before any real data (3.1.4.5.1) | Engineering lead, deploying entity | Open |
| R11 | Consent is bypassed or misunderstood | Privacy | 3×4 = 12 High | Five separate consents, each revocable, enforced in the API and audit-logged; plain-language consent text in English and Arabic; non-discrimination guarantee | 1×4 = 4 Low | Explicit "opt out of AI-assisted assessment" choice (3.1.6.1.3); user testing of the consent screens | Product owner | Open |
| R12 | Clinicians over-trust the estimate (automation bias) | Clinical safety | 4×4 = 16 High | Interval, completeness, factors and evidence status beside every estimate; clinician must write a note to release; discards need a reason *(PR #11)*; model card | 3×3 = 9 Medium | Clinician training with cases where the model is wrong (3.4); monitor release-without-change rates | Clinical lead | Open |
| R13 | An external LLM provider is unavailable or changes behaviour | Operational, AI | 4×2 = 8 Medium | Extractive fallback (sources shown as written); copilot scripted summary; provider and model recorded with each evaluation run | 3×1 = 3 Low | Pin model versions; re-run the evaluation after any provider change | Engineering lead | Mitigated |
| R14 | Vulnerable code reaches production: no automated security scanning | Security | 3×4 = 12 High | Pull-request review; TypeScript strict; lint | 3×3 = 9 Medium | Dependency and code scanning in CI (OWASP/NIST-based) (3.1.4.3.1) | Engineering lead | Open |
| R15 | Model or data drift goes unnoticed after deployment | Model | 3×4 = 12 High | Model version stored with every estimate; Evidence page live measures | 3×3 = 9 Medium | Automated monitoring and alerts on input distributions, release and discard rates (3.1.2.1.4) | Data scientist | Open |
| R16 | Distress or anxiety from reproductive-health results | Clinical safety, wellbeing | 3×3 = 9 Medium | No deterministic "fertility score"; plain, non-alarming language; a tier and an AMH-for-age comparison instead of a probability; clinician note with every release; options to discuss rather than verdicts | 2×3 = 6 Medium | Measure anxiety and informed-choice quality in the pilot | Clinical lead | Open |
| R17 | The product is built without clinician and patient input and does not fit real workflows | Adoption, safety | 4×3 = 12 High | Design follows the Thiqa guideline and the Challenge 02 brief; FHIR export | 4×3 = 12 High | Co-design sessions with clinicians and patients before the pilot (3.1.1.1.1) | Product owner | Open |
| R18 | No named people are accountable for monitoring, overrides and adverse-event reporting | Governance | 4×3 = 12 High | The product records overrides and reviewers; audit log | 4×3 = 12 High | Name the product owner, clinical lead and governance roles (standard section 4, 3.1.7.1) | Team lead, deploying entity | Open |

## Rating under the DoH protocol (Annex 1)

The protocol rates risk in three steps: **asset criticality** (1–4), **exposure factor** =
likelihood × impact banded 1–3 Very low, 4–6 Low, 7–12 Medium, 13–20 High, 21+ Very high, and
**risk rating** read from its criticality × exposure matrix (same bands).

**Asset criticality: High (3).** ReproAI is clinical decision support that can influence
treatment, with complete human oversight (the protocol's own example for High). The likelihood
and impact scales above already match the protocol's 1–5 scales, so exposure uses the scores in
the register.

| ID | Inherent exposure → rating | Residual exposure | Residual rating | Treatment (protocol step) |
| --- | --- | --- | --- | --- |
| R1 | 20 High → 16 High | 12 Medium | 12 Medium | Mitigate (step 7): local recalibration and validation |
| R2 | 20 High → 16 High | 12 Medium | 12 Medium | Mitigate |
| R3 | 16 High → 16 High | 6 Low | 8 Medium | Mitigate |
| R4 | 12 Medium → 12 Medium | 4 Low | 8 Medium | Mitigate |
| R5 | 16 High → 16 High | 6 Low | 8 Medium | Mitigate |
| R6 | 15 High → 16 High | 10 Medium | 12 Medium | Mitigate |
| R7 | 12 Medium → 12 Medium | 8 Medium | 12 Medium | Mitigate |
| R8 | 15 High → 16 High | 4 Low | 8 Medium | Mitigate: managed keys, extend to lab values |
| R9 | 12 Medium → 12 Medium | 12 Medium | 12 Medium | Mitigate |
| R10 | 20 High → 16 High | 5 Low (synthetic data only) | 8 Medium | Mitigate; **Very high and must be avoided** if real patient data is processed outside the UAE |
| R11 | 12 Medium → 12 Medium | 4 Low | 8 Medium | Mitigate |
| R12 | 16 High → 16 High | 9 Medium | 12 Medium | Mitigate |
| R13 | 8 Medium → 12 Medium | 3 Very low | 3 Very low | Accept and review (step 10) |
| R14 | 12 Medium → 12 Medium | 9 Medium | 12 Medium | Mitigate |
| R15 | 12 Medium → 12 Medium | 9 Medium | 12 Medium | Mitigate |
| R16 | 9 Medium → 12 Medium | 6 Low | 8 Medium | Mitigate |
| R17 | 12 Medium → 12 Medium | 12 Medium | 12 Medium | Mitigate |
| R18 | 12 Medium → 12 Medium | 12 Medium | 12 Medium | Mitigate |

**Result.** Under the protocol, no residual risk is High or Very high in the prototype as
configured; 17 are Medium and need a treatment plan with an owner (step 7), and one is Very low.
Because the asset is High criticality, any residual exposure of Low or above rates Medium, so
"Low" alone is not reachable without lowering likelihood to Very low.

Two cautions: the protocol's step 6 says a system still classified high risk after controls
must not be implemented, so R10 (data residency) is a hard gate before real data; and a DoH
review of this register (protocol step 11.2) is expected before a pilot.

## Summary

| Residual band | Risks |
| --- | --- |
| *(Provisional team scale, kept for traceability; see the protocol rating above.)* | |
| Very high | None in the prototype as configured (synthetic data, clinician-only estimates). R10 becomes very high the moment real patient data is used outside the UAE. |
| High | R1, R2, R6, R9, R17, R18 |
| Medium | R3, R5, R7, R10 (prototype only), R12, R14, R15, R16 |
| Low | R4, R8, R11, R13 |

Because several residual risks are high, the standard (3.3.1.2.2.2) would require a conformity
assessment with DoH DDGO before and after any deployment.

## Review

- Review this register at every release and at least monthly during a pilot (3.3.1.3).
- Keep the protocol rating above current; reassess at planned intervals and on significant change (protocol step 10).
- Share the current register with stakeholders and DoH on deployment (3.3.1.4.1).

| Version | Date | Change |
| --- | --- | --- |
| 0.1 | 13 Nov 2026 | First draft from the documented limitations and the DoH mapping |
| 0.2 | 16 Nov 2026 | Re-rated with the DoH Responsible AI Risk Management Protocol (Annex 1); asset criticality High |
