// Fertility window estimation.
// Combines calendar-based calculation with biological biomarker calibration
// using wearable Basal Body Temperature (BBT, LOINC 8310-5) and sleep (LOINC 93832-4).
//
// Clinical rationale:
// - Post-ovulatory progesterone causes a sustained thermal shift, confirmed
//   retrospectively with the Roetzer / Sensiplan 3-over-6 rule.
// - Detecting it calibrates the ovulation day vs. the static 14-day assumption.
// - Calendar estimates are unreliable with irregular cycles or PCOS and are
//   never a contraceptive method.
//
// Not wired into the app yet: it needs persisted period starts and cycle
// lengths (see the proposed MenstrualCycle model).

export interface TemperatureObservation {
  date: string; // ISO date or YYYY-MM-DD
  value: number; // Celsius
}

export interface SleepObservation {
  date: string;
  hours: number; // hours of sleep
}

export interface CycleInput {
  lastPeriodStart?: string; // ISO date entered by the user
  cycleLengthDays?: number; // entered by the user (typically 24-38 days)
  temperatures?: TemperatureObservation[];
  sleepRecords?: SleepObservation[];
}

export interface CalibrationDetails {
  baselineTempCelsius: number;
  ovulatoryTempCelsius: number;
  shiftMagnitudeCelsius: number;
  shiftDate: string;
  daysAdjustedFromCalendar: number;
  observationsAnalyzedCount: number;
  sleepQualityAssessment?: string;
}

export interface FertilityWindow {
  ovulationDate: string;
  windowStart: string;
  windowEnd: string;
  method: "CALENDAR_ONLY" | "WEARABLE_CALIBRATED";
  thermalShiftDetected: boolean;
  calibrationDetails?: CalibrationDetails;
  explanation: string;
}

import { FEVER_THRESHOLD_C, SLEEP_SHORT_H, findRoetzerShift } from "./observation-analysis";

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Estimates the fertile window and calibrates ovulation using wearable
 * Basal Body Temperature (BBT) observations when available.
 */
export function estimateFertilityWindow(input: CycleInput): FertilityWindow | null {
  if (!input.lastPeriodStart || !input.cycleLengthDays) return null;

  const cycleStart = new Date(input.lastPeriodStart);
  if (Number.isNaN(cycleStart.getTime())) return null;

  // ── Baseline Calendar Estimate ──────────────────────────────────────────────
  // Static mathematical assumption: luteal phase is ~14 days before next period.
  const calendarOvulation = new Date(cycleStart);
  calendarOvulation.setDate(cycleStart.getDate() + input.cycleLengthDays - 14);

  // ── Analyze Wearable BBT (LOINC 8310-5) ─────────────────────────────────────
  let calibratedOvulation: Date = new Date(calendarOvulation);
  let thermalShiftDetected = false;
  let calibrationDetails: CalibrationDetails | undefined = undefined;

  const temps = (input.temperatures || [])
    .map((t) => ({ date: new Date(t.date), value: t.value }))
    .filter((t) => !Number.isNaN(t.date.getTime()) && t.date >= cycleStart)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  // Roetzer / Sensiplan 3-over-6 rule (shared with the clinician alerts):
  // three consecutive readings above the coverline (highest of the previous
  // six), the third at least 0.2 °C higher. Fever readings are left out.
  const valid = temps.filter((t) => t.value < FEVER_THRESHOLD_C);
  const rise = findRoetzerShift(valid.map((t) => t.value));
  if (rise) {
    const current = valid[rise.index];
    const baselineTemp = rise.coverline;
    const delta = current.value - baselineTemp;
    // Ovulation usually falls on the day before the first raised reading.
    const detectedOvulation = new Date(current.date);
    detectedOvulation.setDate(current.date.getDate() - 1);
    calibratedOvulation = detectedOvulation;
    thermalShiftDetected = true;

    const daysDiff = Math.round((calibratedOvulation.getTime() - calendarOvulation.getTime()) / (1000 * 60 * 60 * 24));

    // Sleep context (LOINC 93832-4): short nights make morning readings less reliable.
    let sleepAssessment: string | undefined;
    const validSleep = (input.sleepRecords ?? []).filter((r) => r.hours > 0);
    if (validSleep.length > 0) {
      const avgHours = validSleep.reduce((acc, r) => acc + r.hours, 0) / validSleep.length;
      sleepAssessment =
        avgHours >= SLEEP_SHORT_H
          ? `Average sleep ${avgHours.toFixed(1)}h (7h or more, AASM/SRS): morning readings are likely comparable.`
          : `Average sleep is ${avgHours.toFixed(1)}h (under 7h); short nights can make morning temperature readings less reliable.`;
    }

    calibrationDetails = {
      baselineTempCelsius: Math.round(baselineTemp * 100) / 100,
      ovulatoryTempCelsius: Math.round(current.value * 100) / 100,
      shiftMagnitudeCelsius: Math.round(delta * 100) / 100,
      shiftDate: isoDate(current.date),
      daysAdjustedFromCalendar: daysDiff,
      observationsAnalyzedCount: valid.length,
      sleepQualityAssessment: sleepAssessment
    };
  }

  // ── Construct Fertile Window ───────────────────────────────────────────────
  // Sperm survival is up to 5 days; oocyte survives ~12-24 hours.
  // Window = [Ovulation - 5 days, Ovulation + 1 day]
  const windowStart = new Date(calibratedOvulation);
  windowStart.setDate(calibratedOvulation.getDate() - 5);

  const windowEnd = new Date(calibratedOvulation);
  windowEnd.setDate(calibratedOvulation.getDate() + 1);

  if (thermalShiftDetected && calibrationDetails) {
    const direction =
      calibrationDetails.daysAdjustedFromCalendar === 0
        ? "aligned with"
        : calibrationDetails.daysAdjustedFromCalendar > 0
        ? `${calibrationDetails.daysAdjustedFromCalendar} day(s) later than`
        : `${Math.abs(calibrationDetails.daysAdjustedFromCalendar)} day(s) earlier than`;

    return {
      ovulationDate: isoDate(calibratedOvulation),
      windowStart: isoDate(windowStart),
      windowEnd: isoDate(windowEnd),
      method: "WEARABLE_CALIBRATED",
      thermalShiftDetected: true,
      calibrationDetails,
      explanation: `Calibrated with ${calibrationDetails.observationsAnalyzedCount} wearable Basal Body Temperature readings. Detected a sustained thermal shift of +${calibrationDetails.shiftMagnitudeCelsius} °C on ${calibrationDetails.shiftDate}, placing biological ovulation ${direction} standard calendar projections.`
    };
  }

  return {
    ovulationDate: isoDate(calendarOvulation),
    windowStart: isoDate(windowStart),
    windowEnd: isoDate(windowEnd),
    method: "CALENDAR_ONLY",
    thermalShiftDetected: false,
    explanation:
      "Calculated using the standard calendar assumption (14-day luteal phase). Record basal temperature in the Wearables tab to calibrate this estimate with real biological biomarkers."
  };
}
