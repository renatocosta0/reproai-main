import type { CycleAnalysis, DayLog, LabAlignment } from "@/lib/cycle";

export type CycleDayLog = DayLog & { notes?: string | null };

interface CycleRecordFields {
  analysis: CycleAnalysis;
  logs: CycleDayLog[];
  cycleIds: { id: string; startDate: string }[];
  trackingMode: string | null;
  temperatures: { date: string; value: number }[];
  sleep: { date: string; hours: number }[];
  today: string;
}

export type PatientCycleResponse =
  | { consented: false }
  | ({ consented: true } & CycleRecordFields);

export type ClinicianCycleResponse =
  | { shared: false; reason: "CLINICIAN_ACCESS" | "CYCLE_TRACKING" }
  | ({
      shared: true;
      labs: { id: string; code: string; value: number; unit: string; collectedAt: string; source: string }[];
      alignment: LabAlignment[];
    } & CycleRecordFields);
