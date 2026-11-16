// Longitudinal analysis of temperature and sleep readings, and the clinician-side
// follow-up alert it may raise. Shared by every ingestion path (manual bulk entry,
// device import) so they all behave the same. Alerts go only to the care team,
// never to the patient, and are worded "not a diagnosis".

import { prisma } from "@/lib/db";
import { isSleep, isTemperature } from "@/lib/observation-analysis";

export interface ObservationAnalytics {
  alertTriggered: boolean;
  analytics: {
    bbt_profile: "BIPHASIC_OVULATORY" | "MONOPHASIC_SUSPECTED_ANOVULATORY" | "INSUFFICIENT_DATA";
    thermal_shift_detected_celsius: number;
    mean_sleep_hours: number;
    sleep_disruption_flag: boolean;
    total_longitudinal_records: number;
  };
}

const WINDOW = 60; // most recent readings per signal

/** Analyse one person's most recent readings and raise or refresh the case's follow-up alert. */
export async function analyseAndAlert(userId: string, coupleId: string | null): Promise<ObservationAnalytics> {
  // Most recent readings for this person only (a partner's readings are their own),
  // newest first from the database, then put back in time order.
  const recent = (
    await prisma.observation.findMany({ where: { userId }, orderBy: { effectiveAt: "desc" }, take: WINDOW * 2 })
  ).reverse();

  let alertReason: string | null = null;
  let bbtProfile: ObservationAnalytics["analytics"]["bbt_profile"] = "INSUFFICIENT_DATA";
  let thermalShiftDelta = 0;
  let meanSleepDuration = 0;
  let sleepDisruptionDetected = false;

  // 1. Basal body temperature: 6-reading baseline vs the next 3 readings.
  const bbt = recent.filter((o) => isTemperature(o.code)).slice(-WINDOW).map((o) => o.value);
  if (bbt.length >= 10) {
    let maxShift = 0;
    for (let i = 6; i < bbt.length - 2; i++) {
      const baseline = bbt.slice(i - 6, i).reduce((a, b) => a + b, 0) / 6;
      const post = bbt.slice(i, i + 3).reduce((a, b) => a + b, 0) / 3;
      maxShift = Math.max(maxShift, post - baseline);
    }
    thermalShiftDelta = Number(maxShift.toFixed(2));
    if (maxShift >= 0.28) {
      bbtProfile = "BIPHASIC_OVULATORY";
    } else {
      bbtProfile = "MONOPHASIC_SUSPECTED_ANOVULATORY";
      alertReason = `Temperature: no sustained rise across ${bbt.length} readings (largest shift ${thermalShiftDelta} °C; a typical post-ovulation rise is about 0.3 °C). Not a diagnosis: BBT varies between cycles; consider ovulation confirmation (e.g. mid-luteal progesterone).`;
    }
  }

  // 2. Sleep: low average or very irregular nights.
  const sleep = recent.filter((o) => isSleep(o.code)).slice(-WINDOW).map((o) => o.value);
  if (sleep.length >= 3) {
    meanSleepDuration = Number((sleep.reduce((a, b) => a + b, 0) / sleep.length).toFixed(1));
    const sd = Math.sqrt(sleep.reduce((s, v) => s + (v - meanSleepDuration) ** 2, 0) / sleep.length);
    if (meanSleepDuration < 5.0 || sd > 2.8) {
      sleepDisruptionDetected = true;
      const note = `Sleep: mean ${meanSleepDuration} h per night (variability ${sd.toFixed(1)} h) over ${sleep.length} nights. Worth discussing; thresholds are team choices, not guideline values.`;
      alertReason = alertReason ? `${alertReason} | ${note}` : note;
    }
  }

  // 3. Clinician-side follow-up: one open alert per case, refreshed with the latest reason.
  if (coupleId && alertReason) {
    const existing = await prisma.followUp.findFirst({ where: { coupleId, status: "ALERT_RAISED" } });
    if (existing) {
      await prisma.followUp.update({ where: { id: existing.id }, data: { note: alertReason } });
    } else {
      await prisma.followUp.create({ data: { coupleId, status: "ALERT_RAISED", note: alertReason } });
    }
  }

  return {
    alertTriggered: Boolean(alertReason),
    analytics: {
      bbt_profile: bbtProfile,
      thermal_shift_detected_celsius: thermalShiftDelta,
      mean_sleep_hours: meanSleepDuration,
      sleep_disruption_flag: sleepDisruptionDetected,
      total_longitudinal_records: recent.length
    }
  };
}
