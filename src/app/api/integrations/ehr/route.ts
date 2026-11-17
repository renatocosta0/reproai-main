import { NextRequest, NextResponse } from "next/server";
import { ingestFhirPayload, LOINC_TO_LAB_CODE } from "@/lib/fhir/ingest";

// POST /api/integrations/ehr
// Automated machine-to-machine integration endpoint for hospital EHR / Malaffi HIE.
// Accepts HL7 FHIR R4 Observation or Bundle resources, verifies authentication,
// and ingests lab results directly into ReproAI without clinician manual data entry.

function isAuthorized(req: NextRequest): boolean {
  const masterKey = process.env.REPROAI_PARTNER_API_KEY || process.env.AUTH_SECRET;
  const authHeader = req.headers.get("authorization") || req.headers.get("x-api-key");
  if (!authHeader) return false;
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  return Boolean(masterKey && token === masterKey);
}

export async function POST(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: "Unauthorized: valid EHR integration token required" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const fallbackUserId = req.nextUrl.searchParams.get("userId") || undefined;
    const outcome = await ingestFhirPayload(body, fallbackUserId);

    return NextResponse.json(
      {
        ok: outcome.ok,
        imported: outcome.imported,
        skipped: outcome.skipped,
        results: outcome.results,
        errors: outcome.errors
      },
      { status: outcome.imported > 0 ? 200 : 422 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal integration error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "ReproAI Hospital & Malaffi HIE Interoperability Gateway",
    standard: "HL7 FHIR R4",
    status: "active",
    supportedLoincCodes: LOINC_TO_LAB_CODE,
    capabilities: [
      "Automated LIS result ingestion (Observation / Bundle)",
      "Continuous synchronization without manual clinician entry",
      "Consent validation at API boundary (Gate B)",
      "Zero-fabrication physiological range verification",
      "Immutable audit trail logging"
    ]
  });
}
