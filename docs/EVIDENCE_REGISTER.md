# ReproAI Clinical Evidence Register & Governance Framework

> **Challenge Track:** Future Health Digital Innovation Challenge (Abu Dhabi: DoH / ADPHC / Inception / MBZUAI)  
> **Official Track:** `[Fertility] Reproductive Potential` (Challenge 02)  
> **Governance Standard:** Zero Assumptions, Evidence-First Architecture, Explicit Limitations  

---

## 1. Executive Summary & Clinical Intent

ReproAI provides a longitudinal, evidence-informed perspective on reproductive potential for couples undergoing or considering assisted reproduction. In strict adherence to the Abu Dhabi Department of Health (DoH) and ADPHC guidelines, **ReproAI does not generate deterministic, ungrounded "fertility scores"**. Instead, it computes calibrated, probabilistic trajectories, separating **modifiable lifestyle/metabolic factors** from **non-modifiable physiological baselines**, while establishing explicit clinical boundaries.

---

## 2. Core Clinical Guidelines & Reference Standards

Every parameter, threshold, and clinical recommendation implemented in the ReproAI backend is cited directly from peer-reviewed literature and international reproductive society standards:

| Reference ID | Clinical Standard / Guideline | Issuing Body | Implementation in ReproAI |
| :--- | :--- | :--- | :--- |
| **REF-WHO-2023** | *WHO manual for the standardized investigation and diagnosis of the infertile couple* (2023) | World Health Organization (WHO) | Underpins longitudinal couple triage, infertility duration thresholds (> 12 months under 35, > 6 months over 35), and ovulatory monitoring guidelines. |
| **REF-WHO-SEMEN6** | *WHO laboratory manual for the examination and processing of human semen* (6th ed., 2021) | World Health Organization (WHO) | Defines reference lower limits for normozoospermia: sperm concentration $\ge 15 \times 10^6$ spermatozoa/mL. Triggers male-factor subfertility screening when concentration $< 15\text{ M/mL}$. |
| **REF-ESHRE-2020** | *ESHRE Guideline: Ovarian Stimulation for IVF/ICSI* (2020) | European Society of Human Reproduction and Embryology (ESHRE) | Calibrates oocyte yield expectations based on maternal age and antral follicular response. |
| **REF-POSEIDON** | *The POSEIDON criteria for low ovarian response* (Alviggi et al., 2016; Humaidan et al., 2019) | POSEIDON Group | AMH threshold $< 1.2\text{ ng/mL}$ used to classify diminished ovarian reserve and adjust confidence intervals for expected stimulation yield. |
| **REF-ASRM-PCOS** | *Recommendations from the international evidence-based guideline for the assessment and management of polycystic ovary syndrome* (Teede et al., 2023) | ASRM / Monash / ESHRE | Guides feature weighting for PCOS history, metabolic BMI considerations, and elevated risk of ovarian hyperstimulation syndrome (OHSS). |
| **REF-FHIR-R4** | *HL7 Fast Healthcare Interoperability Resources (R4)* | HL7 International | Governs JSON schema exports (`Observation` and `RiskAssessment` resources) for Abu Dhabi national exchanges (**Malafi** and **Sahhatna**). |

---

## 3. Longitudinal Wearable & Biomarker Criteria

### A. Basal Body Temperature (BBT) — LOINC `8310-5`
* **Evidence:** In a physiological ovulatory cycle, progesterone secretion from the corpus luteum elevates core body temperature by $0.3^\circ\text{C} - 0.5^\circ\text{C}$ throughout the luteal phase (biphasic curve).
* **Clinical Boundary in ReproAI:** A monophasic curve across $> 7$ consecutive readings during the anticipated luteal window triggers a clinician-side alert (`ALERT_RAISED`) for suspected anovulation or luteal phase deficiency.

### B. Sleep Duration & Circadian Regularity — LOINC `93832-4`
* **Evidence:** Chronic sleep deprivation ($< 5.0\text{ hours/night}$) disrupts the hypothalamic-pituitary-gonadal (HPG) axis, elevating baseline cortisol and altering pulsatile GnRH secretion (Lateef & Akintubosun, *Sleep & Infertility*, 2020).
* **Clinical Boundary in ReproAI:** Sustained mean sleep $< 5.0\text{h}$ across $\ge 3$ consecutive log events prompts structured clinician review.

---

## 4. Couple-Centric Rationale: Integrating Male Reproductive Health

In reproductive endocrinology, male-factor subfertility contributes to approximately 50% of all couple infertility cases (either as sole cause or combined). Historically, digital solutions focus exclusively on female cycle tracking, exacerbating female emotional burden and delaying paternal urological workup.

ReproAI integrates semen concentration (`sperm_count`, LOINC `9780-8`) directly into its multivariate ensemble:
1. **Clinical Justification:** Normalizing semen analysis early prevents costly, avoidable IVF cycle failures.
2. **Cultural Relevance:** In the UAE and MENA region, confidential, stigma-free digital intake encourages male partner participation before invasive clinical visits are required.

---

## 5. Formal System Limitations & Ethical AI Boundaries

In compliance with the Responsible AI framework of the Microsoft Foundry & MBZUAI competition:

1. **Screening vs. Diagnostic Separation:** ReproAI is a risk-stratification and clinical decision-support engine, **not a diagnostic medical device**. It does not diagnose tubal occlusions, uterine malformations, or genetic translocation syndromes.
2. **Uncertainty Calibration:** When laboratory tests (e.g., serum AMH or semen analysis) are missing, ReproAI dynamically widens its prediction intervals rather than hallucinating default medians.
3. **No Patient Alarmism:** Urgent alerts or low-probability notifications ($< 25\%$) are routed silently to the clinician dashboard (`FollowUp` queue) to enable physician-led outreach.
4. **Data Protection:** All health data at rest is encrypted with **AES-256-GCM**, access is protected by HTTP-only JWTs, and every clinical query is logged to an append-only `AuditLog` table.

