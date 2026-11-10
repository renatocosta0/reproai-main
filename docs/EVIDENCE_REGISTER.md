# ReproAI Clinical Evidence Register & Governance Framework

> **Challenge Track:** Future Health Digital Innovation Challenge (Abu Dhabi: DoH / ADPHC / Inception / MBZUAI)  
> **Official Track:** `[Fertility] Reproductive Potential` (Challenge 02)  
> **Architecture Paradigm:** Individual-First with Collaborative Couple Pairing (Individual-First, Couple-Ready)  
> **Governance Standard:** Zero Assumptions, Evidence-First Architecture, Explicit Limitations, Granular Consent  

---

## 1. Executive Summary & Strategic Positioning

ReproAI delivers a longitudinal, evidence-informed platform for reproductive potential designed in direct alignment with Abu Dhabi's Department of Health (DoH) and ADPHC life-course prevention vision.

### Key Shift: From Infertility Treatment to Life-Course Reproductive Autonomy
Traditional fertility platforms only engage couples who are already struggling to conceive in private IVF clinics. ReproAI transforms this paradigm:
1. **The Individual is the Unit of Autonomy & Prevention:** Single individuals, young adults, and citizens entering adulthood can monitor ovarian reserve, andrological parameters, circadian health, and explore proactive **fertility preservation (oocyte/sperm vitrification)** years before conception.
2. **The Couple is the Collaborative Unit of Conception:** When two individuals decide to plan pregnancy, they voluntarily pair via cryptographically secure tokens (`POST /api/pairing/invite` & `POST /api/pairing/accept`) to unlock joint bivariate conception prognostics.
3. **Pillar 5 Compliance (Granular, Revocable Consent):** Either individual can revoke pairing at any time (`POST /api/pairing/revoke`). Individual longitudinal observations and health records remain completely intact and private under their own `userId`.

ReproAI **does not generate deterministic "fertility scores"**. Instead, it computes calibrated, probabilistic trajectories, separating **modifiable lifestyle/metabolic factors** from **non-modifiable physiological baselines**, while establishing explicit clinical boundaries.

---

## 2. Core Clinical Guidelines & Reference Standards

Every parameter, threshold, and clinical recommendation implemented in the ReproAI backend is cited directly from peer-reviewed literature and international reproductive society standards:

| Reference ID | Clinical Standard / Guideline | Issuing Body | Implementation in ReproAI |
| :--- | :--- | :--- | :--- |
| **REF-WHO-2023** | *WHO manual for the standardized investigation and diagnosis of the infertile couple* (2023) | World Health Organization (WHO) | Underpins longitudinal couple triage, infertility duration thresholds (> 12 months under 35, > 6 months over 35), and ovulatory monitoring guidelines. |
| **REF-WHO-SEMEN6** | *WHO laboratory manual for the examination and processing of human semen* (6th ed., 2021) | World Health Organization (WHO) | Defines reference lower limits for normozoospermia: sperm concentration $\ge 15 \times 10^6$ spermatozoa/mL. Triggers male-factor subfertility screening when concentration $< 15\text{ M/mL}$. |
| **REF-ESHRE-PRESERV** | *ESHRE Guideline: Female fertility preservation* (2020) | European Society of Human Reproduction and Embryology (ESHRE) | Calibrates individual oocyte vitrification advice: age $< 35$ identified as optimal window yielding $\sim 75-80\%$ cumulative live-birth rate per $15-20$ cryopreserved oocytes. |
| **REF-ASRM-CRYOPRE** | *ASRM Practice Committee: Cryopreservation of Gametes* (2021) | American Society for Reproductive Medicine (ASRM) | Evidence base for individual sperm and oocyte cryopreservation recommendations. |
| **REF-ESHRE-2020** | *ESHRE Guideline: Ovarian Stimulation for IVF/ICSI* (2020) | European Society of Human Reproduction and Embryology (ESHRE) | Calibrates oocyte yield expectations based on maternal age and antral follicular response (AFC). |
| **REF-POSEIDON** | *The POSEIDON criteria for low ovarian response* (Alviggi et al., 2016; Humaidan et al., 2019) | POSEIDON Group | AMH threshold $< 1.1\text{ ng/mL}$ used to classify diminished ovarian reserve and adjust confidence intervals for expected stimulation yield. |
| **REF-ASRM-PCOS** | *Recommendations from the international evidence-based guideline for the assessment and management of polycystic ovary syndrome* (Teede et al., 2023) | ASRM / Monash / ESHRE | Guides feature weighting for PCOS history, metabolic BMI considerations, and elevated risk of ovarian hyperstimulation syndrome (OHSS). |
| **REF-ADPHC-PREMARITAL** | *Abu Dhabi Premarital Screening Program Guidelines* | Abu Dhabi Public Health Center (ADPHC) | Grounds individual screening across reproductive age groups into public health pathways. |
| **REF-FHIR-R4** | *HL7 Fast Healthcare Interoperability Resources (R4)* | HL7 International | Governs JSON schema exports (`Patient`, `Observation`, and `RiskAssessment` resources) for Abu Dhabi national exchanges (**Malafi** and **Sahhatna**). |

---

## 3. Longitudinal Wearable & Biomarker Criteria

### A. Basal Body Temperature (BBT) — LOINC `8310-5`
* **Evidence:** In a physiological ovulatory cycle, progesterone secretion from the corpus luteum elevates core body temperature by $0.30^\circ\text{C} - 0.50^\circ\text{C}$ throughout the luteal phase (Roetzer Coverline Rule / WHO 2023).
* **Clinical Boundary in ReproAI:** A monophasic curve with shift $< 0.30^\circ\text{C}$ across $\ge 3$ consecutive cycles triggers a clinician-side triage alert (`ALERT_RAISED`) for suspected anovulation or luteal phase defect.

### B. Sleep Duration & Circadian Regularity — LOINC `93832-4`
* **Evidence:** Chronic sleep deprivation ($< 5.0\text{ hours/night}$) or circadian fragmentation ($\sigma > 1.75\text{h}$) disrupts the hypothalamic-pituitary-gonadal (HPG) axis, elevating baseline cortisol and altering pulsatile GnRH secretion (Lateef & Akintubosun, *Sleep & Infertility*, 2020).
* **Clinical Boundary in ReproAI:** Sustained mean sleep $< 5.0\text{h}$ prompts automated clinical follow-up recommendations.

---

## 4. Individual vs. Couple Scope Separation

ReproAI segregates outputs depending on whether the assessment is requested by an individual or a paired couple:

### Individual Scope (`scope: "INDIVIDUAL"`)
- **Focus:** Ovarian reserve trajectory, andrological baseline, lifestyle modifiability, and gamete cryopreservation readiness.
- **Tiers:** `OPTIMAL`, `AGE_APPROPRIATE`, `REDUCED_RESERVE`, `CLINICAL_ATTENTION_NEEDED`.
- **Preservation Guidance:** Specific clinical time horizons based on ESHRE 2020 / ASRM 2021.
- **Actionable Options:** Metabolic optimization, baseline hormonal workup, elective gamete vitrification consultation.

### Couple Scope (`scope: "COUPLE"`)
- **Focus:** Bivariate live-birth success probability across natural and assisted reproduction pathways (IUI/IVF).
- **Attribution:** Exact Shapley value decomposition ($\phi_i(x) = f_i(x_i) - \mathbb{E}[f_i(X)]$) explicitly decoupling maternal vs. paternal contributors.
- **Triage:** Automatic closed-loop referral generation if estimated live-birth rate is $< 25\%$.

---

## 5. Formal System Limitations & Ethical AI Boundaries

In compliance with the Responsible AI framework of the Microsoft Foundry & MBZUAI competition:

1. **Screening vs. Diagnostic Separation:** ReproAI is a risk-stratification and clinical decision-support engine, **not a diagnostic medical device**. It does not diagnose tubal occlusions, uterine malformations, or genetic translocation syndromes.
2. **Uncertainty Calibration:** When laboratory tests (e.g., serum AMH or semen analysis) are missing, ReproAI dynamically widens its prediction intervals rather than hallucinating default medians.
3. **No Patient Alarmism:** Urgent alerts or low-probability notifications ($< 25\%$) are routed silently to the clinician dashboard (`FollowUp` queue) to enable physician-led outreach.
4. **Data Protection:** All health data at rest is encrypted with **AES-256-GCM**, access is protected by HTTP-only JWTs, and every clinical query is logged to an append-only `AuditLog` table.
5. **Granular Consent:** Data sharing between partners is 100% voluntary and revocable. Revoking a partnership does not purge or compromise either individual's longitudinal health observations.
