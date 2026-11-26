// Longitudinal analysis of temperature and sleep readings, and the clinician-side
// follow-up alert it may raise. Shared by every ingestion path (single reading,
// manual bulk entry, device import) so they all behave the same. Escalations go
// only to the care team, never to the patient, and are worded "not a diagnosis".
//
// Levels (see assessWearableSignals in observation-analysis.ts):
//  - P1 opens or refreshes one wearable follow-up per case and notifies the
//    responsible clinicians (in-app CareNotification, no clinical details).
//  - P2 is advice only: it reaches the patient through the pathway options
//    (BBT-MONO, OPT-SLEEP) and never opens a follow-up.
//  - When the signal settles (a confirmed rise in the latest cycle), an open
//    wearable alert that no clinician has acted on yet is closed automatically,
//    with an audit record. Follow-ups opened by clinicians are never touched.

import { prisma } from "@/lib/db";
import { PAUSED_MODES } from "@/lib/cycle";
import { PASSIVE_CODES, assessWearableSignals, isSleep, isTemperature, type Point, type WearableAlertLevel } from "@/lib/observation-analysis";
import { belongsTo, syncSignalFollowUp, type SignalSource } from "@/lib/signal-follow-up";

export interface ObservationAnalytics {
  alertTriggered: boolean;
  analytics: {
    bbt_profile: "BIPHASIC_OVULATORY" | "MONOPHASIC_SUSPECTED_ANOVULATORY" | "INSUFFICIENT_DATA";
    thermal_shift_detected_celsius: number;
    mean_sleep_hours: number;
    sleep_disruption_flag: boolean;
    total_longitudinal_records: number;
    alert_level: WearableAlertLevel;
    bbt_basis: "CURRENT_CYCLE" | "LAST_COMPLETED_CYCLE" | null;
    consecutive_monophasic_cycles: number;
    excluded_fever_readings: number;
    alert_resolved: boolean;
  };
}

/** Marks follow-ups opened by this analysis (so clinician-opened ones are never overwritten). */
export const WEARABLE_ALERT_PREFIX = "[Wearable signal] ";
/** Notes written by earlier versions of this analysis. */
const LEGACY_PREFIXES = ["Temperature:", "Sleep:"];
const WINDOW = 120; // most recent readings per signal (about 3–4 cycles of daily readings)

export const WEARABLE_SOURCE: SignalSource = {
  prefix: WEARABLE_ALERT_PREFIX,
  legacyPrefixes: LEGACY_PREFIXES,
  notificationType: "WEARABLE_ALERT",
  title: "ReproAI · Wearable signal to review",
  body: "A patient's home readings meet a follow-up rule. Open the follow-up board to review.",
  actor: "system:wearable-analysis"
};

export function isWearableAlertNote(note: string | null | undefined): boolean {
  return belongsTo(WEARABLE_SOURCE, note);
}

/** Analyse one person's most recent readings and raise, refresh or resolve the case's wearable alert. */
export async function analyseAndAlert(userId: string, coupleId: string | null): Promise<ObservationAnalytics> {
  // Readings of this person only (a partner's readings are their own).
  const rows = (
    await prisma.observation.findMany({ where: { userId, code: { notIn: [...PASSIVE_CODES] } }, orderBy: { effectiveAt: "desc" }, take: WINDOW * 2 })
  ).reverse();
  const toPoint = (o: { effectiveAt: Date; value: number }): Point => ({ date: new Date(o.effectiveAt), value: o.value });
  const temps = rows.filter((o) => isTemperature(o.code)).slice(-WINDOW).map(toPoint);
  const sleep = rows.filter((o) => isSleep(o.code)).slice(-WINDOW).map(toPoint);

  // Recorded period starts are the most reliable cycle boundaries for the curve.
  const [cycles, profile] = await Promise.all([
    prisma.menstrualCycle.findMany({ where: { userId }, select: { startDate: true }, orderBy: { startDate: "asc" } }),
    prisma.patient.findUnique({ where: { userId }, select: { trackingMode: true } })
  ]);
  const signals = assessWearableSignals(temps, sleep, cycles.map((c) => c.startDate));
  // Hormonal contraception, postpartum and perimenopause: no anovulation alerts.
  const paused = Boolean(profile?.trackingMode && (PAUSED_MODES as string[]).includes(profile.trackingMode));
  const level = paused && signals.level === "P1" ? "P2" : signals.level;
  let resolved = false;

  if (coupleId) {
    const legacySleepOnly = (
      await prisma.followUp.findMany({ where: { coupleId, status: "ALERT_RAISED" }, orderBy: { createdAt: "desc" } })
    ).find((f) => isWearableAlertNote(f.note))?.note?.startsWith("Sleep:") ?? false;
    const result = await syncSignalFollowUp({
      source: WEARABLE_SOURCE,
      coupleId,
      userId,
      reason: level === "P1" ? signals.clinicianReason : null,
      settled: signals.temperatureResolved || paused || (legacySleepOnly && signals.sleepSettled),
      settledWhy: signals.temperatureResolved
        ? "a confirmed temperature rise (Roetzer 3-over-6) in the latest cycle"
        : paused
          ? "cycle tracking is paused (contraception, postpartum or perimenopause)"
          : "sleep is now handled as advice, not a follow-up"
    });
    resolved = result.resolved;
  }

  const { bbt } = signals;
  return {
    alertTriggered: level === "P1",
    analytics: {
      bbt_profile: bbt.status === "BIPHASIC" ? "BIPHASIC_OVULATORY" : bbt.status === "MONOPHASIC" ? "MONOPHASIC_SUSPECTED_ANOVULATORY" : "INSUFFICIENT_DATA",
      thermal_shift_detected_celsius: bbt.shift,
      mean_sleep_hours: signals.sleep?.recentMean !== null && signals.sleep?.recentMean !== undefined ? Number(signals.sleep.recentMean.toFixed(1)) : 0,
      sleep_disruption_flag: signals.sleep?.disrupted ?? false,
      total_longitudinal_records: rows.length,
      alert_level: level,
      bbt_basis: bbt.basis,
      consecutive_monophasic_cycles: bbt.consecutiveMonophasicCycles,
      excluded_fever_readings: bbt.excludedFever,
      alert_resolved: resolved
    }
  };
}
