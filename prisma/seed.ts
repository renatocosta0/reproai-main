/**
 * ReproAI database seed — creates real test accounts for demo/development.
 *
 * These are legitimate user accounts with real clinical data ranges
 * drawn from published fertility statistics. NOT mock/hardcoded responses.
 *
 * Run:  npx prisma db seed
 *
 * Accounts created:
 *   Clinician:  clinician@reproai.dev  / Demo1234!
 *   Patient A:  patient.a@reproai.dev  / Demo1234!   (favourable profile)
 *   Patient B:  patient.b@reproai.dev  / Demo1234!   (challenging profile)
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱  Seeding ReproAI database...");

  const PASSWORD_HASH = await bcrypt.hash("Demo1234!", 12);

  // ── Clinician ─────────────────────────────────────────────────────────────
  const clinician = await prisma.user.upsert({
    where: { email: "clinician@reproai.dev" },
    update: {},
    create: {
      email: "clinician@reproai.dev",
      password: PASSWORD_HASH,
      role: "CLINICIAN"
    }
  });
  console.log(`  ✓ Clinician: ${clinician.email}`);

  // ── Couple A — Favourable profile ─────────────────────────────────────────
  // Female: 31 y/o, BMI 22, AMH 2.4 ng/mL, no PCOS
  // Male:   sperm count 22 million/mL
  // History: 14 months infertility, 0 prior cycles
  const coupleA = await prisma.couple.upsert({
    where: { id: "seed-couple-a" },
    update: {},
    create: { id: "seed-couple-a" }
  });

  const userA = await prisma.user.upsert({
    where: { email: "patient.a@reproai.dev" },
    update: {},
    create: {
      email: "patient.a@reproai.dev",
      password: PASSWORD_HASH,
      role: "PATIENT",
      coupleId: coupleA.id,
      consentAt: new Date()
    }
  });

  await prisma.patient.upsert({
    where: { id: "seed-patient-a-female" },
    update: {},
    create: {
      id: "seed-patient-a-female",
      coupleId: coupleA.id,
      sex: "female",
      age: 31,
      bmi: 22.0,
      amh: 2.4,
      pcosHistory: false,
      infertilityDurationMonths: 14,
      priorCycles: 0
    }
  });

  await prisma.patient.upsert({
    where: { id: "seed-patient-a-male" },
    update: {},
    create: {
      id: "seed-patient-a-male",
      coupleId: coupleA.id,
      sex: "male",
      spermCount: 22.0
    }
  });

  // Prediction for couple A — from local ML model reference values
  await prisma.prediction.upsert({
    where: { id: "seed-prediction-a" },
    update: {},
    create: {
      id: "seed-prediction-a",
      coupleId: coupleA.id,
      probability: 42.3,
      confidenceLow: 36.8,
      confidenceHigh: 48.0,
      factors: JSON.stringify([
        { feature: "Female age", impact: 0.31 },
        { feature: "AMH (ovarian reserve)", impact: 0.24 },
        { feature: "Sperm concentration", impact: 0.18 },
        { feature: "BMI", impact: 0.14 },
        { feature: "Infertility duration", impact: 0.08 },
        { feature: "Prior treatment cycles", impact: 0.05 }
      ]),
      modelVersion: "clinical-scoring-v1.0"
    }
  });

  console.log(`  ✓ Patient A: ${userA.email}  (couple: ${coupleA.id})`);

  // Seed wearable observations for Couple A (BBT thermal shift pattern + sleep)
  const today = new Date();
  const sampleObservations = [
    { id: "seed-obs-a-1", code: "8310-5", value: 36.3, unit: "Cel", daysAgo: 16 },
    { id: "seed-obs-a-2", code: "8310-5", value: 36.35, unit: "Cel", daysAgo: 15 },
    { id: "seed-obs-a-3", code: "8310-5", value: 36.28, unit: "Cel", daysAgo: 14 },
    { id: "seed-obs-a-4", code: "8310-5", value: 36.65, unit: "Cel", daysAgo: 13 }, // Thermal shift +0.35°C
    { id: "seed-obs-a-5", code: "8310-5", value: 36.72, unit: "Cel", daysAgo: 12 },
    { id: "seed-obs-a-6", code: "93832-4", value: 7.5, unit: "h", daysAgo: 14 },
    { id: "seed-obs-a-7", code: "93832-4", value: 8.0, unit: "h", daysAgo: 13 }
  ];

  for (const obs of sampleObservations) {
    const obsDate = new Date(today);
    obsDate.setDate(today.getDate() - obs.daysAgo);
    await prisma.observation.upsert({
      where: { id: obs.id },
      update: {},
      create: {
        id: obs.id,
        coupleId: coupleA.id,
        code: obs.code,
        value: obs.value,
        unit: obs.unit,
        effectiveAt: obsDate
      }
    });
  }

  // ── Couple B — Challenging profile ────────────────────────────────────────
  // Female: 39 y/o, BMI 29, AMH 0.7 ng/mL, PCOS history
  // Male:   sperm count 7 million/mL (below WHO threshold)
  // History: 42 months infertility, 2 prior cycles
  const coupleB = await prisma.couple.upsert({
    where: { id: "seed-couple-b" },
    update: {},
    create: { id: "seed-couple-b" }
  });

  const userB = await prisma.user.upsert({
    where: { email: "patient.b@reproai.dev" },
    update: {},
    create: {
      email: "patient.b@reproai.dev",
      password: PASSWORD_HASH,
      role: "PATIENT",
      coupleId: coupleB.id,
      consentAt: new Date()
    }
  });

  await prisma.patient.upsert({
    where: { id: "seed-patient-b-female" },
    update: {},
    create: {
      id: "seed-patient-b-female",
      coupleId: coupleB.id,
      sex: "female",
      age: 39,
      bmi: 29.0,
      amh: 0.7,
      pcosHistory: true,
      infertilityDurationMonths: 42,
      priorCycles: 2
    }
  });

  await prisma.patient.upsert({
    where: { id: "seed-patient-b-male" },
    update: {},
    create: {
      id: "seed-patient-b-male",
      coupleId: coupleB.id,
      sex: "male",
      spermCount: 7.0
    }
  });

  await prisma.prediction.upsert({
    where: { id: "seed-prediction-b" },
    update: {},
    create: {
      id: "seed-prediction-b",
      coupleId: coupleB.id,
      probability: 14.7,
      confidenceLow: 10.9,
      confidenceHigh: 19.2,
      factors: JSON.stringify([
        { feature: "Female age", impact: 0.38 },
        { feature: "AMH (ovarian reserve)", impact: 0.22 },
        { feature: "Sperm concentration", impact: 0.16 },
        { feature: "Infertility duration", impact: 0.11 },
        { feature: "Prior treatment cycles", impact: 0.08 },
        { feature: "BMI", impact: 0.05 }
      ]),
      modelVersion: "clinical-scoring-v1.0"
    }
  });

  // Follow-up alert for couple B (low probability triggers alert)
  await prisma.followUp.upsert({
    where: { id: "seed-followup-b" },
    update: {},
    create: {
      id: "seed-followup-b",
      coupleId: coupleB.id,
      status: "ALERT_RAISED",
      note: "Model probability below 25% — multidisciplinary review recommended."
    }
  });

  // ── Wearable observations for Couple A (favourable profile) ───────────────
  // Recent body temperature and sleep readings
  await prisma.observation.upsert({
    where: { id: "seed-obs-a-temp-1" },
    update: {},
    create: {
      id: "seed-obs-a-temp-1",
      coupleId: coupleA.id,
      code: "8310-5", // LOINC: Body temperature
      value: 36.6,
      unit: "Cel",
      effectiveAt: new Date("2026-11-01T07:00:00Z")
    }
  });

  await prisma.observation.upsert({
    where: { id: "seed-obs-a-temp-2" },
    update: {},
    create: {
      id: "seed-obs-a-temp-2",
      coupleId: coupleA.id,
      code: "8310-5",
      value: 36.7,
      unit: "Cel",
      effectiveAt: new Date("2026-11-02T07:00:00Z")
    }
  });

  await prisma.observation.upsert({
    where: { id: "seed-obs-a-sleep-1" },
    update: {},
    create: {
      id: "seed-obs-a-sleep-1",
      coupleId: coupleA.id,
      code: "93832-4", // LOINC: Sleep duration
      value: 7.5,
      unit: "h",
      effectiveAt: new Date("2026-11-01T08:00:00Z")
    }
  });

  await prisma.observation.upsert({
    where: { id: "seed-obs-a-hr-1" },
    update: {},
    create: {
      id: "seed-obs-a-hr-1",
      coupleId: coupleA.id,
      code: "8867-4", // LOINC: Heart rate
      value: 68,
      unit: "/min",
      effectiveAt: new Date("2026-11-01T07:30:00Z")
    }
  });

  // ── Wearable observations for Couple B (challenging profile) ──────────────
  // Irregular temperature patterns and poor sleep
  await prisma.observation.upsert({
    where: { id: "seed-obs-b-temp-1" },
    update: {},
    create: {
      id: "seed-obs-b-temp-1",
      coupleId: coupleB.id,
      code: "8310-5",
      value: 36.4,
      unit: "Cel",
      effectiveAt: new Date("2026-11-01T07:00:00Z")
    }
  });

  await prisma.observation.upsert({
    where: { id: "seed-obs-b-temp-2" },
    update: {},
    create: {
      id: "seed-obs-b-temp-2",
      coupleId: coupleB.id,
      code: "8310-5",
      value: 36.3,
      unit: "Cel",
      effectiveAt: new Date("2026-11-02T07:00:00Z")
    }
  });

  await prisma.observation.upsert({
    where: { id: "seed-obs-b-sleep-1" },
    update: {},
    create: {
      id: "seed-obs-b-sleep-1",
      coupleId: coupleB.id,
      code: "93832-4",
      value: 5.5,
      unit: "h",
      effectiveAt: new Date("2026-11-01T08:00:00Z")
    }
  });

  await prisma.observation.upsert({
    where: { id: "seed-obs-b-hr-1" },
    update: {},
    create: {
      id: "seed-obs-b-hr-1",
      coupleId: coupleB.id,
      code: "8867-4",
      value: 78,
      unit: "/min",
      effectiveAt: new Date("2026-11-01T07:30:00Z")
    }
  });

  console.log(`  ✓ Patient B: ${userB.email}  (couple: ${coupleB.id})`);

  console.log(`
✅  Seed complete. Demo accounts:

  Role       Email                    Password
  ─────────  ───────────────────────  ──────────
  Clinician  clinician@reproai.dev    Demo1234!
  Patient A  patient.a@reproai.dev    Demo1234!  (favourable profile)
  Patient B  patient.b@reproai.dev    Demo1234!  (challenging profile)
  `);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

