// The patient's journey, built only from what is recorded: the released record,
// tracking readings and the appointment state. Nothing is predicted or filled in.
// Two views share it: the care navigator (where you are, what comes next) and the
// timeline (what has happened, newest first). Wording lives in the UI.

import { isOutsideReference, type LabCode, type LabPoint, type LabSource } from "./labs";
import { analyzeBbt, type Point } from "./observation-analysis";
import type { AppointmentStatus } from "./appointment";
import type { PathwayOption } from "./pathways";
import type { AssessmentView, Purpose } from "@/types/record";

export interface JourneyInput {
  sex: "female" | "male" | null;
  intakeCompletedAt: string | null;
  labs: LabPoint[];
  /** Released assessments only (what the patient may see). */
  assessments: AssessmentView[];
  pendingReview: boolean;
  options: PathwayOption[];
  isPaired: boolean;
  consents: Partial<Record<Purpose, { granted: boolean; updatedAt: string | null }>>;
  appointment: { status: AppointmentStatus; slot?: string; scheduledAt?: string } | null;
  temperatures: Point[];
  sleep: Point[];
}

// ── Care navigator ──────────────────────────────────────────────────────────

export type StepId = "profile" | "tests" | "review" | "consult" | "options" | "partner";
/** done · current (your move) · waiting (with your clinician) · upcoming · optional */
export type StepStatus = "done" | "current" | "waiting" | "upcoming" | "optional";
export type StepOwner = "you" | "clinician" | "together";

export interface NavStep {
  id: StepId;
  status: StepStatus;
  owner: StepOwner;
  /** Baseline markers for this person, and which are on record. */
  tests?: { recorded: LabCode[]; missing: LabCode[] };
  reviewedAt?: string | null;
  appointment?: JourneyInput["appointment"];
  /** Pathway options to discuss, most urgent first. */
  discuss?: PathwayOption[];
}

/** The baseline markers a clinician records for each sex. The first one is required. */
export function baselineMarkers(sex: JourneyInput["sex"]): LabCode[] {
  if (sex === "female") return ["AMH", "AFC"];
  if (sex === "male") return ["SPERM_CONCENTRATION", "SPERM_PROGRESSIVE_MOTILITY", "SPERM_MORPHOLOGY"];
  return [];
}

const DISCUSS_KINDS = new Set(["RED_FLAG", "REFER", "PRESERVATION", "TEST", "COUNSEL"]);

export function buildNavigator(input: JourneyInput): NavStep[] {
  const steps: NavStep[] = [];

  steps.push({ id: "profile", owner: "you", status: input.intakeCompletedAt ? "done" : "current" });

  const markers = baselineMarkers(input.sex);
  const have = new Set(input.labs.map((l) => l.code));
  const recorded = markers.filter((m) => have.has(m));
  const missing = markers.filter((m) => !have.has(m));
  const testsDone = markers.length > 0 && have.has(markers[0]);
  steps.push({ id: "tests", owner: "clinician", status: testsDone ? "done" : "waiting", tests: { recorded, missing } });

  const released = input.assessments.length > 0;
  const reviewedAt = released ? input.assessments[0].reviewedAt ?? input.assessments[0].createdAt : null;
  steps.push({
    id: "review",
    owner: "clinician",
    status: input.pendingReview ? "waiting" : released ? "done" : testsDone ? "waiting" : "upcoming",
    reviewedAt
  });

  const appt = input.appointment;
  const consultStatus: StepStatus =
    appt?.status === "IN_FOLLOW_UP"
      ? "done"
      : appt?.status === "SCHEDULED" || appt?.status === "SUGGESTED"
        ? "current"
        : appt?.status === "REQUESTED"
          ? "waiting"
          : released
            ? "current"
            : "upcoming";
  steps.push({ id: "consult", owner: "together", status: consultStatus, appointment: appt });

  const discuss = input.options.filter((o) => DISCUSS_KINDS.has(o.kind)).sort((a, b) => a.priority - b.priority);
  // Options are talked through at the consultation, so they become the next step after it.
  steps.push({ id: "options", owner: "together", status: discuss.length > 0 && released && consultStatus === "done" ? "current" : "upcoming", discuss });

  steps.push({ id: "partner", owner: "you", status: input.isPaired ? "done" : "optional" });

  return steps;
}

/** The step to highlight as "you are here": the first required step that is not done. */
export function currentStep(steps: NavStep[]): StepId | null {
  return steps.find((s) => s.status !== "done" && s.status !== "optional")?.id ?? null;
}

// ── Timeline ────────────────────────────────────────────────────────────────

export type EventCategory = "results" | "reviews" | "tracking" | "care";

export interface LabItem {
  id: string;
  code: LabCode;
  value: number;
  unit: string;
  source: LabSource;
  below: boolean;
}

export type TimelineEvent =
  | { id: string; kind: "profile"; category: "care"; date: string }
  | { id: string; kind: "lab"; category: "results"; date: string; items: LabItem[] }
  | { id: string; kind: "review"; category: "reviews"; date: string; scope: string; tier: string | null; note: string | null }
  | { id: string; kind: "tracking-start"; category: "tracking"; date: string; signal: "temperature" | "sleep" }
  | { id: string; kind: "bbt-rise"; category: "tracking"; date: string; shift: number }
  | { id: string; kind: "consent"; category: "care"; date: string; purposes: Purpose[] }
  | { id: string; kind: "appointment"; category: "care"; date: string; slot?: string; upcoming: boolean };

const CONSENT_SHOWN: Purpose[] = ["CLINICIAN_ACCESS", "LAB_RESULTS", "WEARABLES", "PARTNER_SHARING"];

export function buildTimeline(input: JourneyInput, now: Date = new Date()): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  if (input.intakeCompletedAt) events.push({ id: "profile", kind: "profile", category: "care", date: input.intakeCompletedAt });

  // Results collected on the same day (e.g. one semen analysis) appear as one event.
  const labDays = new Map<string, { date: string; items: LabItem[] }>();
  for (const l of input.labs) {
    if (Number.isNaN(new Date(l.collectedAt).getTime())) continue;
    const day = l.collectedAt.slice(0, 10);
    const entry = labDays.get(day) ?? { date: l.collectedAt, items: [] };
    entry.items.push({ id: l.id, code: l.code, value: l.value, unit: l.unit, source: l.source, below: isOutsideReference(l.code, l.value) });
    labDays.set(day, entry);
  }
  labDays.forEach((v, day) => events.push({ id: `lab-${day}`, kind: "lab", category: "results", date: v.date, items: v.items }));

  for (const a of input.assessments) {
    events.push({
      id: `review-${a.id}`,
      kind: "review",
      category: "reviews",
      date: a.reviewedAt ?? a.createdAt,
      scope: a.scope,
      tier: a.tier,
      note: a.clinicianNote
    });
  }

  const temps = [...input.temperatures].sort((a, b) => a.date.getTime() - b.date.getTime());
  const sleep = [...input.sleep].sort((a, b) => a.date.getTime() - b.date.getTime());
  if (temps[0]) events.push({ id: "start-temperature", kind: "tracking-start", category: "tracking", date: temps[0].date.toISOString(), signal: "temperature" });
  if (sleep[0]) events.push({ id: "start-sleep", kind: "tracking-start", category: "tracking", date: sleep[0].date.toISOString(), signal: "sleep" });
  const bbt = analyzeBbt(temps);
  if (bbt.status === "BIPHASIC" && bbt.shiftIndex !== null && temps[bbt.shiftIndex]) {
    events.push({ id: "bbt-rise", kind: "bbt-rise", category: "tracking", date: temps[bbt.shiftIndex].date.toISOString(), shift: bbt.shift });
  }

  // Consents given on the same day appear as one event.
  const byDay = new Map<string, { date: string; purposes: Purpose[] }>();
  for (const p of CONSENT_SHOWN) {
    const c = input.consents[p];
    if (!c?.granted || !c.updatedAt || Number.isNaN(new Date(c.updatedAt).getTime())) continue;
    const day = c.updatedAt.slice(0, 10);
    const entry = byDay.get(day) ?? { date: c.updatedAt, purposes: [] };
    entry.purposes.push(p);
    if (c.updatedAt > entry.date) entry.date = c.updatedAt;
    byDay.set(day, entry);
  }
  byDay.forEach((v, day) => events.push({ id: `consent-${day}`, kind: "consent", category: "care", date: v.date, purposes: v.purposes }));

  const appt = input.appointment;
  if (appt?.status === "SCHEDULED" && appt.scheduledAt && !Number.isNaN(new Date(appt.scheduledAt).getTime())) {
    events.push({
      id: "appointment",
      kind: "appointment",
      category: "care",
      date: appt.scheduledAt,
      slot: appt.slot,
      upcoming: new Date(appt.scheduledAt).getTime() > now.getTime()
    });
  }

  return events
    .filter((e) => !Number.isNaN(new Date(e.date).getTime()))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
