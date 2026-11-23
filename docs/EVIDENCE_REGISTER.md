# Evidence register

Challenge: Future Health Digital Innovation Challenge (DoH, ADPHC, Inception, MBZUAI), Fertility track, Challenge 02 "Reproductive Potential".

This register lists every external source ReproAI relies on, what it is used for, and how far the prototype's use of it has been checked. It replaces an earlier version that over-stated calibration and encryption.

Status labels: **Runs in prototype** · **Simulated** · **Proposed for production** · **To verify** (cited but not yet checked against the primary text).

## 1. What ReproAI claims, and what it does not

- ReproAI does **not** produce a fertility score. It shows markers over time against reference limits, a plain-language tier, cited options and, for clinicians reviewing couples who are trying, a model estimate with a model-based interval.
- The scoring model is **literature-derived and hand-set**. It is not trained, calibrated or validated on patient data, and no accuracy, discrimination or calibration figure is claimed.
- Calibration and false-reassurance results on the Evidence page come from a **synthetic cohort**. The calibration panel is a pipeline self-check: the simulated outcomes share assumptions with the model.
- All data in the prototype is **synthetic**. There has been no user testing.

## 2. Sources used by the rules engine and the assistants

These are the sources in the retrieval corpus (`src/lib/rag/corpus.ts`), quoted by section and page.

| ID | Source | Used for | Status |
| --- | --- | --- | --- |
| THIQA | Daman, *Thiqa Coverage for Assisted Reproductive Treatment & Services*, adjudication guideline v3.6 (2025) | Reduced ovarian reserve (AMH < 1.1 ng/mL or AFC < 5–7); earlier-assessment red flags; semen lower limits; BMI 19–40 and dietitian advice for BMI 35–40; social egg freezing (2 cycles, 5-year storage, psychological assessment) | Runs in prototype; passages cite section and page |
| WHO25 / WHO25_FULL | WHO, infertility guideline (2025), with its contemporaneous news release | Referral after 12 months trying (6 months over 35); prevention and primary care; male-factor assessment; age-related fertility decline and ovarian reserve; low-cost lifestyle advice before or during treatment (diet, alcohol, smoking, activity and weight management) | Runs in prototype. `WHO25_FULL` passages are read from the full guideline; earlier `WHO25` passages remain labelled as news-release summaries |
| ACOG_FAM / ACOG_INFERTILITY | American College of Obstetricians and Gynecologists, *Fertility Awareness-Based Methods of Family Planning* (FAQ024, reviewed Feb 2025) and *Evaluating Infertility* (FAQ136, reviewed May 2026) | What a basal-body-temperature pattern can indicate, how to measure it, and its retrospective limit for identifying ovulation | Runs in prototype; direct patient guidance pages are cited in the assistant |
| SLEEP_SR | Caetano et al., *Impact of sleep on female and male reproductive functions: a systematic review* (2021) | Limited, non-causal explanation of the observed associations between sleep patterns and fertility or IVF outcomes | Runs in prototype; heterogeneity and need for further research are shown with the claim |
| ESHRE_FFP | ESHRE guideline: female fertility preservation (2020) | Preservation discussion timing; AMH interpretation | Runs in prototype |
| WHO_SEMEN | WHO semen laboratory manual, 6th ed. (2021), via a published review | Semen interpretation; repeat testing | Runs in prototype. The limits applied are the WHO 2010 values used by Thiqa (15 M/mL); 6th edition values (16 M/mL) shown for comparison |
| REPROAI | ReproAI's own documentation | How the product works (internal, not clinical evidence) | Runs in prototype |

Rule-by-rule sources are in `src/lib/pathways.ts` and [technical-documentation.md](technical-documentation.md). One rule (OPT-SLEEP, aim for 7+ hours of sleep) has **no guideline citation yet** and is labelled as general health advice.

## 3. Sources that shaped the scoring model

The model's curve shapes are informed by the sources below; the coefficients were set by the team, with no documented derivation from each table. See `GET /model-info` and `/model-card`.

| Source | Shapes | Status |
| --- | --- | --- |
| HFEA, *Fertility treatment: trends and figures* (2022) | Female age curve | To verify: no table-to-coefficient mapping |
| CDC, ART National Summary (2022) | Female age curve | To verify |
| ESHRE ovarian stimulation and preservation guidelines (2020–2023); POSEIDON criteria | AMH curve; reduced-reserve threshold | Threshold runs in prototype; curve to verify |
| WHO semen reference values | Sperm concentration curve | Runs in prototype (WHO 2010 limits) |
| Bhattacharya et al. (2021) | Relative weight of predictors | To verify |

Known model limitations (also on the model card):

- The 95% interval uses a fixed, assumed standard error; it is not a validated prediction interval.
- The AMH-for-age figure is a ratio to an approximate typical AMH for age (50 = typical), not a population percentile. The typical-for-age curve needs a cited source.
- Paternal age uses a deliberately mild curve; its true effect is small and uncertain.
- Curves come mostly from UK, European and US data; transferability to the UAE population is unknown.

## 4. Wearable signals

| Signal | Rule in the prototype | Status |
| --- | --- | --- |
| Basal body temperature (LOINC 8310-5) | A sustained rise of about 0.3 °C after ovulation is the usual biphasic pattern; no such rise across the readings raises a clinician-side follow-up, worded as "not a diagnosis". | Runs in prototype. Threshold to verify against a primary source |
| Sleep duration (LOINC 93832-4) | Mean under 5 h or high night-to-night variation (≥ 3 nights) raises a clinician-side follow-up; under 7 h triggers general sleep advice. | Runs in prototype. Thresholds are team choices, not guideline values |

Wearable data is shown as trends and is **not** an input to the scoring model.

## 5. Abu Dhabi context (for the pitch, not the product logic)

| Fact | Source | Status |
| --- | --- | --- |
| UAE total fertility rate about 1.2–1.35 (2024–25); Emirati births down about 11% (2015–2022) | Khaleej Times; The National (see [challenge-02-benchmark.md](challenge-02-benchmark.md)) | Secondary sources; prefer an official statistic in the deck |
| Premarital screening expanded to 570 genetic conditions | DoH news release | Primary |
| Thiqa covers social egg freezing for eligible single members since Oct 2025 | Daman Thiqa guideline v3.6 | Primary |
| DoH Responsible AI Standard (Oct 2025) | DoH/ST/DDGO/RAI/V1/2025 (in `docs/`) | Primary; self-assessment in [doh-responsible-ai-mapping.md](doh-responsible-ai-mapping.md) |
| Malaffi Patient Risk Profile as precedent | DoH and Malaffi news release | Primary |

## 6. Interoperability standards

| Standard | Use | Status |
| --- | --- | --- |
| HL7 FHIR R4 | Export of Patient, Observation, RiskAssessment | Runs in prototype |
| LOINC | Codes for AMH, FSH, sperm concentration, BBT, sleep | Runs in prototype |
| Malaffi lab import; TAMM entry point | Production integration | Proposed for production |
