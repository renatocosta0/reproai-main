import { describe, expect, it } from "vitest";
import { mapDeviceSamples, type DeviceSample } from "./device-import";
import { decodeIeee11073Float, parseTemperatureMeasurement } from "./ble-thermometer";

const t = (iso: string) => iso;

describe("mapDeviceSamples (Capgo HealthSample shape)", () => {
  it("imports basal body temperature with provenance and converts Fahrenheit", () => {
    const samples: DeviceSample[] = [
      { dataType: "basalBodyTemperature", value: 36.45, unit: "celsius", startDate: t("2026-11-10T06:30:00Z"), endDate: t("2026-11-10T06:30:00Z"), sourceName: "Natural Cycles", platformId: "hk-1" },
      { dataType: "basalBodyTemperature", value: 97.7, unit: "fahrenheit", startDate: t("2026-11-11T06:30:00Z"), sourceName: "Oura" }
    ];
    const { rows, skipped } = mapDeviceSamples(samples, "HEALTHKIT");
    expect(skipped).toEqual([]);
    expect(rows[0]).toMatchObject({ code: "8310-5", value: 36.45, unit: "Cel", device: "Natural Cycles", externalId: "hk-1" });
    expect(rows[1]).toMatchObject({ value: 36.5, externalId: "basalBodyTemperature:2026-11-11T06:30:00.000Z" });
  });

  it("skips general body temperature from health apps but accepts it from a Bluetooth thermometer", () => {
    const s: DeviceSample = { dataType: "bodyTemperature", value: 36.9, unit: "celsius", startDate: t("2026-11-10T14:00:00Z") };
    expect(mapDeviceSamples([s], "HEALTH_CONNECT").rows).toHaveLength(0);
    expect(mapDeviceSamples([s], "BLUETOOTH", "Easy@Home").rows[0]).toMatchObject({ value: 36.9, device: "Easy@Home" });
  });

  it("rolls sleep up to one reading per night, counting only asleep stages", () => {
    const samples: DeviceSample[] = [
      {
        dataType: "sleep", value: 480, unit: "minute", startDate: t("2026-11-09T22:30:00Z"), endDate: t("2026-11-10T06:30:00Z"),
        stages: [
          { startDate: "", endDate: "", stage: "light", durationMinutes: 200 },
          { startDate: "", endDate: "", stage: "deep", durationMinutes: 90 },
          { startDate: "", endDate: "", stage: "rem", durationMinutes: 100 },
          { startDate: "", endDate: "", stage: "awake", durationMinutes: 40 },
          { startDate: "", endDate: "", stage: "inBed", durationMinutes: 50 }
        ]
      },
      { dataType: "sleep", value: 60, startDate: t("2026-11-10T13:00:00Z"), endDate: t("2026-11-10T14:00:00Z"), sleepState: "asleep" },
      { dataType: "sleep", value: 30, startDate: t("2026-11-10T21:00:00Z"), endDate: t("2026-11-10T21:30:00Z"), sleepState: "inBed" }
    ];
    const { rows, skipped } = mapDeviceSamples(samples, "HEALTH_CONNECT");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ code: "93832-4", unit: "h", value: 7.5, externalId: "sleep-night:2026-11-10" });
    expect(skipped).toHaveLength(1);
  });

  it("rejects unused types, future dates and implausible values", () => {
    const { rows, skipped } = mapDeviceSamples(
      [
        { dataType: "steps", value: 9000, startDate: t("2026-11-10T00:00:00Z") },
        { dataType: "basalBodyTemperature", value: 36.5, startDate: t("2099-01-01T00:00:00Z") },
        { dataType: "basalBodyTemperature", value: 42, unit: "celsius", startDate: t("2026-11-10T06:00:00Z") }
      ],
      "HEALTHKIT"
    );
    expect(rows).toHaveLength(0);
    expect(skipped).toHaveLength(3);
  });
});

describe("Bluetooth Health Thermometer decoding", () => {
  const float = (mantissa: number, exponent: number) => ((exponent & 0xff) << 24) | (mantissa & 0xffffff);

  it("decodes IEEE 11073 FLOAT values and special values", () => {
    expect(decodeIeee11073Float(float(3645, -2))).toBeCloseTo(36.45);
    expect(decodeIeee11073Float(float(-15, -1))).toBeCloseTo(-1.5);
    expect(decodeIeee11073Float(0x007fffff)).toBeNull();
  });

  it("parses a Celsius reading with a device time stamp", () => {
    const buf = new DataView(new ArrayBuffer(12));
    buf.setUint8(0, 0x02); // Celsius, time stamp present
    buf.setUint32(1, float(3652, -2) >>> 0, true);
    buf.setUint16(5, 2026, true);
    [11, 14, 6, 45, 0].forEach((v, i) => buf.setUint8(7 + i, v));
    const r = parseTemperatureMeasurement(buf)!;
    expect(r.celsius).toBe(36.52);
    expect(r.takenAt).toEqual(new Date(2026, 10, 14, 6, 45, 0));
  });

  it("converts Fahrenheit readings and tolerates a missing time stamp", () => {
    const buf = new DataView(new ArrayBuffer(5));
    buf.setUint8(0, 0x01); // Fahrenheit
    buf.setUint32(1, float(977, -1) >>> 0, true);
    expect(parseTemperatureMeasurement(buf)).toMatchObject({ celsius: 36.5, takenAt: null });
  });
});
