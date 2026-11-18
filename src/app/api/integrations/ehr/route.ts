import { NextRequest, NextResponse } from "next/server";
import { ingestFhirPayload, LOINC_TO_LAB_CODE } from "@/lib/fhir/ingest";
import { isAuthorized, partnerKey } from "@/lib/fhir/partner-key";

// POST /api/integrations/ehr
// Machine-to-machine endpoint for a hospital EHR / Malaffi HIE to push lab results as
// HL7 FHIR R4 Observation or Bundle resources.
//
// This route is outside the role middleware, so the partner key is its only protection.
// It accepts only REPROAI_PARTNER_API_KEY: never the session secret, never the demo key.

export async function POST(req: NextRequest) {
  const key = partnerKey();
  if (!key) {
    return NextResponse.json({ error: "EHR integration endpoint is not enabled in this environment" }, { status: 503 });
  }
  if (!isAuthorized(req.headers, key)) {
    return NextResponse.json({ error: "Unauthorized: valid EHR integration token required" }, { status: 401 });
  }

  try {
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
  } catch {
    return NextResponse.json({ error: "Internal integration error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "ReproAI EHR / HIE lab-result endpoint",
    standard: "HL7 FHIR R4",
    // Whether a partner key is configured here; no hospital is connected by default.
    enabled: partnerKey() !== null,
    supportedLoincCodes: LOINC_TO_LAB_CODE,
    behaviour: [
      "Accepts FHIR R4 Observation or Bundle resources carrying lab results",
      "Imports only results whose patient has consented to LAB_RESULTS",
      "Skips results with an unmapped code, a missing collection date, an unaccepted unit or an out-of-range value",
      "Skips results already imported",
      "Writes an audit log entry for each imported value"
    ]
  });
}
