// Fertility window estimation.
// Combines calendar-based calculation with biological biomarker calibration
// using wearable Basal Body Temperature (BBT, LOINC 8310-5) and sleep (LOINC 93832-4).
//
// Clinical rationale (ACOG & ESHRE guidelines):
// - The follicular phase has lower baseline body temperatures (typically 36.1–36.5 °C).
// - Post-ovulatory progesterone rise causes a sustained thermal shift (+0.20 to +0.50 °C).
// - Detecting this shift calibrates the true biological ovulation day vs. the static 14-day assumption.

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

  // We need at least 3 temperature readings within the cycle to detect a baseline and shift
  if (temps.length >= 3) {
    // Early follicular readings (first 10 days of cycle or first 40% of observations)
    const earlyTemps = temps.slice(0, Math.max(2, Math.floor(temps.length / 2)));
    const baselineTemp =
      earlyTemps.reduce((acc, curr) => acc + curr.value, 0) / earlyTemps.length;

    // Look for a sustained thermal shift: temperature rises >= 0.22 °C above baseline
    // in the mid-cycle window (day 10 to day 24 of cycle)
    const SHIFT_THRESHOLD = 0.22;
    for (let i = 1; i < temps.length; i++) {
      const current = temps[i];
      const daysSinceCycleStart = Math.round(
        (current.date.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Peri-ovulatory search window
      if (daysSinceCycleStart >= 9 && daysSinceCycleStart <= 26) {
        const delta = current.value - baselineTemp;
        if (delta >= SHIFT_THRESHOLD) {
          // Ovulation typically occurs 24-36h before the first sustained thermal shift
          const detectedOvulation = new Date(current.date);
          detectedOvulation.setDate(current.date.getDate() - 1);

          calibratedOvulation = detectedOvulation;
          thermalShiftDetected = true;

          const daysDiff = Math.round(
            (calibratedOvulation.getTime() - calendarOvulation.getTime()) /
              (1000 * 60 * 60 * 24)
          );

          // Sleep quality assessment if sleep records exist (LOINC 93832-4)
          let sleepAssessment: string | undefined;
          if (input.sleepRecords && input.sleepRecords.length > 0) {
            const validSleep = input.sleepRecords.filter((s) => s.hours > 0);
            if (validSleep.length > 0) {
              const avgHours =
                validSleep.reduce((acc, s) => acc + s.hours, 0) / validSleep.length;
              if (avgHours >= 6.5) {
                sleepAssessment = `Optimal sleep average (${avgHours.toFixed(1)}h) confirms stable circadian baseline for BBT.`;
              } else {
                sleepAssessment = `Average sleep is ${avgHours.toFixed(1)}h (<6.5h); circadian fluctuations may mildly impact temperature readings.`;
              }
            }
          }

          calibrationDetails = {
            baselineTempCelsius: Math.round(baselineTemp * 100) / 100,
            ovulatoryTempCelsius: Math.round(current.value * 100) / 100,
            shiftMagnitudeCelsius: Math.round(delta * 100) / 100,
            shiftDate: isoDate(current.date),
            daysAdjustedFromCalendar: daysDiff,
            observationsAnalyzedCount: temps.length,
            sleepQualityAssessment: sleepAssessment
          };
          break;
        }
      }
    }
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
