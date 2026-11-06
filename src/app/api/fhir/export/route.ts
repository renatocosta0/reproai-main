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

    const fhirBundle = {
      resourceType: "Bundle",
      type: "collection",
      entry: observations.map((obs) => ({
        resource: {
          resourceType: "Observation",
          id: obs.id,
          status: "final",
          code: {
            coding: [
              {
                system: "http://loinc.org",
                code: obs.code,
                display: obs.code // In production, map LOINC codes to display names
              }
            ],
            text: obs.code
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
      }))
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
