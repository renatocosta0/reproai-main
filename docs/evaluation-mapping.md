# Mapping to the six judging criteria

Every row is something a judge can open. Status labels: **Runs in prototype**, **Simulated**, **Proposed for production**. The slide-by-slide submission content is in [submission-pack.md](submission-pack.md).

| Criterion | What ReproAI shows | Where to see it | Status |
| --- | --- | --- | --- |
| Health impact and clinical relevance | Earlier, governed entry (programme or clinician invitation) for people not yet trying; cited pathway options tied to Daman Thiqa and WHO thresholds; men included through semen analysis prompts. | `/tour` steps 1–3, `/patient/overview`, `/patient/assessment` | Runs in prototype (clinician prescription). Premarital and IFHAS invitations: Proposed |
| Technical depth and architecture | Gated pipeline (consent → completeness → deterministic scoring → explanation → clinician review → release → audit); literature-derived additive model with per-factor contributions; deterministic rules engine; retrieve-first cited RAG with abstention; governed agent action with no LLM in the action path; FHIR R4. | [technical-documentation.md](technical-documentation.md), [architecture.md](architecture.md) | Runs in prototype |
| Working solution and demo quality | Nine-step guided tour with fictional personas, including a missing-data case and a withdrawn-consent case; English and Arabic (RTL). | `/tour` | Runs in prototype |
| Responsible AI, safety and governance | No imputation of required inputs; clinician sign-off before release; provenance; five revocable consents; model card with limitations; DoH Responsible AI Standard mapping; risk register; evidence labels. | `/model-card`, [doh-responsible-ai-mapping.md](doh-responsible-ai-mapping.md), [risk-register.md](risk-register.md) | Runs in prototype, including AES-256-GCM on sensitive text fields. Managed keys, UAE hosting for the database, MFA: Proposed |
| Scalability and deployment readiness | Stateless Next.js app, separate scoring service, Postgres; FHIR export; Azure deployment path in a UAE region. | [azure-integration.md](azure-integration.md), [fhir-interoperability.md](fhir-interoperability.md) | Prototype on Vercel + Neon. UAE hosting and Malaffi import: Proposed |
| Commercial viability and path to pilot | Buyer is the health system (ADPHC/DoH programmes, provider groups); individuals never pay; six-month pilot with one primary-care cluster and one fertility centre; primary outcome: days from risk signal to counselling. | [submission-pack.md](submission-pack.md) slide 11 | Designed, not started. No cost-saving figures are claimed. |

## Claims we do not make

- No accuracy, discrimination or calibration figure. The model is not trained or validated on patient data.
- No cost savings or ROI figures.
- No user testing or customer validation. All data is synthetic.
