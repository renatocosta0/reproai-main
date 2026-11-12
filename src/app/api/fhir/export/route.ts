import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessCase, canAccessUser } from "@/lib/clinician-scope";
import { consentingUserIds } from "@/lib/consent";

// FHIR R4 Observation export endpoint.
// Returns patient observations in FHIR JSON format for interoperability
// with national health platforms (e.g., Abu Dhabi Malafi, Sahhatna).
//
// Query params:
// - coupleId: optional filter for a specific couple
// - code: optional filter for observation type (LOINC code)

export async function GET(req: NextRequest) {
  try {
    // Clinicians export one case at a time; patients may only export their own record.
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const searchParams = req.nextUrl.searchParams;
    const coupleId = session.role === "CLINICIAN" ? searchParams.get("coupleId") : null;
    const userId = session.role === "CLINICIAN" ? searchParams.get("userId") : session.userId;
    const code = searchParams.get("code");
    if (!coupleId && !userId) {
      return NextResponse.json({ error: "coupleId or userId is required" }, { status: 400 });
    }
    if (session.role === "CLINICIAN") {
      const allowed = coupleId ? await canAccessCase(session.userId, coupleId) : await canAccessUser(session.userId, userId!);
      if (!allowed) return NextResponse.json({ error: "Not in your care list" }, { status: 403 });
    }

    // Only people who share their record with the care team are exported to a
    // clinician (CLINICIAN_ACCESS consent). A couple's export also covers records
    // its current members made before pairing (stored under an earlier container).
    let ids: string[];
    if (userId) {
      ids = [userId];
    } else {
      const members = await prisma.user.findMany({ where: { coupleId: coupleId!, role: "PATIENT" }, select: { id: true } });
      ids = members.map((m) => m.id);
    }
    if (session.role === "CLINICIAN") {
      ids = [...(await consentingUserIds(ids, "CLINICIAN_ACCESS"))];
      if (ids.length === 0) {
        return NextResponse.json({ error: "The patient has not shared their record with the care team." }, { status: 403 });
      }
    }
    const scope: Record<string, unknown> = { userId: { in: ids } };

    const observations = await prisma.observation.findMany({
      where: code ? { AND: [scope, { code }] } : scope,
      orderBy: { effectiveAt: "desc" }
    });

    // Also include FHIR RiskAssessment resource from predictions if available
    const predictions = await prisma.prediction.findMany({
      where: scope,
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
            reference: `Patient/${obs.userId ?? obs.coupleId ?? "anonymous"}`,
            display: obs.coupleId ? `Couple ${obs.coupleId.slice(0, 8)}` : `Individual ${obs.userId?.slice(0, 8) ?? "User"}`
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
          reference: `Patient/${pred.userId ?? pred.coupleId ?? "anonymous"}`,
          display: pred.coupleId ? `Couple ${pred.coupleId.slice(0, 8)}` : `Individual ${pred.userId?.slice(0, 8) ?? "User"}`
        },
        occurrenceDateTime: pred.createdAt.toISOString(),
        basis: [
          { reference: pred.coupleId ? `Observation?coupleId=${pred.coupleId}` : `Observation?userId=${pred.userId}` }
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

    // FHIR Patient resources for the people in scope (minimal: id, name, gender).
    const patients = await prisma.patient.findMany({ where: { userId: { in: ids } } });
    const patientEntries = patients.map((p) => ({
      resource: {
        resourceType: "Patient",
        id: p.userId ?? p.id,
        ...(p.name ? { name: [{ text: p.name }] } : {}),
        ...(p.sex === "female" || p.sex === "male" ? { gender: p.sex } : {}),
        meta: { source: "ReproAI", lastUpdated: p.createdAt.toISOString() }
      }
    }));

    const fhirBundle = {
      resourceType: "Bundle",
      type: "collection",
      timestamp: new Date().toISOString(),
      total: patientEntries.length + observationEntries.length + riskAssessmentEntries.length,
      entry: [...patientEntries, ...observationEntries, ...riskAssessmentEntries]
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
