# Mapping to the 6 judging criteria

| Criterion | How ReproAI addresses it |
|---|---|
| Health Impact & Clinical Relevance | Predicts fertility treatment success; earlier PCOS and male-factor detection; closed-loop follow-up prevents patients from being lost in the system. |
| Technical Depth & Architecture | scikit-learn model + explainability, FHIR R4 interoperability (Observation resources), typed monorepo, Azure AI Foundry integration ready. |
| Working Solution & Demo Quality | Functional patient + clinician flows with interactive follow-up status updates, wearable data entry, live ML predictions (no mocks). |
| Responsible AI & Safety | Clinical disclaimer, feature-importance explainability, encryption at rest (AES-256-GCM), audit log, consent-first design, empathetic system prompt. |
| Scalability & Deployment Readiness | SQLite to Postgres, Vercel deploy, isolated ML service, FHIR export for national platform integration (Malafi/Sahhatna). |
| Commercial Viability & Path to Pilot | Economic impact dashboard showing estimated healthcare savings by identifying low-response cases early; reduces unnecessary IVF cycle costs; integrates with Abu Dhabi national health platforms. |
