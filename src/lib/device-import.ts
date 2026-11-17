// Turns device samples into ReproAI readings. The input shape is the HealthSample
// returned by @capgo/capacitor-health (Apple HealthKit and Android Health Connect),
// so a native wrapper can post plugin output unchanged. Bluetooth thermometer and
// vendor adapters (e.g. Ultrahuman) post the same shape.
//
// Rules:
// - Temperature: basal body temperature only. General body temperature from a
//   phone health store may be taken at any time of day and would corrupt the
//   ovulation-shift check, so it is accepted only from a dedicated Bluetooth
//   thermometer reading taken in ReproAI. Fahrenheit is converted to Celsius.
// - Sleep: one reading per night (the date the sleep ended), summing asleep time.
//   With stage data, awake and in-bed stages are excluded.
// - Every reading keeps its source, device and a stable external id, so
//   re-importing the same data never creates duplicates.

import { normaliseObservation } from "@/lib/observation-analysis";

export const DEVICE_SOURCES = ["BLUETOOTH", "HEALTH_CONNECT", "HEALTHKIT", "ULTRAHUMAN"] as const;
export type DeviceSource = (typeof DEVICE_SOURCES)[number];

export const SOURCE_LABELS: Record<string, string> = {
  MANUAL: "Entered by hand",
  BLUETOOTH: "Bluetooth thermometer",
  HEALTH_CONNECT: "Health Connect",
  HEALTHKIT: "Apple Health",
  ULTRAHUMAN: "Ultrahuman"
};

export interface DeviceSample {
  dataType: string;
  value: number;
  unit?: string;
  startDate: string;
  endDate?: string;
  sourceName?: string;
  deviceType?: string;
  platformId?: string;
  sleepState?: string;
  stages?: { startDate: string; endDate: string; stage: string; durationMinutes: number }[];
}

export interface ImportRow {
  code: string;
  value: number;
  unit: string;
  effectiveAt: Date;
  device: string | null;
  externalId: string;
  kind: "temperature" | "sleep";
}

export interface MapResult {
  rows: ImportRow[];
  skipped: { index: number; reason: string }[];
}

const ASLEEP = new Set(["asleep", "rem", "deep", "light"]);
const NOT_ASLEEP = new Set(["awake", "inBed"]);

function date(s: unknown): Date | null {
  if (typeof s !== "string") return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function deviceName(sample: DeviceSample, fallback: string | null): string | null {
  const name = [sample.sourceName, sample.deviceType].filter((x) => typeof x === "string" && x.trim()).join(" · ").trim();
  return (name || fallback || null)?.slice(0, 120) ?? null;
}

export function mapDeviceSamples(samples: DeviceSample[], source: DeviceSource, fallbackDevice: string | null = null): MapResult {
  const rows: ImportRow[] = [];
  const skipped: MapResult["skipped"] = [];
  const nights = new Map<string, { minutes: number; end: Date; device: string | null }>();
  const now = Date.now() + 86_400_000;

  samples.forEach((s, index) => {
    if (!s || typeof s !== "object") return skipped.push({ index, reason: "Not a sample." });
    const start = date(s.startDate);
    const end = date(s.endDate) ?? start;
    if (!start || !end || end.getTime() > now) return skipped.push({ index, reason: "Missing or future date." });

    if (s.dataType === "basalBodyTemperature" || (s.dataType === "bodyTemperature" && source === "BLUETOOTH")) {
      const celsius = s.unit === "fahrenheit" || (s.unit === undefined && s.value > 50) ? ((s.value - 32) * 5) / 9 : s.value;
      const checked = normaliseObservation("8310-5", Math.round(celsius * 100) / 100);
      if (!checked.ok) return skipped.push({ index, reason: checked.error });
      rows.push({
        code: checked.code,
        value: checked.value,
        unit: checked.unit,
        effectiveAt: start,
        device: deviceName(s, fallbackDevice),
        externalId: (s.platformId || `${s.dataType}:${start.toISOString()}`).slice(0, 200),
        kind: "temperature"
      });
      return;
    }
    if (s.dataType === "bodyTemperature") {
      return skipped.push({ index, reason: "General body temperature is not basal; only basal temperature is imported from health apps." });
    }

    if (s.dataType === "sleep") {
      let minutes: number;
      if (Array.isArray(s.stages) && s.stages.length > 0) {
        minutes = s.stages.filter((st) => ASLEEP.has(st.stage)).reduce((a, st) => a + (Number(st.durationMinutes) || 0), 0);
      } else if (s.sleepState && NOT_ASLEEP.has(s.sleepState)) {
        return skipped.push({ index, reason: `Sleep state "${s.sleepState}" is not time asleep.` });
      } else {
        minutes = Number(s.value);
      }
      if (!Number.isFinite(minutes) || minutes <= 0) return skipped.push({ index, reason: "No time asleep in this sample." });
      const night = end.toISOString().slice(0, 10);
      const cur = nights.get(night);
      nights.set(night, {
        minutes: (cur?.minutes ?? 0) + minutes,
        end: cur && cur.end > end ? cur.end : end,
        device: cur?.device ?? deviceName(s, fallbackDevice)
      });
      return;
    }

    skipped.push({ index, reason: `Data type "${String(s.dataType)}" is not used by ReproAI.` });
  });

  for (const [night, n] of nights) {
    const checked = normaliseObservation("93832-4", Math.round((n.minutes / 60) * 100) / 100);
    if (!checked.ok) {
      skipped.push({ index: -1, reason: `Night of ${night}: ${checked.error}` });
      continue;
    }
    rows.push({ code: checked.code, value: checked.value, unit: checked.unit, effectiveAt: n.end, device: n.device, externalId: `sleep-night:${night}`, kind: "sleep" });
  }
  return { rows, skipped };
}
