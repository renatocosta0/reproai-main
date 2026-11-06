/**
 * ReproAI database seed — creates real test accounts and cohorts for demo/evaluation.
 *
 * Seed cohorts match the reference care population:
 *   1. Couple a3f9c2: Maya A. & Omar A.      (18.7% — Low response, alert raised)
 *   2. Couple b7e4d1: Lina H. & Sami H.      (38.4% — Moderate chance)
 *   3. Couple c2a8f6: Noura K. & Faisal K.   (62.1% — High chance)
 *   4. Couple d5c1b9: Sara M. & Zayd M.      (44.8% — Moderate chance)
 *
 * Test Accounts:
 *   Clinician:  clinician@reproai.dev  / Demo1234!
 *   Patient A:  patient.a@reproai.dev  / Demo1234! (Maya A. & Omar A.)
 *   Patient B:  patient.b@reproai.dev  / Demo1234! (Lina H. & Sami H.)
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱  Seeding ReproAI database with care population...");

  const PASSWORD_HASH = await bcrypt.hash("Demo1234!", 12);
  const now = new Date();

  // ── 0. Clinician ───────────────────────────────────────────────────────────
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

  // ── 1. Couple a3f9c2: Maya A. & Omar A. (18.7%) ────────────────────────────
  const couple1 = await prisma.couple.upsert({
    where: { id: "a3f9c2" },
    update: {},
    create: { id: "a3f9c2" }
  });

  await prisma.user.upsert({
    where: { email: "patient.a@reproai.dev" },
    update: { coupleId: couple1.id },
    create: {
      email: "patient.a@reproai.dev",
      password: PASSWORD_HASH,
      role: "PATIENT",
      coupleId: couple1.id,
      consentAt: now
    }
  });

  await prisma.patient.upsert({
    where: { id: "patient-1-female" },
    update: { name: "Maya A." },
    create: {
      id: "patient-1-female",
      coupleId: couple1.id,
      name: "Maya A.",
      sex: "female",
      age: 38,
      bmi: 27.5,
      amh: 0.9,
      pcosHistory: true,
      infertilityDurationMonths: 36,
      priorCycles: 2
    }
  });

  await prisma.patient.upsert({
    where: { id: "patient-1-male" },
    update: { name: "Omar A." },
    create: {
      id: "patient-1-male",
      coupleId: couple1.id,
      name: "Omar A.",
      sex: "male",
      spermCount: 8.5
    }
  });

  await prisma.prediction.upsert({
    where: { id: "pred-1" },
    update: { probability: 18.7 },
    create: {
      id: "pred-1",
      coupleId: couple1.id,
      probability: 18.7,
      confidenceLow: 14.2,
      confidenceHigh: 23.5,
      factors: JSON.stringify([
        { feature: "Female age", impact: 0.35 },
        { feature: "AMH (ovarian reserve)", impact: 0.25 },
        { feature: "Sperm concentration", impact: 0.20 },
        { feature: "Infertility duration", impact: 0.12 },
        { feature: "Prior treatment cycles", impact: 0.08 }
      ]),
      modelVersion: "clinical-scoring-v1.0"
    }
  });

  await prisma.followUp.upsert({
    where: { id: "followup-1" },
    update: {},
    create: {
      id: "followup-1",
      coupleId: couple1.id,
      status: "ALERT_RAISED",
      note: "Success probability below 25%. Case flagged for multidisciplinary consultation."
    }
  });

  // Seed wearable observations for Couple 1 (thermal shift pattern + sleep)
  const sampleObservations = [
    { id: "obs-1-1", code: "8310-5", value: 36.3, unit: "Cel", daysAgo: 16 },
    { id: "obs-1-2", code: "8310-5", value: 36.35, unit: "Cel", daysAgo: 15 },
    { id: "obs-1-3", code: "8310-5", value: 36.28, unit: "Cel", daysAgo: 14 },
    { id: "obs-1-4", code: "8310-5", value: 36.65, unit: "Cel", daysAgo: 13 }, // Thermal shift +0.35°C
    { id: "obs-1-5", code: "8310-5", value: 36.72, unit: "Cel", daysAgo: 12 },
    { id: "obs-1-6", code: "93832-4", value: 7.5, unit: "h", daysAgo: 14 },
    { id: "obs-1-7", code: "93832-4", value: 8.0, unit: "h", daysAgo: 13 }
  ];

  for (const obs of sampleObservations) {
    const obsDate = new Date(now);
    obsDate.setDate(now.getDate() - obs.daysAgo);
    await prisma.observation.upsert({
      where: { id: obs.id },
      update: {},
      create: {
        id: obs.id,
        coupleId: couple1.id,
        code: obs.code,
        value: obs.value,
        unit: obs.unit,
        effectiveAt: obsDate
      }
    });
  }

  console.log(`  ✓ Couple a3f9c2: Maya A. & Omar A. (18.7%)`);

  // ── 2. Couple b7e4d1: Lina H. & Sami H. (38.4%) ────────────────────────────
  const couple2 = await prisma.couple.upsert({
    where: { id: "b7e4d1" },
    update: {},
    create: { id: "b7e4d1" }
  });

  await prisma.user.upsert({
    where: { email: "patient.b@reproai.dev" },
    update: { coupleId: couple2.id },
    create: {
      email: "patient.b@reproai.dev",
      password: PASSWORD_HASH,
      role: "PATIENT",
      coupleId: couple2.id,
      consentAt: now
    }
  });

  await prisma.patient.upsert({
    where: { id: "patient-2-female" },
    update: { name: "Lina H." },
    create: {
      id: "patient-2-female",
      coupleId: couple2.id,
      name: "Lina H.",
      sex: "female",
      age: 33,
      bmi: 23.4,
      amh: 2.1,
      pcosHistory: false,
      infertilityDurationMonths: 20,
      priorCycles: 1
    }
  });

  await prisma.patient.upsert({
    where: { id: "patient-2-male" },
    update: { name: "Sami H." },
    create: {
      id: "patient-2-male",
      coupleId: couple2.id,
      name: "Sami H.",
      sex: "male",
      spermCount: 16.0
    }
  });

  await prisma.prediction.upsert({
    where: { id: "pred-2" },
    update: { probability: 38.4 },
    create: {
      id: "pred-2",
      coupleId: couple2.id,
      probability: 38.4,
      confidenceLow: 33.1,
      confidenceHigh: 44.0,
      factors: JSON.stringify([
        { feature: "Female age", impact: 0.30 },
        { feature: "AMH (ovarian reserve)", impact: 0.25 },
        { feature: "Sperm concentration", impact: 0.22 },
        { feature: "BMI", impact: 0.13 },
        { feature: "Prior treatment cycles", impact: 0.10 }
      ]),
      modelVersion: "clinical-scoring-v1.0"
    }
  });

  console.log(`  ✓ Couple b7e4d1: Lina H. & Sami H. (38.4%)`);

  // ── 3. Couple c2a8f6: Noura K. & Faisal K. (62.1%) ─────────────────────────
  const couple3 = await prisma.couple.upsert({
    where: { id: "c2a8f6" },
    update: {},
    create: { id: "c2a8f6" }
  });

  await prisma.patient.upsert({
    where: { id: "patient-3-female" },
    update: { name: "Noura K." },
    create: {
      id: "patient-3-female",
      coupleId: couple3.id,
      name: "Noura K.",
      sex: "female",
      age: 29,
      bmi: 21.8,
      amh: 3.4,
      pcosHistory: false,
      infertilityDurationMonths: 12,
      priorCycles: 0
    }
  });

  await prisma.patient.upsert({
    where: { id: "patient-3-male" },
    update: { name: "Faisal K." },
    create: {
      id: "patient-3-male",
      coupleId: couple3.id,
      name: "Faisal K.",
      sex: "male",
      spermCount: 32.0
    }
  });

  await prisma.prediction.upsert({
    where: { id: "pred-3" },
    update: { probability: 62.1 },
    create: {
      id: "pred-3",
      coupleId: couple3.id,
      probability: 62.1,
      confidenceLow: 56.4,
      confidenceHigh: 67.8,
      factors: JSON.stringify([
        { feature: "Female age", impact: 0.33 },
        { feature: "AMH (ovarian reserve)", impact: 0.28 },
        { feature: "Sperm concentration", impact: 0.22 },
        { feature: "BMI", impact: 0.17 }
      ]),
      modelVersion: "clinical-scoring-v1.0"
    }
  });

  console.log(`  ✓ Couple c2a8f6: Noura K. & Faisal K. (62.1%)`);

  // ── 4. Couple d5c1b9: Sara M. & Zayd M. (44.8%) ───────────────────────────
  const couple4 = await prisma.couple.upsert({
    where: { id: "d5c1b9" },
    update: {},
    create: { id: "d5c1b9" }
  });

  await prisma.patient.upsert({
    where: { id: "patient-4-female" },
    update: { name: "Sara M." },
    create: {
      id: "patient-4-female",
      coupleId: couple4.id,
      name: "Sara M.",
      sex: "female",
      age: 32,
      bmi: 24.1,
      amh: 2.6,
      pcosHistory: false,
      infertilityDurationMonths: 18,
      priorCycles: 1
    }
  });

  await prisma.patient.upsert({
    where: { id: "patient-4-male" },
    update: { name: "Zayd M." },
    create: {
      id: "patient-4-male",
      coupleId: couple4.id,
      name: "Zayd M.",
      sex: "male",
      spermCount: 20.0
    }
  });

  await prisma.prediction.upsert({
    where: { id: "pred-4" },
    update: { probability: 44.8 },
    create: {
      id: "pred-4",
      coupleId: couple4.id,
      probability: 44.8,
      confidenceLow: 39.2,
      confidenceHigh: 50.4,
      factors: JSON.stringify([
        { feature: "Female age", impact: 0.31 },
        { feature: "AMH (ovarian reserve)", impact: 0.26 },
        { feature: "Sperm concentration", impact: 0.23 },
        { feature: "BMI", impact: 0.12 },
        { feature: "Prior treatment cycles", impact: 0.08 }
      ]),
      modelVersion: "clinical-scoring-v1.0"
    }
  });

  console.log(`  ✓ Couple d5c1b9: Sara M. & Zayd M. (44.8%)`);

  console.log(`
✅  Seed complete with 4 registered couples matching reference demo.
  `);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
