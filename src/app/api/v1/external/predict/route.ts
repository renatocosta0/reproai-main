import { NextRequest, NextResponse } from "next/server";
import { predict, PredictionInput } from "@/lib/ml-client";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";

interface ExternalPredictionPayload extends PredictionInput {
  external_patient_id?: string;
  clinic_identifier?: string;
}

// B2B Partner API Engine (API-as-a-Product).
// Allows external Hospital EMRs, EHRs (e.g. Malafi), and third-party laboratory systems
// to query the ReproAI clinical predictive engine via API Key authentication.
export async function POST(req: NextRequest) {
  try {
    // 1. API Key Authentication (via x-api-key or Authorization Bearer)
    const apiKeyHeader = req.headers.get("x-api-key") || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!apiKeyHeader) {
      return NextResponse.json(
        {
          error: "Unauthorized: Missing API Key. Provide via 'x-api-key' header or 'Authorization: Bearer <key>'"
        },
        { status: 401 }
      );
    }

    const trimmedKey = apiKeyHeader.trim();

    // Check database API keys or fallback environment key
    let authenticatedPartnerName = "Master Partner";
    let partnerId = "env-master-key";

    const dbApiKey = await prisma.apiKey.findUnique({
      where: { key: trimmedKey }
    }).catch(() => null);

    if (dbApiKey) {
      if (!dbApiKey.active) {
        return NextResponse.json({ error: "Unauthorized: API Key is inactive or revoked" }, { status: 403 });
      }
      authenticatedPartnerName = dbApiKey.name;
      partnerId = dbApiKey.id;
    } else {
      const masterEnvKey = process.env.REPROAI_PARTNER_API_KEY;
      if (!masterEnvKey || masterEnvKey !== trimmedKey) {
        return NextResponse.json({ error: "Unauthorized: Invalid API Key" }, { status: 401 });
      }
    }

    // 2. Parse & Validate Payload
    const body = (await req.json().catch(() => null)) as ExternalPredictionPayload | null;
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    if (typeof body.age !== "number" || typeof body.bmi !== "number") {
      return NextResponse.json(
        { error: "age and bmi are mandatory numeric fields" },
        { status: 400 }
      );
    }

    // 3. Score with the literature-derived model (hand-set, not trained; see /model-info)
    // Inputs are passed exactly as supplied: nothing is imputed. The ML service
    // returns insufficient_data when a required input is missing.
    const num = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : null);
    const predictionResult = await predict({
      age: body.age,
      bmi: body.bmi,
      amh: num(body.amh),
      sperm_count: num(body.sperm_count),
      sex: body.sex === "male" ? "male" : "female",
      scope: body.scope === "INDIVIDUAL" ? "INDIVIDUAL" : body.scope === "COUPLE" ? "COUPLE" : undefined,
      pcos_history: typeof body.pcos_history === "boolean" ? body.pcos_history : null,
      infertility_duration_months: num(body.infertility_duration_months),
      prior_cycles: num(body.prior_cycles),
      antral_follicle_count: num(body.antral_follicle_count)
    });

    if (predictionResult.status === "insufficient_data" || predictionResult.probability === null) {
      await audit(partnerId, "b2b_prediction_insufficient", `partner:${authenticatedPartnerName}`);
      return NextResponse.json(
        {
          status: "insufficient_data",
          missing_required: predictionResult.missing_required,
          missing_optional: predictionResult.missing_optional,
          completeness: predictionResult.completeness,
          message: predictionResult.disclaimer
        },
        { status: 422 }
      );
    }
    const probability = predictionResult.probability;

    // 4. Clinical Evidence Categorization (Challenge 02)
    const modifiableFactors = [];
    const nonModifiableFactors = [];

    if (body.bmi >= 25 || body.bmi < 18.5) {
      modifiableFactors.push({
        factor: "BMI",
        value: body.bmi,
        guideline: "WHO guideline on infertility (2025) - weight is a modifiable factor to address before and during care."
      });
    }

    if (body.sperm_count !== undefined && body.sperm_count !== null && body.sperm_count < 15) {
      modifiableFactors.push({
        factor: "Sperm Concentration",
        value: body.sperm_count,
        guideline: "Below the 15 M/mL lower reference limit used by the Daman Thiqa guideline (WHO 2010). Reference limits are not thresholds for subfertility; repeat the analysis."
      });
    }

    nonModifiableFactors.push({
      factor: body.sex === "male" ? "Age" : "Female age",
      value: body.age,
      guideline: "Female age is the strongest non-modifiable factor for egg quantity and quality (ESHRE)."
    });

    if (typeof body.amh === "number") {
      nonModifiableFactors.push({
        factor: "AMH (ovarian reserve)",
        value: body.amh,
        guideline: "Reduced ovarian reserve: AMH < 1.1 ng/mL or AFC < 5-7 (Daman Thiqa guideline; POSEIDON/Bologna). AMH does not predict natural conception."
      });
    }

    // 5. Structure FHIR R4 RiskAssessment Resource representation
    const fhirRiskAssessment = {
      resourceType: "RiskAssessment",
      // Not reviewed by a clinician inside ReproAI, so never "final".
      status: "preliminary",
      occurrenceDateTime: new Date().toISOString(),
      basis: [{ display: `External Patient ID: ${body.external_patient_id ?? "ANONYMOUS"}` }],
      prediction: [
        {
          outcome: { text: "Reproductive-potential estimate (prototype, not clinically validated; not a calibrated probability of live birth)" },
          probabilityDecimal: Number((probability / 100).toFixed(4)),
          rationale: `95% interval ${predictionResult.confidence_low ?? "?"}–${predictionResult.confidence_high ?? "?"}%. For review by a licensed clinician; not a diagnosis.`
        }
      ]
    };

    await audit(partnerId, "b2b_prediction", `partner:${authenticatedPartnerName}`);

    return NextResponse.json({
      status: "success",
      partner: authenticatedPartnerName,
      patient_reference: body.external_patient_id ?? null,
      probability,
      completeness: predictionResult.completeness,
      missing_optional: predictionResult.missing_optional,
      evidence_status: predictionResult.evidence_status,
      confidence_interval: {
        lower: predictionResult.confidence_low,
        upper: predictionResult.confidence_high
      },
      factors: predictionResult.factors,
      clinical_evaluation: {
        modifiable_factors: modifiableFactors,
        non_modifiable_factors: nonModifiableFactors,
        limitations: [
          "Prototype: literature-derived, hand-set scoring. Not trained, calibrated or validated on patient outcomes.",
          "The 95% interval assumes a fixed standard error; it is not a validated prediction interval.",
          "Not a diagnosis. For review by a licensed clinician; not released to the patient by this API."
        ]
      },
      fhir_resource: fhirRiskAssessment,
      model_version: predictionResult.model_version
    });
  } catch (error: any) {
    console.error("[POST /api/v1/external/predict] error:", error);
    return NextResponse.json(
      { error: error?.message ?? "B2B prediction engine error" },
      { status: 500 }
    );
  }
}

