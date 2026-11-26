import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasConsent } from "@/lib/consent";
import { audit } from "@/lib/audit";
import { DEVICE_SOURCES, mapDeviceSamples, type DeviceSample, type DeviceSource } from "@/lib/device-import";
import { analyseAndAlert } from "@/lib/observation-alerts";

// POST /api/observations/import
// { source: "BLUETOOTH" | "HEALTH_CONNECT" | "HEALTHKIT" | "ULTRAHUMAN", device?: string, samples: HealthSample[] }
//
// One door for device data. Samples use the @capgo/capacitor-health HealthSample
// shape. Patients only (it is their device), behind the WEARABLES consent. Every
// reading keeps its source, device and external id; re-imports skip duplicates
// (sleep nights are updated in place). Runs the shared longitudinal analysis.
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "PATIENT") {
      return NextResponse.json({ error: "Only patients can import readings from their own devices." }, { status: 403 });
    }
    if (!(await hasConsent(session.userId, "WEARABLES"))) {
      return NextResponse.json({ error: "Turn on 'Store my temperature and sleep readings' in Privacy & consent to import readings." }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const source = body?.source as DeviceSource;
    if (!DEVICE_SOURCES.includes(source)) {
      return NextResponse.json({ error: `source must be one of ${DEVICE_SOURCES.join(", ")}.` }, { status: 400 });
    }
    if (!Array.isArray(body.samples) || body.samples.length === 0) {
      return NextResponse.json({ error: "samples must be a non-empty array." }, { status: 400 });
    }
    if (body.samples.length > 2000) {
      return NextResponse.json({ error: "Import at most 2,000 samples at a time." }, { status: 400 });
    }
    const fallbackDevice = typeof body.device === "string" && body.device.trim() ? body.device.trim().slice(0, 120) : null;

    const { rows, skipped } = mapDeviceSamples(body.samples as DeviceSample[], source, fallbackDevice);
    if (rows.length === 0) {
      return NextResponse.json({ error: "None of these samples can be used.", skipped: skipped.slice(0, 20) }, { status: 400 });
    }

    const base = { userId: session.userId, coupleId: session.coupleId ?? null, source };
    const temps = rows.filter((r) => r.kind === "temperature");
    const created = temps.length
      ? await prisma.observation.createMany({
          data: temps.map((r) => ({ ...base, code: r.code, value: r.value, unit: r.unit, effectiveAt: r.effectiveAt, device: r.device, externalId: r.externalId })),
          skipDuplicates: true
        })
      : { count: 0 };

    let nightsSaved = 0;
    // Sleep nights and passive daily summaries are one row per day, updated in place on re-import.
    let dailySaved = 0;
    for (const r of rows.filter((x) => x.kind === "daily")) {
      await prisma.observation.upsert({
        where: { userId_source_externalId: { userId: session.userId, source, externalId: r.externalId } },
        create: { ...base, code: r.code, value: r.value, unit: r.unit, effectiveAt: r.effectiveAt, device: r.device, externalId: r.externalId },
        update: { value: r.value, effectiveAt: r.effectiveAt, device: r.device }
      });
      dailySaved++;
    }
    for (const r of rows.filter((x) => x.kind === "sleep")) {
      await prisma.observation.upsert({
        where: { userId_source_externalId: { userId: session.userId, source, externalId: r.externalId } },
        create: { ...base, code: r.code, value: r.value, unit: r.unit, effectiveAt: r.effectiveAt, device: r.device, externalId: r.externalId },
        update: { value: r.value, effectiveAt: r.effectiveAt, device: r.device }
      });
      nightsSaved++;
    }

    const { alertTriggered, analytics } = await analyseAndAlert(session.userId, session.coupleId ?? null);
    await audit(session.userId, "device_observations_imported", `source:${source}:temperature:${created.count}:sleep_nights:${nightsSaved}:daily:${dailySaved}`);

    return NextResponse.json({
      ok: true,
      source,
      temperatureAdded: created.count,
      temperatureDuplicates: temps.length - created.count,
      sleepNightsSaved: nightsSaved,
      dailySummariesSaved: dailySaved,
      skipped: skipped.length,
      skippedExamples: skipped.slice(0, 5),
      alertTriggered,
      analytics
    });
  } catch (error: any) {
    console.error("[POST /api/observations/import] error:", error);
    return NextResponse.json({ error: "Readings could not be imported." }, { status: 500 });
  }
}
