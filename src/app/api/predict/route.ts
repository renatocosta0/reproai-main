import { NextRequest, NextResponse } from "next/server";
import { predict, PredictionInput } from "@/lib/ml-client";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";

interface ExtendedPredictionInput extends PredictionInput {
  female_name?: string;
  male_name?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ExtendedPredictionInput;
    const result = await predict(body);

    // If an authenticated patient couple is making the request, persist records
    const session = await getSession();
    if (session?.coupleId) {
      const coupleId = session.coupleId;

      // 1. Persist prediction in DB
      await prisma.prediction.create({
        data: {
          coupleId,
          probability: result.probability,
          confidenceLow: result.confidence_low ?? null,
          confidenceHigh: result.confidence_high ?? null,
          factors: JSON.stringify(result.factors),
          modelVersion: result.model_version
        }
      });

      // 2. Upsert Female Partner profile
      const female = await prisma.patient.findFirst({
        where: { coupleId, sex: "female" }
      });

      if (female) {
        await prisma.patient.update({
          where: { id: female.id },
          data: {
            name: body.female_name ? body.female_name.trim() : female.name,
            age: body.age ? Math.round(body.age) : female.age,
            bmi: body.bmi,
            amh: body.amh,
            pcosHistory: body.pcos_history,
            infertilityDurationMonths: body.infertility_duration_months,
            priorCycles: body.prior_cycles
          }
        });
      } else {
        await prisma.patient.create({
          data: {
            coupleId,
            sex: "female",
            name: body.female_name ? body.female_name.trim() : null,
            age: body.age ? Math.round(body.age) : null,
            bmi: body.bmi,
            amh: body.amh,
            pcosHistory: body.pcos_history,
            infertilityDurationMonths: body.infertility_duration_months,
            priorCycles: body.prior_cycles
          }
        });
      }

      // 3. Upsert Male Partner profile
      const male = await prisma.patient.findFirst({
        where: { coupleId, sex: "male" }
      });

      if (male) {
        await prisma.patient.update({
          where: { id: male.id },
          data: {
            name: body.male_name ? body.male_name.trim() : male.name,
            spermCount: body.sperm_count
          }
        });
      } else {
        await prisma.patient.create({
          data: {
            coupleId,
            sex: "male",
            name: body.male_name ? body.male_name.trim() : null,
            spermCount: body.sperm_count
          }
        });
      }

      // 4. Closed-loop follow-up alert if success probability is low (< 25%)
      if (result.probability < 25) {
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

      await audit(session.userId, "prediction_generated", `couple:${coupleId}`);
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
        factor: "Maternal Age",
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
      "Screening vs Diagnosis: This model calculates probabilistic treatment response and does not constitute a formal diagnosis of infertility.",
      "Anatomical Boundaries: Model does not evaluate tubal patency (hysterosalpingography), intrauterine synechiae, or severe pelvic endometriosis.",
      "Clinical Discretion: All treatment trajectories must be confirmed by a licensed reproductive endocrinologist adhering to WHO and ESHRE standards."
    ];

    const enrichedResult = {
      ...result,
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
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
