# FHIR Interoperability with Abu Dhabi Health Ecosystem

ReproAI is designed to integrate seamlessly with Abu Dhabi's national health platforms, specifically **Malafi** (the unified health data platform) and **Sahhatna** (the patient-facing health app). This interoperability is achieved through FHIR R4 (Fast Healthcare Interoperability Resources) standards.

## Architecture Overview

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   ReproAI       │  FHIR   │   Malafi        │  HL7    │   Sahhatna      │
│   (FHIR Export) │ ───────▶│   (National     │ ───────▶│   (Patient App) │
│                 │  JSON   │   Health Record) │  FHIR   │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
```

## FHIR Resources Implemented

### Observation (R4)

ReproAI exposes wearable and manually entered vital signs as FHIR Observation resources, aligned with the LOINC coding system.

**Endpoint:** `GET /api/fhir/export`

**Query Parameters:**
- `coupleId` (optional): Filter observations for a specific couple
- `code` (optional): Filter by LOINC code (e.g., body temperature, sleep duration)

**Example Request:**
```bash
curl "http://localhost:3000/api/fhir/export?coupleId=clx123abc"
```

**Example Response (FHIR Bundle):**
```json
{
  "resourceType": "Bundle",
  "type": "collection",
  "entry": [
    {
      "resource": {
        "resourceType": "Observation",
        "id": "obs123",
        "status": "final",
        "code": {
          "coding": [
            {
              "system": "http://loinc.org",
              "code": "8310-5",
              "display": "Body temperature"
            }
          ],
          "text": "8310-5"
        },
        "subject": {
          "reference": "Patient/clx123abc",
          "display": "Couple clx123ab"
        },
        "effectiveDateTime": "2026-11-04T08:00:00Z",
        "valueQuantity": {
          "value": 36.7,
          "unit": "Cel",
          "system": "http://unitsofmeasure.org",
          "code": "Cel"
        },
        "meta": {
          "source": "ReproAI",
          "lastUpdated": "2026-11-04T08:00:00Z"
        }
      }
    }
  ]
}
```

## LOINC Codes Used

| Observation Type | LOINC Code | Display Name | Unit |
|------------------|------------|--------------|------|
| Body temperature | 8310-5 | Body temperature | Cel |
| Sleep duration | 93832-4 | Sleep duration | h |
| Heart rate | 8867-4 | Heart rate | /min |
| BMI | 39156-5 | Body mass index (BMI) | kg/m² |

## Integration with Malafi

Malafi is Abu Dhabi's unified health data platform that aggregates patient records across providers. ReproAI can push fertility-related observations to Malafi via FHIR APIs:

1. **Data Push:** ReproAI exports observations via `GET /api/fhir/export`
2. **Malafi Ingestion:** Malafi consumes the FHIR Bundle and stores observations in the national record
3. **Cross-Provider Access:** Clinicians across Abu Dhabi can access fertility data alongside other health records

**Integration Steps (for pilot deployment):**
1. Obtain Malafi API credentials from Abu Dhabi Department of Health
2. Configure ReproAI to push observations to Malafi's FHIR endpoint
3. Map ReproAI couple IDs to Malafi patient IDs via national identifier (Emirates ID)
4. Implement OAuth 2.0 authentication for secure data exchange

## Integration with Sahhatna

Sahhatna is Abu Dhabi's patient-facing health app. ReproAI data can be displayed within Sahhatna to provide patients with a unified health view:

1. **Data Display:** Sahhatna pulls ReproAI observations via FHIR
2. **Patient Education:** Fertility window predictions and lifestyle recommendations appear alongside other health metrics
3. **Appointment Booking:** Closed-loop follow-up alerts can trigger appointment booking in Sahhatna

**Integration Steps (for pilot deployment):**
1. Register ReproAI as a data provider in the Sahhatna developer portal
2. Configure FHIR endpoint access with appropriate scopes
3. Implement patient consent flow for data sharing
4. Map ReproAI user accounts to Sahhatna profiles

## Data Governance & Privacy

All FHIR exports comply with Abu Dhabi data protection regulations:

- **Consent-First:** Observations are only exported for patients who have provided explicit consent (`consentAt` timestamp in User model)
- **Audit Trail:** Every FHIR export is logged in the AuditLog table
- **Encryption:** Data is encrypted at rest (AES-256-GCM) and in transit (TLS)
- **Minimization:** Only necessary observation data is exported (no raw predictions or clinical notes)

## Security Considerations

- **Authentication:** FHIR endpoint requires valid session cookie (JWT)
- **Authorization:** Role-based access control (CLINICIAN role required)
- **Rate Limiting:** Implement rate limiting for FHIR exports in production
- **Data Residency:** All data remains within Abu Dhabi data centers

## Future Extensions

- **Patient Resource:** Full FHIR Patient resource export with demographics
- **DiagnosticReport:** ML prediction results as structured diagnostic reports
- **ServiceRequest:** Protocol suggestions as FHIR ServiceRequest resources
- **Task:** Follow-up workflow as FHIR Task resources for closed-loop tracking

## References

- [FHIR R4 Specification](https://hl7.org/fhir/R4/)
- [LOINC Code System](https://loinc.org/)
- [Abu Dhabi Department of Health - Malafi](https://www.doh.gov.ae/)
- [Abu Dhabi Health Services - Sahhatna](https://www.sahhatna.ae/)
