import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// FHIR R4 Observation export endpoint.
// Returns patient observations in FHIR JSON format for interoperability
// with national health platforms (e.g., Abu Dhabi Malafi, Sahhatna).
//
// Query params:
// - coupleId: optional filter for a specific couple
// - code: optional filter for observation type (LOINC code)

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const coupleId = searchParams.get("coupleId");
    const code = searchParams.get("code");

    const where: Record<string, unknown> = {};
    if (coupleId) where.coupleId = coupleId;
    if (code) where.code = code;

    const observations = await prisma.observation.findMany({
      where,
      include: { couple: { include: { patients: true } } },
      orderBy: { effectiveAt: "desc" }
    });

    // Also include FHIR RiskAssessment resource from predictions if available
    const predictions = await prisma.prediction.findMany({
      where: coupleId ? { coupleId } : {},
      orderBy: { createdAt: "desc" },
      take: 10
    });

    // Standard LOINC Code Dictionary
    const loincLookup: Record<string, { code: string; display: string }> = {
      "body-temperature": { code: "8310-5", display: "Body temperature" },
      "8310-5": { code: "8310-5", display: "Body temperature" },
      "sleep-hours": { code: "93832-4", display: "Sleep duration" },
      "93832-4": { code: "93832-4", display: "Sleep duration" },
      "amh": { code: "68343-3", display: "Anti-Mullerian hormone [Mass/volume] in Serum or Plasma" },
      "68343-3": { code: "68343-3", display: "Anti-Mullerian hormone [Mass/volume] in Serum or Plasma" },
      "sperm-count": { code: "9780-8", display: "Spermatozoa [#/volume] in Semen" },
      "9780-8": { code: "9780-8", display: "Spermatozoa [#/volume] in Semen" }
    };

    const observationEntries = observations.map((obs) => {
      const loinc = loincLookup[obs.code.toLowerCase()] ?? {
        code: obs.code,
        display: obs.code
      };

      return {
        resource: {
          resourceType: "Observation",
          id: obs.id,
          status: "final",
          code: {
            coding: [
              {
                system: "http://loinc.org",
                code: loinc.code,
                display: loinc.display
              }
            ],
            text: loinc.display
          },
          subject: {
            reference: `Patient/${obs.coupleId}`,
            display: `Couple ${obs.coupleId.slice(0, 8)}`
          },
          effectiveDateTime: obs.effectiveAt.toISOString(),
          valueQuantity: {
            value: obs.value,
            unit: obs.unit || "",
            system: "http://unitsofmeasure.org",
            code: obs.unit || ""
          },
          meta: {
            source: "ReproAI",
            lastUpdated: obs.effectiveAt.toISOString()
          }
        }
      };
    });

    const riskAssessmentEntries = predictions.map((pred) => ({
      resource: {
        resourceType: "RiskAssessment",
        id: pred.id,
        status: "final",
        subject: {
          reference: `Patient/${pred.coupleId}`,
          display: `Couple ${pred.coupleId.slice(0, 8)}`
        },
        occurrenceDateTime: pred.createdAt.toISOString(),
        basis: [
          { reference: `Observation?coupleId=${pred.coupleId}` }
        ],
        method: {
          coding: [
            {
              system: "https://reproai.health/methods",
              code: "ml-clinical-ensemble",
              display: "ReproAI Evidence-Grounded Ensemble Predictor"
            }
          ],
          text: "Machine Learning Ensemble calibrated on clinical cohort data"
        },
        prediction: [
          {
            outcome: {
              text: "Assisted Reproductive Treatment (IVF) Success Probability"
            },
            probabilityDecimal: Number((pred.probability / 100).toFixed(4)),
            whenRange: {
              low: { value: pred.confidenceLow ?? undefined, unit: "%" },
              high: { value: pred.confidenceHigh ?? undefined, unit: "%" }
            },
            rationale: pred.factors ?? "Evaluated on maternal age, AMH, sperm concentration, BMI, and clinical history."
          }
        ],
        meta: {
          source: "ReproAI",
          lastUpdated: pred.createdAt.toISOString()
        }
      }
    }));

    const fhirBundle = {
      resourceType: "Bundle",
      type: "collection",
      total: observationEntries.length + riskAssessmentEntries.length,
      entry: [...observationEntries, ...riskAssessmentEntries]
    };

    return NextResponse.json(fhirBundle, {
      headers: {
        "Content-Type": "application/fhir+json"
      }
    });
  } catch (error: any) {
    console.error("[GET /api/fhir/export] error:", error);
    return NextResponse.json({ error: error?.message ?? "FHIR export failed" }, { status: 500 });
  }
}
