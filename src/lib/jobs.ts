// Scheduled monitoring (run by /api/jobs/daily and /api/jobs/weekly).
//
// Daily  (suggested 02:00 GST): recompute cycles and their alerts, re-run the
//        temperature analysis, adherence reminders (P3, at most 2 a week, no
//        blame) and "results due for review" prompts for clinicians.
// Weekly (suggested Sunday 03:00 GST): personal 7-day vs 28-day baselines for
//        sleep, resting heart rate and HRV, and a short patient summary.
// End of cycle runs on demand: recording a new period recomputes everything.

import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { consentingUserIds } from "@/lib/consent";
import { dispatchCareNotification } from "@/lib/notifications";
import { analyseAndAlert } from "@/lib/observation-alerts";
import { refreshCycleSignals } from "@/lib/cycle-server";
import { addDays, dayKey, diffDays, toDate, type CycleAnalysis } from "@/lib/cycle";
import { rollingBaseline, type Baseline } from "@/lib/baselines";

const JOB_ACTOR = "system:jobs";
const DAY = 86_400_000;
const REMINDERS_PER_WEEK = 2;
const LAB_REVIEW_AFTER_DAYS = 182;

async function activePatients(now: Date) {
  const since = new Date(now.getTime() - 120 * DAY);
  return prisma.user.findMany({
    where: {
      role: "PATIENT",
      OR: [{ menstrualCycles: { some: {} } }, { dailyCycleLogs: { some: { logDate: { gte: since } } } }, { observations: { some: { effectiveAt: { gte: since } } } }]
    },
    select: { id: true, coupleId: true, patientProfile: { select: { sex: true, tryingToConceive: true, trackingMode: true } } }
  });
}

/** P3 adherence reminder text, or null. Pure so the rules can be tested. */
export function reminderFor(analysis: CycleAnalysis, temperatureDays: Set<string>, today: string, trackingMode: string | null): string | null {
  const p = analysis.prediction;
  if (p.paused || !analysis.open || p.cycleDay === null) return null;
  if (p.cycleDay >= 40 && p.cycleDay > p.expectedLength + 2) {
    return "Still tracking this cycle? Log your period when it starts, or pause tracking. Both are fine.";
  }
  if (trackingMode === "TRYING_TO_CONCEIVE" && p.windowStart && today >= p.windowStart && p.windowEnd && today <= addDays(p.windowEnd, 2)) {
    let missing = 0;
    for (let d = p.windowStart; d <= today; d = addDays(d, 1)) if (!temperatureDays.has(d)) missing++;
    if (missing > 3) return "Your fertile window may be now. A morning temperature on the next few days helps confirm ovulation.";
  }
  return null;
}

export interface DailyJobResult {
  processed: number;
  cycleRecomputed: number;
  reminders: number;
  labReviews: number;
  errors: number;
}

export async function runDailyJob(now = new Date()): Promise<DailyJobResult> {
  const today = dayKey(now);
  const users = await activePatients(now);
  const ids = users.map((u) => u.id);
  const [cycleOk, labsOk] = await Promise.all([consentingUserIds(ids, "CYCLE_TRACKING"), consentingUserIds(ids, "LAB_RESULTS")]);
  const result: DailyJobResult = { processed: 0, cycleRecomputed: 0, reminders: 0, labReviews: 0, errors: 0 };

  for (const u of users) {
    try {
      result.processed++;
      let analysis: CycleAnalysis | null = null;
      if (cycleOk.has(u.id) && u.patientProfile?.sex !== "male") {
        analysis = await refreshCycleSignals(u.id);
        result.cycleRecomputed++;
      }
      await analyseAndAlert(u.id, u.coupleId);

      // P3: gentle adherence reminder, at most twice a week and once a day.
      if (analysis) {
        const temps = await prisma.observation.findMany({ where: { userId: u.id, code: "8310-5", effectiveAt: { gte: toDate(addDays(today, -14)) } }, select: { effectiveAt: true } });
        const text = reminderFor(analysis, new Set(temps.map((t) => dayKey(t.effectiveAt))), today, u.patientProfile?.trackingMode ?? null);
        if (text) {
          const sent = await prisma.careNotification.findMany({ where: { userId: u.id, type: "CYCLE_REMINDER", createdAt: { gte: new Date(now.getTime() - 7 * DAY) } }, select: { createdAt: true } });
          if (sent.length < REMINDERS_PER_WEEK && !sent.some((s) => dayKey(s.createdAt) === today)) {
            await dispatchCareNotification({ targetUserId: u.id, targetRole: "PATIENT", actorId: JOB_ACTOR, type: "CYCLE_REMINDER", title: "ReproAI · Still tracking this cycle?", body: text, url: "/patient/cycle" });
            result.reminders++;
          }
        }
      }

      // Results due for review: trying to conceive and no reserve / semen result in 6 months.
      if (u.coupleId && u.patientProfile?.tryingToConceive && labsOk.has(u.id)) {
        const code = u.patientProfile.sex === "male" ? "SPERM_CONCENTRATION" : u.patientProfile.sex === "female" ? "AMH" : null;
        if (code) {
          const last = await prisma.labResult.findFirst({ where: { userId: u.id, code }, orderBy: { collectedAt: "desc" } });
          const stale = !last || diffDays(today, dayKey(last.collectedAt)) > LAB_REVIEW_AFTER_DAYS;
          const recent = await prisma.auditLog.findFirst({ where: { action: "lab_review_due", resource: `user:${u.id}`, createdAt: { gte: new Date(now.getTime() - 30 * DAY) } } });
          if (stale && !recent) {
            await dispatchCareNotification({ caseId: u.coupleId, targetRole: "CLINICIAN", actorId: JOB_ACTOR, type: "LAB_REVIEW_DUE", title: "ReproAI · Results may be due for review", body: "A patient trying to conceive has no recent reserve or semen result. Open the case to review.", url: `/clinician/patient/${u.coupleId}` });
            await audit(JOB_ACTOR, "lab_review_due", `user:${u.id}`);
            result.labReviews++;
          }
        }
      }
    } catch (err) {
      result.errors++;
      console.error("[jobs:daily] user failed", u.id, err);
    }
  }
  await audit(JOB_ACTOR, "job_daily_run", `processed:${result.processed}:reminders:${result.reminders}:lab_reviews:${result.labReviews}:errors:${result.errors}`);
  return result;
}

export const WEEKLY_CODES = { sleep: "93832-4", restingHeartRate: "40443-4", hrv: "80404-7" } as const;

export interface WeeklyJobResult {
  processed: number;
  summaries: number;
  deviations: number;
  errors: number;
}

/** Plain-language summary of the week, or null when there were no readings. */
export function weeklySummaryText(b: Record<keyof typeof WEEKLY_CODES, Baseline>): string | null {
  const parts: string[] = [];
  if (b.sleep.n7) parts.push(`sleep averaged ${b.sleep.mean7?.toFixed(1)} h over ${b.sleep.n7} nights${b.sleep.mean7 !== null && b.sleep.mean7 < 7 ? " (under the 7 h usually advised)" : ""}`);
  if (b.restingHeartRate.n7) parts.push(`resting heart rate ${Math.round(b.restingHeartRate.mean7 ?? 0)} bpm${b.restingHeartRate.deviation === "HIGH" ? ", higher than your usual" : ""}`);
  if (b.hrv.n7 && b.hrv.deviation === "LOW") parts.push("heart rate variability lower than your usual (rest and recovery may help)");
  return parts.length ? `This week: ${parts.join("; ")}. Patterns only, not a diagnosis.` : null;
}

export async function runWeeklyJob(now = new Date()): Promise<WeeklyJobResult> {
  const users = await activePatients(now);
  const wearables = await consentingUserIds(users.map((u) => u.id), "WEARABLES");
  const result: WeeklyJobResult = { processed: 0, summaries: 0, deviations: 0, errors: 0 };
  const since = new Date(now.getTime() - 36 * DAY);
  for (const u of users.filter((x) => wearables.has(x.id))) {
    try {
      result.processed++;
      const obs = await prisma.observation.findMany({ where: { userId: u.id, code: { in: Object.values(WEEKLY_CODES) }, effectiveAt: { gte: since } }, select: { code: true, value: true, effectiveAt: true } });
      const of = (code: string) => obs.filter((o) => o.code === code).map((o) => ({ date: o.effectiveAt, value: o.value }));
      const b = {
        sleep: rollingBaseline(WEEKLY_CODES.sleep, of(WEEKLY_CODES.sleep), now),
        restingHeartRate: rollingBaseline(WEEKLY_CODES.restingHeartRate, of(WEEKLY_CODES.restingHeartRate), now),
        hrv: rollingBaseline(WEEKLY_CODES.hrv, of(WEEKLY_CODES.hrv), now)
      };
      if (Object.values(b).some((x) => x.deviation)) result.deviations++;
      const text = weeklySummaryText(b);
      if (text) {
        await dispatchCareNotification({ targetUserId: u.id, targetRole: "PATIENT", actorId: JOB_ACTOR, type: "WEEKLY_SUMMARY", title: "ReproAI · Your week in health", body: text, url: "/patient/wearables" });
        result.summaries++;
      }
    } catch (err) {
      result.errors++;
      console.error("[jobs:weekly] user failed", u.id, err);
    }
  }
  await audit(JOB_ACTOR, "job_weekly_run", `processed:${result.processed}:summaries:${result.summaries}:errors:${result.errors}`);
  return result;
}
