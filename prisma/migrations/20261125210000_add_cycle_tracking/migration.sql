-- Menstrual cycle tracking: cycles, daily logs and the patient's tracking mode.
-- Additive only: no existing table, column or record is changed or removed.

ALTER TABLE "Patient" ADD COLUMN "trackingMode" TEXT;

CREATE TABLE "MenstrualCycle" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "cycleLengthDays" INTEGER,
    "periodLengthDays" INTEGER,
    "ovulationDate" TIMESTAMP(3),
    "ovulationMethod" TEXT,
    "lutealPhaseDays" INTEGER,
    "regularityStatus" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenstrualCycle_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MenstrualCycle_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "MenstrualCycle_userId_startDate_key" ON "MenstrualCycle"("userId", "startDate");
CREATE INDEX "MenstrualCycle_userId_startDate_idx" ON "MenstrualCycle"("userId", "startDate");

CREATE TABLE "DailyCycleLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cycleId" TEXT,
    "logDate" TIMESTAMP(3) NOT NULL,
    "bleedingFlow" TEXT,
    "cervicalMucus" TEXT,
    "ovulationTest" TEXT,
    "basalTempCelsius" DOUBLE PRECISION,
    "tempConfounder" TEXT,
    "sleepMinutes" INTEGER,
    "waterIntakeMl" INTEGER,
    "symptoms" TEXT,
    "mood" TEXT,
    "notes" TEXT,
    "intimacy" TEXT,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyCycleLog_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DailyCycleLog_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DailyCycleLog_cycleId_fkey" FOREIGN KEY ("cycleId")
        REFERENCES "MenstrualCycle"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "DailyCycleLog_userId_logDate_key" ON "DailyCycleLog"("userId", "logDate");
CREATE INDEX "DailyCycleLog_cycleId_idx" ON "DailyCycleLog"("cycleId");
