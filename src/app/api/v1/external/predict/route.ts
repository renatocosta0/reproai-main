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

    // 3. Compute Real Machine Learning Prediction
    const predictionResult = await predict({
      age: body.age,
      bmi: body.bmi,
      amh: body.amh ?? 1.5,
      sperm_count: body.sperm_count ?? 20.0,
      pcos_history: Boolean(body.pcos_history),
      infertility_duration_months: body.infertility_duration_months ?? 12,
      prior_cycles: body.prior_cycles ?? 0
    });

    // 4. Clinical Evidence Categorization (Challenge 02)
    const modifiableFactors = [];
    const nonModifiableFactors = [];

    if (body.bmi >= 25 || body.bmi < 18.5) {
      modifiableFactors.push({
        factor: "BMI",
        value: body.bmi,
        guideline: "WHO Guideline on Infertility (2023) - Weight optimization improves ovulatory responsiveness and sperm quality."
      });
    }

    if (body.sperm_count !== undefined && body.sperm_count < 15) {
      modifiableFactors.push({
        factor: "Sperm Concentration",
        value: body.sperm_count,
        guideline: "WHO Manual for Semen Examination (6th Ed.) - Sub-15M/mL concentration represents male-factor subfertility."
      });
    }

    nonModifiableFactors.push({
      factor: "Maternal Age",
      value: body.age,
      guideline: "ESHRE Bologna/POSEIDON Criteria - Primary non-modifiable determinant of oocyte aneuploidy."
    });

    if (body.amh !== undefined) {
      nonModifiableFactors.push({
        factor: "AMH (Ovarian Reserve)",
        value: body.amh,
        guideline: "POSEIDON Stratification - Baseline biomarker for expected gonadotropin response."
      });
    }

    // 5. Structure FHIR R4 RiskAssessment Resource representation
    const fhirRiskAssessment = {
      resourceType: "RiskAssessment",
      status: "final",
      occurrenceDateTime: new Date().toISOString(),
      basis: [{ display: `External Patient ID: ${body.external_patient_id ?? "ANONYMOUS"}` }],
      prediction: [
        {
          outcome: { text: "Assisted Reproductive Treatment (IVF) Success Probability" },
          probabilityDecimal: Number((predictionResult.probability / 100).toFixed(4)),
          whenRange: {
            low: { value: predictionResult.confidence_low ?? undefined, unit: "%" },
            high: { value: predictionResult.confidence_high ?? undefined, unit: "%" }
          }
        }
      ]
    };

    await audit(partnerId, "b2b_prediction", `partner:${authenticatedPartnerName}`);

    return NextResponse.json({
      status: "success",
      partner: authenticatedPartnerName,
      patient_reference: body.external_patient_id ?? null,
      probability: predictionResult.probability,
      confidence_interval: {
        lower: predictionResult.confidence_low,
        upper: predictionResult.confidence_high
      },
      factors: predictionResult.factors,
      clinical_evaluation: {
        modifiable_factors: modifiableFactors,
        non_modifiable_factors: nonModifiableFactors,
        limitations: [
          "Screening Model: Probabilistic estimate calibrated for population-level triage.",
          "Not a diagnostic confirmation; clinical confirmation by reproductive endocrinologist required."
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

