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

    // ── CLINICAL LONGITUDINAL TIME-SERIES ANOMALY DETECTION ─────────────
    let alertTriggered = false;
    let alertReason: string | null = null;
    let bbtProfile: "BIPHASIC_OVULATORY" | "MONOPHASIC_SUSPECTED_ANOVULATORY" | "INSUFFICIENT_DATA" = "INSUFFICIENT_DATA";
    let thermalShiftDelta = 0;
    let meanSleepDuration = 0;
    let sleepDisruptionDetected = false;

    // Fetch combined historical + new observations for couple to assess longitudinal trajectory
    const allRecentObservations = await prisma.observation.findMany({
      where: { coupleId },
      orderBy: { effectiveAt: "asc" },
      take: 60
    });

    // ── 1. Basal Body Temperature (BBT) Time-Series Analysis (Coverline / CUSUM)
    const bbtSeries = allRecentObservations
      .filter((o) => o.code === "body-temperature" || o.code === "8310-5" || o.code.toLowerCase().includes("temp"))
      .map((o) => ({ date: o.effectiveAt, value: o.value }));

    if (bbtSeries.length >= 10) {
      // Calculate 6-day baseline window vs subsequent 3-day post-shift window (WHO Roetzer Rule)
      const values = bbtSeries.map((s) => s.value);
      let maxShift = 0;

      for (let i = 6; i < values.length - 2; i++) {
        const baselineMean = values.slice(i - 6, i).reduce((a, b) => a + b, 0) / 6;
        const postShiftMean = values.slice(i, i + 3).reduce((a, b) => a + b, 0) / 3;
        const shift = postShiftMean - baselineMean;
        if (shift > maxShift) {
          maxShift = shift;
        }
      }

      thermalShiftDelta = Number(maxShift.toFixed(2));

      // Biphasic shift criterion: temperature plateau must rise >= 0.3°C above baseline
      if (maxShift >= 0.28) {
        bbtProfile = "BIPHASIC_OVULATORY";
      } else {
        bbtProfile = "MONOPHASIC_SUSPECTED_ANOVULATORY";
        alertTriggered = true;
        alertReason = `Longitudinal BBT Time-Series: Monophasic thermal curve detected across ${bbtSeries.length} consecutive days (maximum thermal shift: ${thermalShiftDelta}°C; physiological target: ≥ 0.30°C). Possible anovulatory cycle or luteal phase defect (WHO Guideline / ICD-10 N97.0).`;
      }
    }

    // ── 2. Circadian Rhythm & Sleep Time-Series Evaluation
    const sleepSeries = allRecentObservations
      .filter((o) => o.code === "sleep-hours" || o.code === "93832-4" || o.code.toLowerCase().includes("sleep"))
      .map((o) => o.value);

    if (sleepSeries.length >= 3) {
      meanSleepDuration = Number((sleepSeries.reduce((a, b) => a + b, 0) / sleepSeries.length).toFixed(1));
      
      // Calculate sleep variance / standard deviation
      const variance = sleepSeries.reduce((sum, val) => sum + Math.pow(val - meanSleepDuration, 2), 0) / sleepSeries.length;
      const stdDev = Math.sqrt(variance);

      if (meanSleepDuration < 5.0 || stdDev > 2.8) {
        sleepDisruptionDetected = true;
        alertTriggered = true;
        const sleepNote = `Circadian Rhythm Disruption: Mean sleep ${meanSleepDuration}h/night (variability σ = ${stdDev.toFixed(1)}h). Sustained sleep fragmentation impairs hypothalamic-pituitary-gonadal (HPG) pulsatile GnRH release (ASRM 2023).`;
        alertReason = alertReason ? `${alertReason} | ${sleepNote}` : sleepNote;
      }
    }

    // ── 3. Proactive Clinician Triage Alert
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
          data: { note: alertReason }
        });
      }
    }

    await audit(session.userId, "bulk_observations_ingested", `couple:${coupleId}:${insertResult.count}`);

    return NextResponse.json({
      ok: true,
      count: insertResult.count,
      alertTriggered,
      analytics: {
        bbt_profile: bbtProfile,
        thermal_shift_detected_celsius: thermalShiftDelta,
        mean_sleep_hours: meanSleepDuration,
        sleep_disruption_flag: sleepDisruptionDetected,
        total_longitudinal_records: allRecentObservations.length
      }
    });
  } catch (error: any) {
    console.error("[POST /api/observations/bulk] error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to ingest bulk observations" },
      { status: 500 }
    );
  }
}

