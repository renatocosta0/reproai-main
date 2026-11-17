import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canAccessCase } from "@/lib/clinician-scope";
import { hasConsent } from "@/lib/consent";
import { ingestFhirPayload } from "@/lib/fhir/ingest";
import { getAzureFhirConfig, getMalaffiHieConfig } from "@/lib/azure/config";

// POST /api/clinician/cases/:id/sync-ehr
// Allows a clinician to trigger a live sync of laboratory results from the
// connected clinic EHR or FHIR gateway (e.g. Azure Health Data Services / Malaffi HIE).
//
// ZERO MOCKING POLICY:
// If live EHR credentials or endpoints are not configured or the remote service is
// unreachable, this endpoint returns an honest failure without inserting synthetic values.
// Clinicians can always enter verified lab results manually via the UI.

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session || session.role !== "CLINICIAN") {
      return NextResponse.json({ error: "Clinician access required" }, { status: 403 });
    }

    const allowed = await canAccessCase(session.userId, params.id);
    if (!allowed) {
      return NextResponse.json({ error: "This case is not in your care list" }, { status: 403 });
    }

    const members = await prisma.user.findMany({
      where: { coupleId: params.id, role: "PATIENT" },
      include: { patientProfile: true }
    });

    if (members.length === 0) {
      return NextResponse.json({ error: "No patient members found in this case" }, { status: 404 });
    }

    // Verify patient Gate B consent
    const consentingMembers = [];
    for (const member of members) {
      const hasClinicianAccess = await hasConsent(member.id, "CLINICIAN_ACCESS");
      const hasLabConsent = await hasConsent(member.id, "LAB_RESULTS");
      if (hasClinicianAccess && hasLabConsent) {
        consentingMembers.push(member);
      }
    }

    if (consentingMembers.length === 0) {
      return NextResponse.json(
        { error: "Consent required: Patient has not authorized laboratory synchronization (Gate B)." },
        { status: 403 }
      );
    }

    // Check whether an active live EHR / FHIR endpoint is configured
    const fhirCfg = getAzureFhirConfig();
    const malaffiCfg = getMalaffiHieConfig();

    const hasActiveFhir = Boolean(fhirCfg?.endpoint && fhirCfg.clientId && fhirCfg.clientSecret);
    const hasActiveMalaffi = Boolean(
      malaffiCfg?.gatewayUrl &&
      malaffiCfg.facilityId &&
      malaffiCfg.partnerApiKey &&
      malaffiCfg.partnerApiKey !== "sk_reproai_partner_uae_demo_key"
    );

    // If no active live credentials are configured, degrade honestly with an explicit error.
    // Do NOT mock or invent fake lab results.
    if (!hasActiveFhir && !hasActiveMalaffi) {
      return NextResponse.json(
        {
          ok: false,
          error: "EHR gateway not connected: Live Azure FHIR or Clinic LIS credentials are not active in this environment. Please configure production endpoint credentials or enter laboratory results manually below."
        },
        { status: 422 }
      );
    }

    const targetUrl = hasActiveFhir ? fhirCfg!.endpoint : malaffiCfg!.gatewayUrl;
    let totalImported = 0;
    const details: string[] = [];

    for (const member of consentingMembers) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);

        const res = await fetch(`${targetUrl}/Observation?subject=${encodeURIComponent(member.id)}&category=laboratory`, {
          headers: {
            Accept: "application/fhir+json",
            ...(hasActiveFhir && fhirCfg?.clientSecret ? { Authorization: `Bearer ${fhirCfg.clientSecret}` } : {}),
            ...(hasActiveMalaffi && malaffiCfg?.partnerApiKey ? { "X-API-Key": malaffiCfg.partnerApiKey } : {})
          },
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (!res.ok) {
          throw new Error(`EHR server returned HTTP ${res.status} (${res.statusText})`);
        }

        const bundle = await res.json();
        const outcome = await ingestFhirPayload(bundle, member.id);
        totalImported += outcome.imported;
        details.push(`${member.patientProfile?.name || member.email}: ${outcome.imported} records imported`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Connection failed";
        return NextResponse.json(
          {
            ok: false,
            error: `EHR connection failed (${msg}). Please verify clinic gateway connectivity or enter results manually below.`
          },
          { status: 422 }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      imported: totalImported,
      message: totalImported > 0
        ? `Successfully synchronized ${totalImported} laboratory record${totalImported === 1 ? "" : "s"} from connected Clinic EHR.`
        : "Clinic EHR query succeeded. No new laboratory records found for this patient.",
      details
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "EHR synchronization failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
