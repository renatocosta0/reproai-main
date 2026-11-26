// Server side of cycle tracking: daily logs, period starts, derived cycle
// fields and the clinician-side cycle alert. Pure rules live in src/lib/cycle.ts.

import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { hasConsent } from "@/lib/consent";
import { analyseAndAlert } from "@/lib/observation-alerts";
import { syncSignalFollowUp, type SignalSource } from "@/lib/signal-follow-up";
import {
  CONFOUNDERS,
  FLOWS,
  LH_TESTS,
  MOODS,
  MUCUS,
  SYMPTOMS,
  TRACKING_MODES,
  addDays,
  analyseCycles,
  dayKey,
  diffDays,
  toDate,
  type CycleAnalysis,
  type DayLog
} from "@/lib/cycle";
import type { Point } from "@/lib/observation-analysis";

export const CYCLE_SOURCE: SignalSource = {
  prefix: "[Cycle signal] ",
  notificationType: "CYCLE_ALERT",
  title: "ReproAI · Cycle pattern to review",
  body: "A patient's cycle log meets a follow-up rule. Open the follow-up board to review.",
  actor: "system:cycle-analysis"
};

const HISTORY_DAYS = 400;

function parseList(v: string | null | undefined): string[] {
  if (!v) return [];
  try {
    const x = JSON.parse(v);
    return Array.isArray(x) ? x.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

type LogRow = Awaited<ReturnType<typeof prisma.dailyCycleLog.findMany>>[number];

export function toDayLog(r: LogRow): DayLog {
  return {
    date: dayKey(r.logDate),
    flow: (r.bleedingFlow as DayLog["flow"]) ?? null,
    mucus: (r.cervicalMucus as DayLog["mucus"]) ?? null,
    lh: (r.ovulationTest as DayLog["lh"]) ?? null,
    bbt: r.basalTempCelsius,
    confounder: (r.tempConfounder as DayLog["confounder"]) ?? null,
    sleepMinutes: r.sleepMinutes,
    waterMl: r.waterIntakeMl,
    symptoms: parseList(r.symptoms),
    mood: parseList(r.mood)
  };
}

export interface CycleRecord {
  analysis: CycleAnalysis;
  logs: (DayLog & { notes?: string | null })[];
  cycleIds: { id: string; startDate: string }[];
  trackingMode: string | null;
  temperatures: { date: string; value: number }[];
  sleep: { date: string; hours: number }[];
  today: string;
}

/** Everything the cycle screens need. viewer CLINICIAN never receives notes or the intimacy log. */
export async function loadCycleRecord(userId: string, viewer: "PATIENT" | "CLINICIAN", today = dayKey(new Date())): Promise<CycleRecord> {
  const since = toDate(addDays(today, -HISTORY_DAYS));
  const wearablesAllowed = await hasConsent(userId, "WEARABLES");
  const [cycles, rows, obs, sleepObs, profile] = await Promise.all([
    prisma.menstrualCycle.findMany({ where: { userId }, orderBy: { startDate: "asc" } }),
    prisma.dailyCycleLog.findMany({ where: { userId, logDate: { gte: since } }, orderBy: { logDate: "asc" } }),
    wearablesAllowed
      ? prisma.observation.findMany({ where: { userId, code: "8310-5", effectiveAt: { gte: since } }, orderBy: { effectiveAt: "asc" } })
      : Promise.resolve([]),
    wearablesAllowed
      ? prisma.observation.findMany({ where: { userId, code: "93832-4", effectiveAt: { gte: since } }, orderBy: { effectiveAt: "asc" } })
      : Promise.resolve([]),
    prisma.patient.findUnique({ where: { userId } })
  ]);
  const logs = rows.map(toDayLog);
  const temps: Point[] = obs.map((o) => ({ date: o.effectiveAt, value: o.value }));
  const analysis = analyseCycles({
    cycles: cycles.map((c) => ({ id: c.id, startDate: dayKey(c.startDate) })),
    logs,
    temps,
    today,
    age: profile?.age ?? null,
    trackingMode: profile?.trackingMode ?? null,
    pcos: profile?.pcosHistory ?? null
  });
  return {
    analysis,
    logs: rows.map((r, i) => ({
      ...logs[i],
      ...(viewer === "PATIENT" ? { notes: r.notes ?? null } : {})
    })),
    cycleIds: cycles.map((c) => ({ id: c.id, startDate: dayKey(c.startDate) })),
    trackingMode: profile?.trackingMode ?? null,
    temperatures: temps.map((t) => ({ date: dayKey(t.date), value: t.value })),
    sleep: sleepObs.map((o) => ({ date: dayKey(o.effectiveAt), hours: o.value })),
    today
  };
}

/** Write the derived fields back to each cycle row and attach logs to their cycle. */
export async function persistDerived(userId: string, analysis: CycleAnalysis): Promise<void> {
  const rows = await prisma.menstrualCycle.findMany({ where: { userId }, orderBy: { startDate: "asc" } });
  for (const row of rows) {
    const s = analysis.cycles.find((c) => c.startDate === dayKey(row.startDate));
    if (!s) continue;
    await prisma.menstrualCycle.update({
      where: { id: row.id },
      data: {
        endDate: s.nextStartDate ? toDate(addDays(s.nextStartDate, -1)) : null,
        cycleLengthDays: s.lengthDays,
        periodLengthDays: s.periodDays,
        ovulationDate: s.ovulation.date ? toDate(s.ovulation.date) : null,
        ovulationMethod: s.ovulation.method,
        lutealPhaseDays: s.lutealDays,
        regularityStatus: s.regularity,
        status: s.status
      }
    });
    await prisma.dailyCycleLog.updateMany({
      where: { userId, logDate: { gte: toDate(s.startDate), ...(s.nextStartDate ? { lt: toDate(s.nextStartDate) } : {}) } },
      data: { cycleId: row.id }
    });
  }
}

/** Recompute cycles and raise, refresh or resolve the clinician-side cycle alert. */
export async function refreshCycleSignals(userId: string): Promise<CycleAnalysis> {
  const record = await loadCycleRecord(userId, "CLINICIAN");
  await persistDerived(userId, record.analysis);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { coupleId: true } });
  if (user?.coupleId) {
    const reasons = record.analysis.escalations;
    await syncSignalFollowUp({
      source: CYCLE_SOURCE,
      coupleId: user.coupleId,
      userId,
      reason: reasons.length ? `${reasons.join(" | ")} Not a diagnosis; review cycle history and consider targeted tests (e.g. TSH, prolactin, mid-luteal progesterone).` : null,
      settled: reasons.length === 0,
      settledWhy: record.analysis.prediction.paused ? "cycle tracking is paused" : "the latest cycles no longer meet a follow-up rule"
    });
  }
  return record.analysis;
}

// ── Writes ────────────────────────────────────────────────────────────────────

export interface DayLogInput {
  date: string;
  bleedingFlow?: string | null;
  cervicalMucus?: string | null;
  ovulationTest?: string | null;
  basalTempCelsius?: number | null;
  tempConfounder?: string | null;
  sleepMinutes?: number | null;
  waterIntakeMl?: number | null;
  symptoms?: string[];
  mood?: string[];
  notes?: string | null;
}

const oneOf = (list: readonly string[], v: unknown) => (v === null || v === undefined || v === "" ? null : typeof v === "string" && list.includes(v) ? v : undefined);

/** Validate a day log. Returns an error message or the cleaned values. */
export function validateDayLog(body: any, today = dayKey(new Date())): { ok: true; value: DayLogInput } | { ok: false; error: string } {
  const date = typeof body?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : null;
  if (!date || Number.isNaN(toDate(date).getTime())) return { ok: false, error: "Choose a valid day." };
  if (date > addDays(today, 1)) return { ok: false, error: "The day can't be in the future." };
  if (diffDays(today, date) > HISTORY_DAYS) return { ok: false, error: `Logs can go back at most ${HISTORY_DAYS} days.` };
  const checks: [string, readonly string[]][] = [["bleedingFlow", FLOWS], ["cervicalMucus", MUCUS], ["ovulationTest", LH_TESTS], ["tempConfounder", CONFOUNDERS]];
  const value: DayLogInput = { date };
  for (const [k, list] of checks) {
    if (!(k in (body ?? {}))) continue;
    const v = oneOf(list, body[k]);
    if (v === undefined) return { ok: false, error: `Unknown value for ${k}.` };
    (value as any)[k] = v;
  }
  const num = (k: "basalTempCelsius" | "sleepMinutes" | "waterIntakeMl", min: number, max: number, label: string) => {
    if (!(k in (body ?? {}))) return null;
    const v = body[k];
    if (v === null || v === "") { (value as any)[k] = null; return null; }
    if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max) return `${label} must be between ${min} and ${max}.`;
    (value as any)[k] = k === "basalTempCelsius" ? Math.round(v * 100) / 100 : Math.round(v);
    return null;
  };
  const e = num("basalTempCelsius", 34, 40, "Temperature (°C)") ?? num("sleepMinutes", 0, 960, "Sleep (minutes)") ?? num("waterIntakeMl", 0, 8000, "Water (ml)");
  if (e) return { ok: false, error: e };
  for (const [k, list] of [["symptoms", SYMPTOMS], ["mood", MOODS]] as const) {
    if (!(k in (body ?? {}))) continue;
    const arr = body[k];
    if (!Array.isArray(arr) || arr.some((x: unknown) => typeof x !== "string" || !(list as readonly string[]).includes(x))) return { ok: false, error: `Unknown ${k}.` };
    value[k] = Array.from(new Set(arr as string[]));
  }
  if ("notes" in (body ?? {})) {
    if (body.notes !== null && typeof body.notes !== "string") return { ok: false, error: "Notes must be text." };
    value.notes = body.notes ? String(body.notes).slice(0, 1000) : null;
  }
  return { ok: true, value };
}

const BLEEDING = new Set(["LIGHT", "MEDIUM", "HEAVY"]);

/**
 * Save one day. Flow on a day with no bleeding on the two days before, and no
 * cycle started in the last 10 days, starts a new cycle. Temperature and sleep
 * are mirrored to Observations (with WEARABLES consent) so every chart and the
 * temperature alerts use one series.
 */
export async function saveDayLog(userId: string, input: DayLogInput, source = "MANUAL"): Promise<{ startedCycle: boolean }> {
  const logDate = toDate(input.date);
  const data: Record<string, unknown> = {};
  const map: [keyof DayLogInput, string][] = [
    ["bleedingFlow", "bleedingFlow"], ["cervicalMucus", "cervicalMucus"], ["ovulationTest", "ovulationTest"], ["basalTempCelsius", "basalTempCelsius"],
    ["tempConfounder", "tempConfounder"], ["sleepMinutes", "sleepMinutes"], ["waterIntakeMl", "waterIntakeMl"], ["notes", "notes"]
  ];
  for (const [k, col] of map) if (input[k] !== undefined) data[col] = input[k];
  if (input.symptoms !== undefined) data.symptoms = JSON.stringify(input.symptoms);
  if (input.mood !== undefined) data.mood = JSON.stringify(input.mood);

  await prisma.dailyCycleLog.upsert({
    where: { userId_logDate: { userId, logDate } },
    create: { userId, logDate, source, ...data },
    update: data
  });

  // Mirror temperature and sleep to the shared observation series.
  if ((input.basalTempCelsius !== undefined || input.sleepMinutes !== undefined) && (await hasConsent(userId, "WEARABLES"))) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { coupleId: true } });
    const base = { userId, coupleId: user?.coupleId ?? null, source: "MANUAL" as const };
    if (typeof input.basalTempCelsius === "number") {
      await prisma.observation.upsert({
        where: { userId_source_externalId: { userId, source: "MANUAL", externalId: `cycle-log:${input.date}` } },
        create: { ...base, code: "8310-5", value: input.basalTempCelsius, unit: "Cel", effectiveAt: new Date(`${input.date}T07:00:00.000Z`), externalId: `cycle-log:${input.date}`, device: "Cycle log" },
        update: { value: input.basalTempCelsius }
      });
    }
    if (typeof input.sleepMinutes === "number" && input.sleepMinutes > 0) {
      await prisma.observation.upsert({
        where: { userId_source_externalId: { userId, source: "MANUAL", externalId: `sleep-log:${input.date}` } },
        create: { ...base, code: "93832-4", value: Math.round((input.sleepMinutes / 60) * 100) / 100, unit: "h", effectiveAt: new Date(`${input.date}T07:00:00.000Z`), externalId: `sleep-log:${input.date}`, device: "Cycle log" },
        update: { value: Math.round((input.sleepMinutes / 60) * 100) / 100 }
      });
    }
  }

  let startedCycle = false;
  if (input.bleedingFlow && BLEEDING.has(input.bleedingFlow)) {
    const [recentCycle, before] = await Promise.all([
      prisma.menstrualCycle.findFirst({ where: { userId, startDate: { gte: toDate(addDays(input.date, -10)), lte: logDate } } }),
      prisma.dailyCycleLog.findMany({ where: { userId, logDate: { gte: toDate(addDays(input.date, -2)), lt: logDate } } })
    ]);
    const bledBefore = before.some((b) => b.bleedingFlow && BLEEDING.has(b.bleedingFlow));
    if (!recentCycle && !bledBefore) {
      await prisma.menstrualCycle.upsert({
        where: { userId_startDate: { userId, startDate: logDate } },
        create: { userId, startDate: logDate, source },
        update: {}
      });
      startedCycle = true;
    }
  }
  await audit(userId, "cycle_log_saved", `user:${userId}:day:${input.date}${startedCycle ? ":cycle_started" : ""}`);
  return { startedCycle };
}

/** Record (or back-fill) the first day of a period. */
export async function startPeriod(userId: string, date: string): Promise<void> {
  const startDate = toDate(date);
  await prisma.menstrualCycle.upsert({ where: { userId_startDate: { userId, startDate } }, create: { userId, startDate }, update: {} });
  const existing = await prisma.dailyCycleLog.findUnique({ where: { userId_logDate: { userId, logDate: startDate } } });
  if (!existing?.bleedingFlow || !BLEEDING.has(existing.bleedingFlow)) {
    await prisma.dailyCycleLog.upsert({
      where: { userId_logDate: { userId, logDate: startDate } },
      create: { userId, logDate: startDate, bleedingFlow: "MEDIUM" },
      update: { bleedingFlow: "MEDIUM" }
    });
  }
  await audit(userId, "cycle_period_recorded", `user:${userId}:day:${date}`);
}

/** Remove a period start recorded by mistake. Logs are kept. */
export async function removePeriod(userId: string, cycleId: string): Promise<boolean> {
  const row = await prisma.menstrualCycle.findFirst({ where: { id: cycleId, userId } });
  if (!row) return false;
  await prisma.dailyCycleLog.updateMany({ where: { cycleId }, data: { cycleId: null } });
  await prisma.menstrualCycle.delete({ where: { id: cycleId } });
  await audit(userId, "cycle_period_removed", `user:${userId}:cycle:${cycleId}`);
  return true;
}

export async function setTrackingMode(userId: string, mode: string | null): Promise<void> {
  if (mode !== null && !(TRACKING_MODES as readonly string[]).includes(mode)) throw new Error("Unknown tracking mode.");
  await prisma.patient.upsert({ where: { userId }, create: { userId, trackingMode: mode }, update: { trackingMode: mode } });
  await audit(userId, "cycle_tracking_mode_set", `user:${userId}:${mode ?? "NONE"}`);
}

/** After any cycle write: derived fields, cycle alert, and the temperature alert (period starts change its cycle boundaries). */
export async function afterCycleWrite(userId: string): Promise<CycleAnalysis> {
  const analysis = await refreshCycleSignals(userId);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { coupleId: true } });
  await analyseAndAlert(userId, user?.coupleId ?? null);
  return analysis;
}
