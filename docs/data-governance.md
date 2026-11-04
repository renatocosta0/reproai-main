# Data governance

- **No mocked or synthetic data** is used at any stage. Model training requires a real,
  anonymized, licence-verified public dataset.
- **Consent-first:** users record informed consent before any clinical data is stored.
- **Encryption:** sensitive fields encrypted at rest; TLS in transit.
- **Authentication:** email/password with bcrypt hashing and HTTP-only, signed JWT
  session cookies (`src/lib/auth.ts`). Role-based access control enforced in
  `src/middleware.ts` (patient vs clinician areas).
- **Encryption:** AES-256-GCM at rest via `src/lib/encryption.ts` (Node crypto,
  key from `ENCRYPTION_KEY`); TLS in transit.
- **Audit log:** every access to clinical data is recorded (`AuditLog`) via
  `src/lib/audit.ts` (login, register, consent, and data access).
- **Data minimization:** only the attributes required by the model are collected.
- **Interoperability:** Patient/Observation exposed as FHIR-aligned resources, designed to
  slot into Abu Dhabi national platforms (Sahhatna/Malafi concepts).
