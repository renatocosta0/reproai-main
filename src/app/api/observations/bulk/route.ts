import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasConsent } from "@/lib/consent";
import { audit } from "@/lib/audit";
import { canAccessCase } from "@/lib/clinician-scope";
import { normaliseObservation } from "@/lib/observation-analysis";
import { analyseAndAlert } from "@/lib/observation-alerts";

interface ObservationItem {
  code: string;
  value: number;
  unit?: string;
  effectiveAt?: string;
}

// Bulk longitudinal ingestion for wearable data (e.g. basal body temperature, sleep duration).
// Manual entry (typed or pasted). Device data uses /api/observations/import.
// Runs the shared longitudinal analysis, which may raise a clinician-side alert.
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (session.role === "PATIENT" && !(await hasConsent(session.userId, "WEARABLES"))) {
      return NextResponse.json({ error: "Turn on 'Store my temperature and sleep readings' in Privacy & consent to log readings." }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const coupleId = body?.coupleId ? String(body.coupleId) : session.coupleId;

    if (!body || !Array.isArray(body.observations) || body.observations.length === 0) {
      return NextResponse.json(
        { error: "non-empty observations array is required" },
        { status: 400 }
      );
    }

    // Authorization: patients log only for their own couple; clinicians only for
    // cases in their scope (prescribed or assigned).
    if (session.role === "PATIENT" && body.coupleId && session.coupleId !== body.coupleId) {
      return NextResponse.json({ error: "Forbidden: couple mismatch" }, { status: 403 });
    }
    if (session.role === "CLINICIAN" && (!coupleId || !(await canAccessCase(session.userId, coupleId)))) {
      return NextResponse.json({ error: "Forbidden: this case is not in your scope" }, { status: 403 });
    }

    // Only temperature and sleep readings are accepted; one bad item rejects the
    // whole batch so nothing is half-saved. The unit is set by the server.
    const items = body.observations as ObservationItem[];
    if (items.length > 500) {
      return NextResponse.json({ error: "Send at most 500 readings at a time." }, { status: 400 });
    }
    const validObservations = [];
    for (const [i, obs] of items.entries()) {
      const checked = normaliseObservation(obs?.code, obs?.value);
      if (!checked.ok) {
        return NextResponse.json({ error: `Reading ${i + 1}: ${checked.error}` }, { status: 400 });
      }
      const effectiveAt = obs.effectiveAt ? new Date(obs.effectiveAt) : new Date();
      if (Number.isNaN(effectiveAt.getTime()) || effectiveAt.getTime() > Date.now() + 86_400_000) {
        return NextResponse.json({ error: `Reading ${i + 1}: enter a valid date that is not in the future.` }, { status: 400 });
      }
      validObservations.push({
        coupleId: coupleId ?? null,
        userId: session.userId,
        code: checked.code,
        value: checked.value,
        unit: checked.unit,
        effectiveAt,
        source: "MANUAL"
      });
    }

    // High-performance bulk insert
    const insertResult = await prisma.observation.createMany({
      data: validObservations
    });

    // Same longitudinal analysis and clinician-side alert as every other ingestion path.
    const { alertTriggered, analytics } = await analyseAndAlert(session.userId, coupleId ?? null);

    await audit(session.userId, "bulk_observations_ingested", `couple:${coupleId}:${insertResult.count}`);

    return NextResponse.json({ ok: true, count: insertResult.count, alertTriggered, analytics });
  } catch (error: any) {
    console.error("[POST /api/observations/bulk] error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to ingest bulk observations" },
      { status: 500 }
    );
  }
}

