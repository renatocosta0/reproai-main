/**
 * ReproAI demo accounts: `npm run demo:setup`
 *
 * Creates (or refreshes) three patient personas used by the one-click demo
 * login, plus prescriptions from the demo clinician:
 *   - Female individual  demo.female@reproai.dev   ovarian reserve, BBT with a clear rise
 *   - Male individual    demo.male@reproai.dev     semen analysis below WHO ref., irregular sleep
 *   - Paired couple      demo.couple@reproai.dev + demo.partner@reproai.dev
 *                        joint estimate, a monophasic BBT pattern and an open follow-up alert
 *
 * All assessments are requested from the live ML service (ML_API_URL), so the
 * numbers are real model output. Re-running replaces the demo personas' readings,
 * assessments and alerts; nothing else in the database is touched.
 * Demo accounts get random passwords: they are meant to be opened with the
 * demo buttons (DEMO_LOGIN_ENABLED="true").
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

// Load env like Next.js does: .env.local first, then .env (existing vars win).
// process.loadEnvFile is built into Node 20.12+.
for (const file of [".env.local", ".env"]) {
  try {
    (process as unknown as { loadEnvFile?: (path: string) => void }).loadEnvFile?.(file);
  } catch {
    /* file not present */
  }
}

const prisma = new PrismaClient();
const ML_API_URL = process.env.ML_API_URL ?? "http://localhost:8000";
const CLINICIAN_EMAIL = process.env.DEMO_CLINICIAN_EMAIL || "clinician@reproai.dev";

const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY + 12 * 3_600_000 - (Date.now() % DAY));

interface Intake {
  tryingToConceive: boolean;
  smoking: "NEVER" | "FORMER" | "CURRENT";
  historyFlags: string[];
  familyEarlyMenopause?: boolean;
}

interface Profile {
  name: string;
  sex: "female" | "male";
  age: number;
  bmi: number;
  amh?: number;
  spermCount?: number;
  antralFollicleCount?: number;
  pcosHistory?: boolean;
  infertilityDurationMonths?: number;
  priorCycles?: number;
  preservationIntent?: boolean;
  cycleRegularity?: string;
}

// ── ML service ───────────────────────────────────────────────────────────────
async function predict(input: Record<string, unknown>) {
  const res = await fetch(`${ML_API_URL}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!res.ok) throw new Error(`ML service ${res.status}: ${await res.text()}`);
  return (await res.json()) as {
    status: string;
    probability: number | null;
    confidence_low: number | null;
    confidence_high: number | null;
    factors: unknown[];
    model_version: string;
    evidence_status: string;
    completeness: number;
    missing_optional: string[];
    missing_required: string[];
    scope: string;
    tier: string | null;
    preservation_guidance: string | null;
    age_adjusted_percentile: number | null;
  };
}

interface Review {
  status: "RELEASED" | "DRAFT";
  clinicianId: string;
  note?: string;
}

async function savePrediction(userId: string, coupleId: string, scope: "INDIVIDUAL" | "COUPLE", input: Record<string, unknown>, at: Date, review: Review) {
  const r = await predict({ ...input, scope });
  if (r.status !== "ok" || r.probability === null) throw new Error(`Demo input incomplete: ${r.missing_required.join(", ")}`);
  // Provenance of each input, as the clinician assessment route records it.
  const labKeys = new Set(["amh", "antral_follicle_count", "sperm_count"]);
  const inputs = Object.fromEntries(
    Object.entries(input)
      .filter(([k, v]) => !["sex", "scope", "preservation_intent"].includes(k) && v !== null && v !== undefined)
      .map(([k, v]) => [k, { value: v, source: labKeys.has(k) ? "CLINICIAN_VERIFIED" : "SELF_REPORTED", ...(labKeys.has(k) ? { date: at.toISOString() } : {}) }])
  );
  await prisma.prediction.create({
    data: {
      userId,
      coupleId,
      scope,
      status: review.status,
      probability: r.probability,
      confidenceLow: r.confidence_low,
      confidenceHigh: r.confidence_high,
      tier: r.tier,
      preservationGuidance: r.preservation_guidance,
      factors: JSON.stringify(r.factors),
      modelVersion: r.model_version,
      completeness: r.completeness,
      percentile: r.age_adjusted_percentile,
      inputs: JSON.stringify(inputs),
      missingOptional: JSON.stringify(r.missing_optional),
      evidenceStatus: r.evidence_status,
      createdById: review.clinicianId,
      ...(review.status === "RELEASED"
        ? { reviewedById: review.clinicianId, reviewedAt: new Date(at.getTime() + 26 * 3_600_000), clinicianNote: review.note ?? null }
        : {}),
      createdAt: at
    }
  });
  return r;
}

async function labs(userId: string, clinicianId: string, rows: [string, number, string, number][]) {
  await prisma.labResult.createMany({
    data: rows.map(([code, value, unit, ago]) => ({ userId, code, value, unit, collectedAt: daysAgo(ago), source: "CLINICIAN_VERIFIED", enteredById: clinicianId }))
  });
}

// ── Readings ─────────────────────────────────────────────────────────────────
/** Deterministic small wobble so re-runs produce the same curves. */
const wobble = (i: number, amp: number) => Math.round(Math.sin(i * 2.3 + 1.1) * amp * 100) / 100;

function bbtSeries(days: number, shiftAtDay: number | null, rise: number) {
  return Array.from({ length: days }, (_, i) => {
    const base = 36.32 + wobble(i, 0.05);
    const value = shiftAtDay !== null && i >= shiftAtDay ? base + rise : base;
    return { code: "8310-5", unit: "Cel", value: Math.round(value * 100) / 100, effectiveAt: daysAgo(days - 1 - i) };
  });
}

function sleepSeries(nights: number, mean: number, spread: number) {
  return Array.from({ length: nights }, (_, i) => ({
    code: "93832-4",
    unit: "h",
    value: Math.max(3, Math.round((mean + wobble(i + 7, spread)) * 10) / 10),
    effectiveAt: daysAgo(nights - 1 - i)
  }));
}

/** Same rule as /api/observations/bulk: largest 3-day mean over the preceding 6-day mean. */
function maxShift(values: number[]): number {
  let best = 0;
  for (let i = 6; i < values.length - 2; i++) {
    const base = values.slice(i - 6, i).reduce((a, b) => a + b, 0) / 6;
    const post = values.slice(i, i + 3).reduce((a, b) => a + b, 0) / 3;
    best = Math.max(best, post - base);
  }
  return Number(best.toFixed(2));
}

// ── Accounts ─────────────────────────────────────────────────────────────────
async function upsertPatient(email: string, profile: Profile, coupleId: string, intake: Intake) {
  const password = await bcrypt.hash(randomBytes(24).toString("base64url"), 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: { coupleId, role: "PATIENT" },
    create: { email, password, role: "PATIENT", coupleId, consentAt: daysAgo(40) }
  });
  const data = {
    coupleId,
    name: profile.name,
    sex: profile.sex,
    age: profile.age,
    bmi: profile.bmi,
    // Lab values live in LabResult (clinician verified), not on the profile.
    amh: null,
    spermCount: null,
    antralFollicleCount: null,
    pcosHistory: profile.pcosHistory ?? false,
    tryingToConceive: intake.tryingToConceive,
    smoking: intake.smoking,
    historyFlags: JSON.stringify(intake.historyFlags),
    familyEarlyMenopause: intake.familyEarlyMenopause ?? null,
    intakeCompletedAt: daysAgo(38),
    infertilityDurationMonths: profile.infertilityDurationMonths ?? null,
    priorCycles: profile.priorCycles ?? null,
    preservationIntent: profile.preservationIntent ?? false,
    cycleRegularity: profile.cycleRegularity ?? null
  };
  await prisma.patient.upsert({ where: { userId: user.id }, update: data, create: { ...data, userId: user.id } });
  // Fresh demo history on every run.
  await prisma.observation.deleteMany({ where: { userId: user.id } });
  await prisma.prediction.deleteMany({ where: { userId: user.id } });
  await prisma.labResult.deleteMany({ where: { userId: user.id } });
  await prisma.consent.deleteMany({ where: { userId: user.id } });
  // Explicit consents: care purposes on, anonymous statistics on for the demo.
  await prisma.consent.createMany({
    data: ["CLINICIAN_ACCESS", "LAB_RESULTS", "WEARABLES", "PARTNER_SHARING", "POPULATION_ANALYTICS"].map((purpose) => ({
      userId: user.id,
      purpose,
      granted: true,
      grantedAt: daysAgo(40)
    }))
  });
  return user;
}

async function container(id: string) {
  await prisma.couple.upsert({ where: { id }, update: {}, create: { id } });
  await prisma.followUp.deleteMany({ where: { coupleId: id } });
  await prisma.prediction.deleteMany({ where: { coupleId: id } });
  return id;
}

async function prescription(coupleId: string, clinicianId: string, scope: "INDIVIDUAL" | "COUPLE", email: string, partnerEmail: string | null, p: Profile, notes: string) {
  await prisma.invitation.deleteMany({ where: { coupleId } });
  await prisma.invitation.create({
    data: {
      coupleId,
      scope,
      email,
      partnerEmail,
      sex: p.sex,
      name: p.name,
      token: `repro_demo_${randomBytes(18).toString("hex")}`,
      notes,
      invitedBy: clinicianId,
      status: "ACCEPTED",
      acceptedAt: daysAgo(40),
      createdAt: daysAgo(42)
    }
  });
}

async function main() {
  const health = await fetch(`${ML_API_URL}/health`).catch(() => null);
  if (!health?.ok) throw new Error(`ML service not reachable at ${ML_API_URL}. Start it first (see README).`);

  const clinician = await prisma.user.findUnique({ where: { email: CLINICIAN_EMAIL } });
  if (!clinician || clinician.role !== "CLINICIAN") {
    throw new Error(`Demo clinician ${CLINICIAN_EMAIL} not found. Run \`npm run prisma:seed\` or set DEMO_CLINICIAN_EMAIL.`);
  }

  // ── 1. Female individual ──────────────────────────────────────────────────
  const fProfile: Profile = {
    name: "Reem S.", sex: "female", age: 31, bmi: 22.8, amh: 2.4, antralFollicleCount: 15,
    pcosHistory: false, infertilityDurationMonths: 0, preservationIntent: true, cycleRegularity: "REGULAR"
  };
  const fCouple = await container("demo-female");
  const female = await upsertPatient("demo.female@reproai.dev", fProfile, fCouple, { tryingToConceive: false, smoking: "NEVER", historyFlags: [], familyEarlyMenopause: false });
  await labs(female.id, clinician.id, [["AMH", 2.7, "ng/mL", 400], ["AMH", 2.4, "ng/mL", 5], ["AFC", 15, "follicles", 5]]);
  await prescription(fCouple, clinician.id, "INDIVIDUAL", "demo.female@reproai.dev", null, fProfile, "Interested in elective oocyte vitrification. Track BBT for two cycles.");
  await prisma.observation.createMany({
    data: [...bbtSeries(26, 13, 0.36), ...sleepSeries(21, 7.3, 0.5)].map((o) => ({ ...o, userId: female.id, coupleId: fCouple }))
  });
  const fInput = { sex: "female", age: 31, bmi: 22.8, amh: 2.4, antral_follicle_count: 15, pcos_history: false, infertility_duration_months: 0, preservation_intent: true };
  await savePrediction(female.id, fCouple, "INDIVIDUAL", { ...fInput, amh: 2.7, age: 30, antral_follicle_count: null }, daysAgo(399), { status: "RELEASED", clinicianId: clinician.id, note: "Your first AMH result is in the expected range for your age. We will repeat it in about a year." });
  const fr = await savePrediction(female.id, fCouple, "INDIVIDUAL", fInput, daysAgo(4), { status: "RELEASED", clinicianId: clinician.id, note: "Your egg reserve is still in the typical range for your age, and stable since last year. If egg freezing is still on your mind, we can talk through timing at your next visit." });
  console.log(`  ✓ Female   demo.female@reproai.dev   ${fr.probability}% (${fr.tier})`);

  // ── 2. Male individual ────────────────────────────────────────────────────
  const mProfile: Profile = { name: "Khalid R.", sex: "male", age: 35, bmi: 28.4, spermCount: 11.5 };
  const mCouple = await container("demo-male");
  const male = await upsertPatient("demo.male@reproai.dev", mProfile, mCouple, { tryingToConceive: false, smoking: "CURRENT", historyFlags: [] });
  await labs(male.id, clinician.id, [
    ["SPERM_CONCENTRATION", 10.2, "million/mL", 95], ["SPERM_PROGRESSIVE_MOTILITY", 28, "%", 95], ["SPERM_MORPHOLOGY", 3, "%", 95],
    ["SPERM_CONCENTRATION", 11.5, "million/mL", 4], ["SPERM_PROGRESSIVE_MOTILITY", 31, "%", 4], ["SPERM_MORPHOLOGY", 4, "%", 4], ["SEMEN_VOLUME", 2.1, "mL", 4]
  ]);
  await prescription(mCouple, clinician.id, "INDIVIDUAL", "demo.male@reproai.dev", null, mProfile, "Semen analysis below WHO reference. Lifestyle review; repeat analysis in 3 months.");
  await prisma.observation.createMany({
    data: sleepSeries(21, 6.1, 1.3).map((o) => ({ ...o, userId: male.id, coupleId: mCouple }))
  });
  const mInput = { sex: "male", age: 35, bmi: 28.4, sperm_count: 11.5 };
  await savePrediction(male.id, mCouple, "INDIVIDUAL", { ...mInput, sperm_count: 10.2, bmi: 29.3 }, daysAgo(94), { status: "RELEASED", clinicianId: clinician.id, note: "Your sperm count is a little below the reference range. This is common and often improves. Let's repeat the test in three months." });
  const mr = await savePrediction(male.id, mCouple, "INDIVIDUAL", mInput, daysAgo(3), { status: "RELEASED", clinicianId: clinician.id, note: "A small improvement since your first test. Stopping smoking and reaching a healthier weight are the two changes most likely to help. I have referred you to the andrology clinic for a review." });
  console.log(`  ✓ Male     demo.male@reproai.dev     ${mr.probability}% (${mr.tier})`);

  // ── 3. Paired couple ──────────────────────────────────────────────────────
  const cfProfile: Profile = {
    name: "Nadia T.", sex: "female", age: 34, bmi: 24.6, amh: 1.3, antralFollicleCount: 9,
    pcosHistory: true, infertilityDurationMonths: 18, priorCycles: 1, cycleRegularity: "IRREGULAR"
  };
  const cmProfile: Profile = { name: "Yousef T.", sex: "male", age: 36, bmi: 26.2, spermCount: 18, infertilityDurationMonths: 18 };
  const cCouple = await container("demo-couple");
  const cf = await upsertPatient("demo.couple@reproai.dev", cfProfile, cCouple, { tryingToConceive: true, smoking: "NEVER", historyFlags: ["PCOS"], familyEarlyMenopause: false });
  const cm = await upsertPatient("demo.partner@reproai.dev", cmProfile, cCouple, { tryingToConceive: true, smoking: "FORMER", historyFlags: [] });
  await labs(cf.id, clinician.id, [["AMH", 1.5, "ng/mL", 200], ["AMH", 1.3, "ng/mL", 35], ["AFC", 9, "follicles", 35]]);
  await labs(cm.id, clinician.id, [["SPERM_CONCENTRATION", 18, "million/mL", 32], ["SPERM_PROGRESSIVE_MOTILITY", 35, "%", 32], ["SPERM_MORPHOLOGY", 5, "%", 32]]);
  await prescription(cCouple, clinician.id, "COUPLE", "demo.couple@reproai.dev", "demo.partner@reproai.dev", cfProfile, "18 months trying, one prior IUI. PCOS. Monitor ovulation before next cycle.");
  const cfTemps = bbtSeries(28, null, 0);
  await prisma.observation.createMany({
    data: [
      ...[...cfTemps, ...sleepSeries(21, 6.9, 0.7)].map((o) => ({ ...o, userId: cf.id, coupleId: cCouple })),
      ...sleepSeries(21, 6.6, 0.9).map((o) => ({ ...o, userId: cm.id, coupleId: cCouple }))
    ]
  });
  await savePrediction(cf.id, cCouple, "INDIVIDUAL", { sex: "female", age: 34, bmi: 24.6, amh: 1.3, antral_follicle_count: 9, pcos_history: true, infertility_duration_months: 18 }, daysAgo(30), { status: "RELEASED", clinicianId: clinician.id, note: "Your egg reserve is a little lower than last time but still within the range we work with. With PCOS and irregular cycles, confirming ovulation is the next step." });
  await savePrediction(cm.id, cCouple, "INDIVIDUAL", { sex: "male", age: 36, bmi: 26.2, sperm_count: 18 }, daysAgo(29), { status: "RELEASED", clinicianId: clinician.id, note: "Your semen analysis is within the reference range." });
  const coupleInput = { sex: "female", age: 34, bmi: 24.6, amh: 1.3, sperm_count: 18, pcos_history: true, infertility_duration_months: 18, prior_cycles: 1 };
  await savePrediction(cf.id, cCouple, "COUPLE", { ...coupleInput, infertility_duration_months: 15, prior_cycles: 0 }, daysAgo(75), { status: "RELEASED", clinicianId: clinician.id, note: "This is a starting point for planning together. We will review it after your IUI cycle." });
  // Latest joint assessment waits for clinician review (shows the sign-off step).
  const cr = await savePrediction(cf.id, cCouple, "COUPLE", coupleInput, daysAgo(1), { status: "DRAFT", clinicianId: clinician.id });
  const shift = maxShift(cfTemps.map((t) => t.value));
  await prisma.followUp.create({
    data: {
      coupleId: cCouple,
      status: "ALERT_RAISED",
      note: `Longitudinal BBT time-series: monophasic thermal curve across ${cfTemps.length} consecutive days (maximum thermal shift ${shift}°C; physiological target ≥ 0.30°C). Possible anovulatory cycle; review before the next treatment cycle.`,
      createdAt: daysAgo(1)
    }
  });
  console.log(`  ✓ Couple   demo.couple@reproai.dev + demo.partner@reproai.dev   joint ${cr.probability}% (draft awaiting review), alert open`);

  console.log("\nDemo personas ready. Enable the buttons with DEMO_LOGIN_ENABLED=\"true\".");
}

main()
  .catch((e) => {
    console.error("Demo setup failed:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
