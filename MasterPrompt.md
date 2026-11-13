# MISSION BRIEFING: PRODUCTION-GRADE FRONTEND ARCHITECTURE FOR REPROAI
## Future Health Digital Innovation Challenge (Abu Dhabi: DoH / ADPHC / Inception / MBZUAI)
### Official Track: [Fertility] Reproductive Potential (Challenge 02)
### Business Model: B2B2C Physician-Led Digital Prescription & Longitudinal Remote Monitoring

---

### 1. EXECUTIVE CONTEXT & STRATEGIC POSITIONING
You are the **Lead Healthcare Frontend Architect & Senior UI/UX Engineer** for **ReproAI**.
The platform is an official contender in the **Future Health Digital Innovation Challenge** organized in Abu Dhabi by the **Department of Health (DoH)**, the **Abu Dhabi Public Health Center (ADPHC)**, **Inception**, and the **Mohamed bin Zayed University of Artificial Intelligence (MBZUAI)**.

The challenge explicitly specifies:
> *"Reproductive potential changes across the life course, but most people receive a meaningful assessment only when they are actively trying to conceive or are already experiencing difficulty. The challenge is not to provide a deterministic 'fertility score'; it is to create an evidence-led, understandable view of change over time that supports informed choices without creating anxiety, discrimination or false certainty."*

The backend has already been completely built, calibrated, and deployed with:
1. **Individual-First with Collaborative Couple Pairing (Individual-First, Couple-Ready):**
   - Single individuals and young adults independently track ovarian reserve, semen parameters, and lifestyle factors to plan early **fertility preservation (oocyte/sperm vitrification)** years before conception.
   - When two individuals decide to plan pregnancy, they voluntarily pair via cryptographically secure tokens (`POST /api/pairing/invite` & `POST /api/pairing/accept`) to unlock joint bivariate conception prognostics.
   - **Granular, Revocable Consent (Pillar 5):** Either partner can revoke pairing at any time (`POST /api/pairing/revoke`). Individual observations and health records remain 100% private and intact under their own `userId`.
2. **Clinical Predictive Engine v2.0 (FastAPI):** Continuous smooth splines, exact closed-form Shapley value (SHAP) attributions ($\phi_i(x) = f_i(x_i) - \mathbb{E}[f_i(X)]$), and delta-method 95% confidence intervals (Brier: 0.174, ROC-AUC: 0.792).
3. **Autonomous AI Agent with Tool-Calling (Phase 6 + Groq Fallback):** Real multi-turn agent (`POST /api/agent`) calling tools (`predict_fertility_success`, `search_guidelines` grounded in WHO/ESHRE, and external MCP tools) without hallucination.
4. **Longitudinal Wearables Ingestion:** WHO Roetzer Coverline Rule for ovulatory biphasic shift ($\Delta T \ge 0.30^\circ\text{C}$) and circadian sleep variability analysis ($\sigma > 1.75\text{h}$).
5. **Unified Clinician Prescription & Segregated Directory:** 
   - `POST /api/clinician/invite`: Prescribes digital access to either an **Individual Patient** (`scope: "INDIVIDUAL"`) or a **Couple** (`scope: "COUPLE"`).
   - `GET /api/clinician/couples`: Returns strictly segregated lists for **Couples** vs. **Individual Patients**, along with impact metrics.
6. **FHIR R4 Interoperability:** Exporting `Patient`, `Observation`, and `RiskAssessment` resources for Abu Dhabi national exchanges (**Malafi** & **Sahhatna**).

**YOUR MISSION:**
Implement a **complete, production-ready, enterprise-grade frontend from the ground up in Next.js 14 App Router (TypeScript + Tailwind CSS)** that consumes these live backend APIs with **ZERO MOCKED DATA**, faithfully adopting the design language in `Build ReproAI Fertility Platform/` as your visual reference, while expanding far beyond it into a world-class clinical SaaS.

---

### 2. STRICT ARCHITECTURAL & BUSINESS RULES

#### RULE A: B2B2C PHYSICIAN-LED PRESCRIPTION (ZERO OPEN REGISTRATION)
- **No Public Self-Registration for Patients:**
  - ReproAI is a physician-prescribed platform, NOT an open consumer self-diagnosis app.
  - Patients CANNOT create an account through an open "Sign Up" form. They enter the platform **strictly via an invitation token** issued by their clinic (`POST /api/clinician/invite`) or via a partner pairing link (`POST /api/pairing/invite`).
- **The Login Page (`src/app/(auth)/login/page.tsx`):**
  - Must NOT feature a generic "Create an account" link for patients.
  - Features role tabs (`Clinician` vs. `Patient`).
  - Below the patient login form, display a prominent clinical notice:
    > *"ReproAI is prescribed by licensed healthcare providers. If you are a new patient, please use the secure activation link sent to your email by your fertility clinic or partner."*
- **The Register Page (`src/app/(auth)/register/page.tsx`):**
  - **Token Gatekeeping:** Inspects the URL query parameter (`?token=...`).
  - If the token is missing or invalid: Renders an empathetic gatekeeping screen:
    > *"Invitation Required — ReproAI requires a clinical prescription or a partner pairing invite to activate an account. Please verify your invitation link or contact your clinic."*
  - If the token is present and valid: Displays the onboarding form collecting password, biological sex (`female` | `male`), age, and personal reproductive goal, submitting to `POST /api/auth/register` with `{ token, email, password, sex, role: "PATIENT" }`.

#### RULE B: ZERO MOCKED DATA
- Every metric, chart point, table row, user profile, and prediction must be fetched from and persisted to the live Next.js backend API routes (`/api/*`).
- Do NOT hardcode placeholder patients (e.g., remove static arrays like `Maya & Omar`). Fetch real data from `/api/clinician/couples`, `/api/patient/profile`, `/api/observations`, etc.

#### RULE C: DESIGN SYSTEM FAITHFULNESS
- Inspect and faithfully replicate the visual elegance, typography, and palette found in `Build ReproAI Fertility Platform/src/App.tsx` and `Build ReproAI Fertility Platform/src/index.css`:
  - **Colors:** Deep Teal (`#0c655e`), Dark Teal (`#094f49`), Mint / Soft Sage (`#dff2e9`), Warm Coral (`#de7467`), Cream (`#f8f5ef`), Canvas (`#f5f8f6`), Ink (`#173330`), Muted (`#71817d`), Line (`#e3eae6`).
  - **Typography:** `Manrope` for headings, `DM Sans` for body copy.
  - **Icons:** `lucide-react`.
- Clean Nordic/Emirati precision, avoiding sterile cold hospital blue and juvenile pastel pinks.

#### RULE D: SEX-ADAPTIVE CONTEXT-AWARE UI
- The patient interface must dynamically adapt based on the authenticated user's biological sex (`profile.sex`):
  - **Female view:** Ovarian reserve trajectory, AMH, antral follicle count (AFC), biphasic basal temperature curves, oocyte cryopreservation timelines (ESHRE 2020 Guidelines).
  - **Male view:** Semen parameters (WHO 6th Ed. Manual), motility, lifestyle/metabolic factors, sperm banking guidance.
  - **Paired Couple view:** Fuses both profiles to display joint conception probability, shared fertile window, and partner invitation/revocation controls.

#### RULE E: STRICT TYPESCRIPT COMPILATION
- `npx tsc --noEmit` must pass with **0 errors**. Use Next.js 14 server/client component boundaries correctly (`"use client"` where state/hooks are used).

---

### 3. LIVE BACKEND APIS TO CONSUME (CANONICAL REST MATRIX)

| Endpoint | Method | Payload / Response Contract | Purpose in Frontend |
| :--- | :--- | :--- | :--- |
| `/api/auth/register` | `POST` | `{ email, password, role: "PATIENT", sex, name?, token }` | Prescription-gated registration |
| `/api/auth/login` | `POST` | `{ email, password }` $\rightarrow$ `{ ok: true, role }` | Role-based authentication (HTTP-only cookie) |
| `/api/auth/logout` | `POST` | `{}` $\rightarrow$ `{ ok: true }` | Destroys session |
| `/api/auth/session` | `GET` | `{ session: { userId, role, coupleId } }` | Active session verification |
| `/api/patient/profile` | `GET` / `PATCH` | `{ profile, isPaired, partner, latestPrediction }` | Individual biological data, lifestyle, and partner status |
| `/api/pairing/invite` | `POST` | `{ recipientEmail }` $\rightarrow$ `{ ok: true, invite: { token, inviteUrl } }` | Patient invites partner to link into a couple |
| `/api/pairing/accept` | `POST` | `{ token }` $\rightarrow$ `{ ok: true, coupleId }` | Recipient accepts pairing token |
| `/api/pairing/revoke` | `POST` | `{}` $\rightarrow$ `{ ok: true, individualCoupleId }` | Pillar 5 revocable consent: unlinks couple with zero data loss |
| `/api/pairing/status` | `GET` | `{ isPaired, partner, sentInvites, receivedInvites }` | Real-time pairing hub state |
| `/api/predict` | `POST` | `{ age, bmi, amh?, sperm_count?, sex?, scope?: "INDIVIDUAL" \| "COUPLE" }` $\rightarrow$ `{ probability, confidence_low, confidence_high, factors, tier, preservation_guidance, modifiable_factors, non_modifiable_factors, limitations }` | ML inference with Shapley values and preservation guidance |
| `/api/observations` | `GET` / `POST` | `GET ?coupleId=&userId=` $\rightarrow$ `{ observations }` \| `POST { code, value, unit }` | Wearables vitals retrieval & logging |
| `/api/observations/bulk` | `POST` | `{ coupleId?, observations: [{ code: "8310-5", value: 36.72, effectiveAt }] }` $\rightarrow$ `{ analytics: { ovulatoryShiftDetected, thermalShiftDelta, sleepDisruptionDetected } }` | Bulk wearable sync + time-series anomaly detection |
| `/api/agent` | `POST` | `{ messages: [{ role: "user", content }] }` $\rightarrow$ `{ reply, toolsUsed, provider }` | Autonomous clinical AI Copilot with tool badges |
| `/api/clinician/invite` | `POST` / `GET` | `POST { scope: "INDIVIDUAL" \| "COUPLE", email, sex?, partnerEmail?, notes? }` $\rightarrow$ `{ inviteUrl }` \| `GET` $\rightarrow$ list of issued prescriptions | Clinician digital prescription endpoint for both Individuals and Couples |
| `/api/clinician/couples` | `GET` | `GET ?scope=INDIVIDUAL \| ?scope=COUPLE` $\rightarrow$ `{ individuals: [...], couples: [...], counts: {...}, impactMetrics: {...} }` | Segregated clinician patient directory |
| `/api/follow-up` | `GET` / `PATCH` | `GET` $\rightarrow$ list of alerts; `PATCH { id, status, note }` | Proactive closed-loop triage queue (`ALERT_RAISED` ➔ `CLOSED`) |
| `/api/fhir/export` | `GET` | `?coupleId=` or `?userId=` $\rightarrow$ official FHIR R4 Bundle | Export patient records to Abu Dhabi Malafi/Sahhatna |

---

### 4. REQUIRED PAGES & VIEWS SPECIFICATION

#### A. Authentication & Prescription Gate (`src/app/(auth)/*`)
- **`login/page.tsx`:**
  - Split-screen layout:
    - **Left story panel:** Brand mark (`HeartHandshake`), typography, value proposition (*"Fertility intelligence, made human"*), and trust badge (*"Abu Dhabi Digital Health Innovation · Challenge 02"*).
    - **Right login panel:** Role switcher tab (`Clinician` vs `Couple/Individual`), credentials fields, and the clinical prescription notice (no public signup).
- **`register/page.tsx`:**
  - Reads `token` from URL parameters.
  - If token is missing: Displays the prescription requirement screen with clear contact instructions.
  - If token is present: Validates the token against `/api/auth/register`, collects full name, password, and biological sex (`Female` | `Male`), creating the user and redirecting immediately to `/patient/overview`.

#### B. Patient / Individual Portal (`src/app/patient/*`)
- **Responsive Layout Shell (`layout.tsx`):**
  - Left navigation sidebar: `Today (Overview)`, `Assessment (ML Engine)`, `Health Tracking (Wearables)`, `Ask ReproAI (Copilot)`, and `Couple Link (Pairing)`.
  - Header with user avatar initials, pairing status indicator badge (*"Individual Mode"* vs *"Paired with [Partner Name]"*), and logout button.
- **`overview/page.tsx` (Today):**
  - High-level reproductive wellness summary.
  - If Female: Current cycle day, biphasic temperature shift status, and personalized health action.
  - If Male: Semen vitality status, lifestyle metabolic progress, and sleep regularity.
  - If Unpaired: A welcoming banner inviting the user to link their partner when planning conception.
- **`assessment/page.tsx` (Clinical Predictive Engine):**
  - Input section: Sliders/inputs for age, BMI, AMH (for female), sperm concentration (for male), antral follicle count, and duration.
  - "Generate Assessment" button calling `POST /api/predict`.
  - Prediction Result Card:
    - Calibrated probability value (%) with 95% Confidence Interval badge.
    - Risk Tier Badge: `OPTIMAL`, `AGE_APPROPRIATE`, `REDUCED_RESERVE`, `CLINICAL_ATTENTION_NEEDED`.
    - **Interactive Shapley Attribution Chart:** Horizontal bar chart displaying exact $\phi_i$ values (Mint for positive factors, Coral for risk factors).
    - **Modifiable vs. Non-Modifiable Factors:** Plain-language breakdown of lifestyle targets (BMI 20-24.9 kg/m², sleep regularisation) vs biological baselines (Age, AMH).
    - **Preservation Guidance Card:** Clinical recommendations for elective oocyte vitrification (ESHRE 2020) or sperm cryopreservation.
- **`wearables/page.tsx` (Longitudinal Tracking):**
  - Interactive Basal Body Temperature chart (SVG / Canvas / Recharts) displaying the **WHO Roetzer Coverline shift** ($\Delta T \ge 0.30^\circ\text{C}$ indicating post-ovulatory luteal phase).
  - Circadian sleep variability chart showing weekly moving average and standard deviation ($\sigma$).
  - Quick-log modal or bulk wearable sync button connecting to `POST /api/observations/bulk`.
- **`assistant/page.tsx` (Autonomous AI Copilot):**
  - Interactive chat interface connecting to `POST /api/agent`.
  - Displays real-time **Tool Badges** above assistant replies (`⚡ Executed Tool: predict_fertility_success`, `📚 Grounding: search_guidelines (ESHRE 2020)`).
  - Provider transparency tag (`Provider: Groq Llama 3.3 70B` or `Azure OpenAI GPT-4o`).
- **`pairing/page.tsx` (Couple Link & Granular Consent):**
  - Displays current pairing status.
  - Unpaired mode: "Invite Partner" form sending token via `POST /api/pairing/invite` or "Enter Pairing Token" form via `POST /api/pairing/accept`.
  - Paired mode: Partner card displaying partner's name, email, and connection date, along with a **"Revoke Connection (Pillar 5)"** button triggering `POST /api/pairing/revoke` with confirmation modal assuring that no personal health records are deleted.

#### C. Clinician Portal (`src/app/clinician/*`)
- **`dashboard/page.tsx`:**
  - Executive KPI cards: Total monitored cases, individual patients count, couples count, active wearable alerts, and estimated healthcare savings ($12,000/cycle avoided).
  - **Directory Tabs:**
    1. **"Couples Directory":** List of paired couples undergoing assisted reproduction, joint prognosis, and shared alerts.
    2. **"Individual Patients Directory":** List of single patients tracking reproductive potential across life stages (ovarian reserve, semen health, oocyte vitrification candidates).
  - **"Prescribe Digital Care" Modal:**
    - Scope toggle: **"Individual Patient"** vs. **"Couple"**.
    - If Individual: collects email, biological sex (`female` | `male`), name, and clinical notes.
    - If Couple: collects primary email and partner email.
    - Calls `POST /api/clinician/invite`.
- **`follow-up/page.tsx` (Closed-Loop Triage):**
  - Triage queue for longitudinal wearable alerts and low-response cases.
  - Status transition controls (`ALERT_RAISED` ➔ `APPOINTMENT_SCHEDULED` ➔ `IN_FOLLOW_UP` ➔ `CLOSED`).
  - Clinical notes editor creating immutable audit log entries.
- **`patient/[id]/page.tsx`:**
  - Longitudinal clinical chart: predictions timeline, raw laboratory values, and wearable fever/sleep anomalies.
  - **One-Click FHIR Export:** Button downloading the validated FHIR R4 JSON bundle (`/api/fhir/export?coupleId=...` or `?userId=...`) for Malafi EHR integration.

---

### 5. STEP-BY-STEP IMPLEMENTATION PLAN
1. **Step 1: CSS & Design Tokens:**
   - Add `@import url(...)` for `DM Sans` and `Manrope` in `src/app/globals.css`.
   - Configure Tailwind utility classes and theme colors (`--teal: #0c655e`, `--mint: #dff2e9`, `--coral: #de7467`, `--ink: #173330`, etc.).
   - Build base reusable UI primitives in `src/components/ui/` (`Button`, `Card`, `Badge`, `Input`, `Modal`, `DataTable`, `Tabs`).
2. **Step 2: Authentication & Prescription-Gated Registration:**
   - Implement `src/app/(auth)/login/page.tsx` with role switching and prescription notice.
   - Implement `src/app/(auth)/register/page.tsx` with mandatory token validation and sex selection.
3. **Step 3: Patient Portal Views:**
   - Build `src/app/patient/layout.tsx` (Sidebar + Topbar).
   - Implement `overview/page.tsx`, `assessment/page.tsx`, `wearables/page.tsx`, `assistant/page.tsx`, and `pairing/page.tsx`.
4. **Step 4: Clinician Portal Views:**
   - Build `src/app/clinician/layout.tsx`.
   - Implement `dashboard/page.tsx` (with Couples vs Individuals directory tabs), `follow-up/page.tsx`, and `patient/[id]/page.tsx` with FHIR export.
5. **Step 5: TypeScript Compilation & Verification:**
   - Run `npx tsc --noEmit` and ensure **0 errors** remain.

Proceed with full autonomy, write clean, modular, and maintainable TypeScript code, and build a world-class platform ready to win the Abu Dhabi Future Health Challenge.