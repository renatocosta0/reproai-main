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

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
