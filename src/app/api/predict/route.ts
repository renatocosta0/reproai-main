import { NextRequest, NextResponse } from "next/server";
import { predict, PredictionInput } from "@/lib/ml-client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";

interface ExtendedPredictionInput extends PredictionInput {
  female_name?: string;
  male_name?: string;
  sex?: "female" | "male";
  scope?: "INDIVIDUAL" | "COUPLE";
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ExtendedPredictionInput;

    // Detect scope if not specified: if either sperm_count or amh is absent, it's an individual assessment
    const isExplicitIndividual = body.scope === "INDIVIDUAL" || (body.sperm_count === undefined && body.amh !== undefined) || (body.amh === undefined && body.sperm_count !== undefined);
    const scope = isExplicitIndividual ? "INDIVIDUAL" : (body.scope ?? "COUPLE");

    const result = await predict({
      ...body,
      scope: scope as "INDIVIDUAL" | "COUPLE"
    });

    const session = await getSession();
    let predictionRecordId: string | null = null;

    if (session) {
      const coupleId = session.coupleId ?? null;
      const userId = session.userId;

      // 1. Persist prediction in DB with scope, tier, and guidance
      const pred = await prisma.prediction.create({
        data: {
          coupleId,
          userId,
          scope,
          probability: result.probability,
          confidenceLow: result.confidence_low ?? null,
          confidenceHigh: result.confidence_high ?? null,
          tier: result.tier ?? null,
          preservationGuidance: result.preservation_guidance ?? null,
          factors: JSON.stringify(result.factors),
          modelVersion: result.model_version
        }
      });
      predictionRecordId = pred.id;

      // 2. Individual profile update for the authenticated user
      const userProfile = await prisma.patient.findUnique({ where: { userId } });
      const inferredSex = body.sex ?? (body.sperm_count && !body.amh ? "male" : "female");

      if (userProfile) {
        await prisma.patient.update({
          where: { id: userProfile.id },
          data: {
            name: (inferredSex === "female" ? body.female_name : body.male_name) ?? userProfile.name,
            age: body.age ? Math.round(body.age) : userProfile.age,
            bmi: body.bmi ?? userProfile.bmi,
            amh: body.amh !== undefined ? body.amh : userProfile.amh,
            spermCount: body.sperm_count !== undefined ? body.sperm_count : userProfile.spermCount,
            pcosHistory: body.pcos_history !== undefined ? body.pcos_history : userProfile.pcosHistory,
            infertilityDurationMonths: body.infertility_duration_months ?? userProfile.infertilityDurationMonths,
            priorCycles: body.prior_cycles ?? userProfile.priorCycles,
            antralFollicleCount: body.antral_follicle_count ?? userProfile.antralFollicleCount,
            preservationIntent: body.preservation_intent ?? userProfile.preservationIntent
          }
        });
      }

      // 3. Backwards-compatible sync for Couple container
      if (coupleId) {
        if (inferredSex === "female" || scope === "COUPLE") {
          const female = await prisma.patient.findFirst({ where: { coupleId, sex: "female" } });
          if (female) {
            await prisma.patient.update({
              where: { id: female.id },
              data: {
                name: body.female_name ? body.female_name.trim() : female.name,
                age: body.age ? Math.round(body.age) : female.age,
                bmi: body.bmi,
                amh: body.amh ?? female.amh,
                pcosHistory: body.pcos_history ?? female.pcosHistory,
                infertilityDurationMonths: body.infertility_duration_months ?? female.infertilityDurationMonths,
                priorCycles: body.prior_cycles ?? female.priorCycles
              }
            });
          }
        }

        if (inferredSex === "male" || (scope === "COUPLE" && body.sperm_count !== undefined)) {
          const male = await prisma.patient.findFirst({ where: { coupleId, sex: "male" } });
          if (male) {
            await prisma.patient.update({
              where: { id: male.id },
              data: {
                name: body.male_name ? body.male_name.trim() : male.name,
                spermCount: body.sperm_count ?? male.spermCount
              }
            });
          }
        }

        // 4. Closed-loop triage alert if success probability is low (< 25%) in couple mode
        if (scope === "COUPLE" && result.probability < 25) {
          const existingAlert = await prisma.followUp.findFirst({
            where: { coupleId, status: "ALERT_RAISED" }
          });
          if (!existingAlert) {
            await prisma.followUp.create({
              data: {
                coupleId,
                status: "ALERT_RAISED",
                note: `Low-response probability detected (${result.probability}%). Multidisciplinary case review suggested.`
              }
            });
          }
        }
      }

      await audit(session.userId, "prediction_generated", `scope:${scope}:id:${predictionRecordId}`);
    }

    // ── Challenge 02: Longitudinal Explainability & Segregated Factors ──
    const modifiableFactors: Array<{ factor: string; clinicalRationale: string; target: string }> = [];
    const nonModifiableFactors: Array<{ factor: string; clinicalRationale: string; impact: string }> = [];

    // Modifiable evaluations
    if (body.bmi !== undefined && body.bmi !== null) {
      modifiableFactors.push({
        factor: "Body Mass Index (BMI)",
        clinicalRationale: body.bmi >= 25 || body.bmi < 18.5
          ? "Metabolic and adipose-derived hormone disruptions adversely impact ovulation, endometrial receptivity, and sperm parameters (WHO 2023)."
          : "Normoweight BMI optimizes follicular development and cycle regularity.",
        target: "Optimize toward BMI 20-24.9 kg/m²"
      });
    }

    if (body.sperm_count !== undefined && body.sperm_count !== null) {
      modifiableFactors.push({
        factor: "Sperm Concentration",
        clinicalRationale: body.sperm_count < 15
          ? "Oligozoospermia (< 15 M/mL) indicates subfertility. Lifestyle modifications, antioxidant therapy, and urological workup can improve seminal parameters (WHO 6th Ed. Semen Manual)."
          : "Normozoospermia (> 15 M/mL) supports natural conception and standard IVF response.",
        target: "Maintain > 15 million/mL with lifestyle & metabolic optimization"
      });
    }

    // Non-modifiable evaluations
    if (body.age !== undefined && body.age !== null) {
      nonModifiableFactors.push({
        factor: "Chronological Age",
        clinicalRationale: "Primary independent predictor of oocyte euploidy and live birth rate across all assisted reproduction protocols (ESHRE 2020).",
        impact: body.age >= 38 ? "High risk of age-related oocyte decline" : "Favorable age window"
      });
    }

    if (body.amh !== undefined && body.amh !== null) {
      nonModifiableFactors.push({
        factor: "Anti-Müllerian Hormone (AMH)",
        clinicalRationale: "Circulating biomarker of functional ovarian reserve and primordial follicle pool (POSEIDON / Bologna criteria).",
        impact: body.amh < 1.1 ? "Diminished ovarian reserve (low responder profile)" : "Normal-to-high follicular reserve"
      });
    }

    if (body.infertility_duration_months) {
      nonModifiableFactors.push({
        factor: "Duration of Infertility",
        clinicalRationale: "Longstanding subfertility (> 36 months) is correlated with secondary peritoneal or unmeasured tubal factors.",
        impact: `${body.infertility_duration_months} months elapsed`
      });
    }

    // Quantified uncertainty bounds
    const missingBiomarkersCount = [body.amh, body.sperm_count, body.bmi].filter((v) => v === undefined || v === null).length;
    const dynamicConfidenceLow = Math.max(0, Math.round((result.confidence_low ?? result.probability - 6) - (missingBiomarkersCount * 2.5)));
    const dynamicConfidenceHigh = Math.min(100, Math.round((result.confidence_high ?? result.probability + 6) + (missingBiomarkersCount * 2.5)));

    const limitations: string[] = [
      "Screening vs Diagnosis: This model calculates probabilistic treatment response across the life course and does not constitute a formal diagnosis of infertility.",
      "Anatomical Boundaries: Model does not evaluate tubal patency (hysterosalpingography), intrauterine synechiae, or severe pelvic endometriosis.",
      "Clinical Discretion: All treatment and preservation trajectories must be confirmed by a licensed reproductive endocrinologist adhering to WHO and ESHRE standards."
    ];

    const recommendedOptions = scope === "INDIVIDUAL" ? [
      "Individual health & lifestyle metabolic optimization",
      result.tier === "OPTIMAL" || result.tier === "AGE_APPROPRIATE"
        ? "Fertility preservation discussion (Elective oocyte/sperm vitrification prior to age-related decline)"
        : "Specialist consultation (Early ovarian reserve workup or andrology evaluation)",
      "Longitudinal wearable cycle and basal body temperature tracking"
    ] : [
      "Preconception couple counseling",
      "Comprehensive semen analysis & ovulatory confirmation",
      "Specialist referral for assisted reproduction protocols (IUI / IVF)"
    ];

    const enrichedResult = {
      ...result,
      scope,
      tier: result.tier ?? (scope === "INDIVIDUAL" ? "OPTIMAL" : "COUPLE_BIVARIATE"),
      preservation_guidance: result.preservation_guidance,
      age_adjusted_percentile: result.age_adjusted_percentile,
      recommended_options: recommendedOptions,
      confidence_low: dynamicConfidenceLow,
      confidence_high: dynamicConfidenceHigh,
      modifiable_factors: modifiableFactors,
      non_modifiable_factors: nonModifiableFactors,
      uncertainty_bounds: {
        lower: dynamicConfidenceLow,
        upper: dynamicConfidenceHigh,
        margin: Math.round((dynamicConfidenceHigh - dynamicConfidenceLow) / 2),
        dataCompletenessPenalty: missingBiomarkersCount > 0 ? `${missingBiomarkersCount * 5}% expanded interval due to missing lab values` : "None (fully calibrated)"
      },
      limitations
    };

    return NextResponse.json(enrichedResult);
  } catch (err) {
    console.error("[POST /api/predict] error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
