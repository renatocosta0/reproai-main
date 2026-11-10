import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";

interface ObservationItem {
  code: string;
  value: number;
  unit?: string;
  effectiveAt?: string;
}

// Bulk longitudinal ingestion for wearable data (e.g. basal body temperature, sleep duration).
// Uses high-performance batch insert (createMany) and performs closed-loop anomaly detection
// to trigger clinician triage alerts without causing alarm to the couple.
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.coupleId || !Array.isArray(body.observations) || body.observations.length === 0) {
      return NextResponse.json(
        { error: "coupleId and non-empty observations array are required" },
        { status: 400 }
      );
    }

    const coupleId = String(body.coupleId);

    // Authorization: patient can only log for their couple; clinician can log for any
    if (session.role === "PATIENT" && session.coupleId !== coupleId) {
      return NextResponse.json({ error: "Forbidden: couple mismatch" }, { status: 403 });
    }

    const validObservations = (body.observations as ObservationItem[])
      .filter((obs) => obs && typeof obs.code === "string" && typeof obs.value === "number" && !isNaN(obs.value))
      .map((obs) => ({
        coupleId,
        code: obs.code.trim(),
        value: obs.value,
        unit: obs.unit ? obs.unit.trim() : null,
        effectiveAt: obs.effectiveAt ? new Date(obs.effectiveAt) : new Date()
      }));

    if (validObservations.length === 0) {
      return NextResponse.json(
        { error: "No valid observations provided (numeric value and code required)" },
        { status: 400 }
      );
    }

    // High-performance bulk insert
    const insertResult = await prisma.observation.createMany({
      data: validObservations
    });

    // ── CLOSED-LOOP ANOMALY DETECTION (Longitudinal Biomarkers) ─────────────
    let alertTriggered = false;
    let alertReason: string | null = null;

    // Check A: Chronic Sleep Deprivation (< 5.0 hours persistent)
    const sleepObservations = validObservations.filter((o) =>
      o.code === "sleep-hours" || o.code === "93832-4" || o.code.toLowerCase().includes("sleep")
    );
    if (sleepObservations.length >= 3) {
      const avgSleep = sleepObservations.reduce((acc, curr) => acc + curr.value, 0) / sleepObservations.length;
      if (avgSleep < 5.0) {
        alertTriggered = true;
        alertReason = `Chronic sleep deprivation detected (mean ${avgSleep.toFixed(1)}h over ${sleepObservations.length} logs). May adversely affect hypothalamic-pituitary-gonadal axis.`;
      }
    }

    // Check B: Basal Body Temperature (BBT) Monophasic / Anovulatory Pattern
    const bbtObservations = validObservations.filter((o) =>
      o.code === "body-temperature" || o.code === "8310-5" || o.code.toLowerCase().includes("temp")
    );
    if (bbtObservations.length >= 7) {
      const temps = bbtObservations.map((o) => o.value);
      const minTemp = Math.min(...temps);
      const maxTemp = Math.max(...temps);
      // Standard biphasic shift requires >= 0.3°C - 0.5°C rise post-ovulation (WHO criteria)
      if (maxTemp - minTemp < 0.25) {
        alertTriggered = true;
        alertReason = `Monophasic basal temperature profile detected over ${bbtObservations.length} days (thermal variation < 0.25°C). Ovulatory dysfunction or luteal phase defect suspected.`;
      }
    }

    // If an anomaly was detected, create or update clinician follow-up alert
    if (alertTriggered && alertReason) {
      const existingAlert = await prisma.followUp.findFirst({
        where: { coupleId, status: "ALERT_RAISED" }
      });

      if (!existingAlert) {
        await prisma.followUp.create({
          data: {
            coupleId,
            status: "ALERT_RAISED",
            note: alertReason
          }
        });
      } else {
        await prisma.followUp.update({
          where: { id: existingAlert.id },
          data: { note: `${existingAlert.note ? existingAlert.note + " | " : ""}${alertReason}` }
        });
      }
    }

    await audit(session.userId, "bulk_observations_ingested", `couple:${coupleId}:${insertResult.count}`);

    return NextResponse.json({
      ok: true,
      count: insertResult.count,
      alertTriggered
    });
  } catch (error: any) {
    console.error("[POST /api/observations/bulk] error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to ingest bulk observations" },
      { status: 500 }
    );
  }
}

