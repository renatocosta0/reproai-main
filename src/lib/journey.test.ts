import { describe, expect, it } from "vitest";
import { buildNavigator, buildTimeline, currentStep, type JourneyInput } from "./journey";
import type { AssessmentView } from "@/types/record";
import type { PathwayOption } from "./pathways";

const base: JourneyInput = {
  sex: "female",
  intakeCompletedAt: null,
  labs: [],
  assessments: [],
  pendingReview: false,
  options: [],
  isPaired: false,
  consents: {},
  appointment: { status: "NONE" },
  temperatures: [],
  sleep: []
};

const assessment = (over: Partial<AssessmentView> = {}): AssessmentView => ({
  id: "a1",
  scope: "INDIVIDUAL",
  status: "RELEASED",
  probability: 0.5,
  confidenceLow: 0.4,
  confidenceHigh: 0.6,
  tier: "FAVOURABLE",
  percentile: null,
  completeness: 1,
  missingOptional: [],
  evidenceStatus: null,
  preservationGuidance: null,
  factors: null,
  inputs: null,
  modelVersion: null,
  clinicianNote: "Stable since last year.",
  reviewedAt: "2026-11-09T10:00:00Z",
  userId: "u1",
  createdAt: "2026-11-08T10:00:00Z",
  ...over
});

const option = (kind: PathwayOption["kind"], priority: 1 | 2 | 3): PathwayOption => ({
  ruleId: `R-${kind}`,
  kind,
  priority,
  title: kind,
  patientText: "",
  clinicianText: "",
  reason: "",
  source: ""
});

const status = (steps: ReturnType<typeof buildNavigator>, id: string) => steps.find((s) => s.id === id)?.status;

describe("care navigator", () => {
  it("starts with the profile and waits on the clinician for tests", () => {
    const steps = buildNavigator(base);
    expect(status(steps, "profile")).toBe("current");
    expect(status(steps, "tests")).toBe("waiting");
    expect(status(steps, "review")).toBe("upcoming");
    expect(status(steps, "consult")).toBe("upcoming");
    expect(status(steps, "partner")).toBe("optional");
    expect(currentStep(steps)).toBe("profile");
  });

  it("marks tests done from the required marker only, and lists what is missing", () => {
    const steps = buildNavigator({
      ...base,
      intakeCompletedAt: "2026-10-01T00:00:00Z",
      labs: [{ id: "l1", code: "AMH", value: 2.4, unit: "ng/mL", collectedAt: "2026-11-07T00:00:00Z", source: "CLINICIAN_VERIFIED" }]
    });
    const tests = steps.find((s) => s.id === "tests")!;
    expect(tests.status).toBe("done");
    expect(tests.tests).toEqual({ recorded: ["AMH"], missing: ["AFC"] });
    // Tests are in, nothing released yet: the clinician's review is the next step.
    expect(status(steps, "review")).toBe("waiting");
    expect(currentStep(steps)).toBe("review");
  });

  it("uses male baseline markers", () => {
    const steps = buildNavigator({ ...base, sex: "male" });
    expect(steps.find((s) => s.id === "tests")!.tests!.missing).toContain("SPERM_CONCENTRATION");
  });

  it("after release, suggests the consultation and lists options to discuss by priority", () => {
    const steps = buildNavigator({
      ...base,
      intakeCompletedAt: "2026-10-01T00:00:00Z",
      labs: [{ id: "l1", code: "AMH", value: 2.4, unit: "ng/mL", collectedAt: "2026-11-07T00:00:00Z", source: "CLINICIAN_VERIFIED" }],
      assessments: [assessment()],
      options: [option("OPTIMISE", 3), option("PRESERVATION", 2), option("REFER", 1)]
    });
    expect(status(steps, "review")).toBe("done");
    expect(steps.find((s) => s.id === "review")!.reviewedAt).toBe("2026-11-09T10:00:00Z");
    expect(status(steps, "consult")).toBe("current");
    const discuss = steps.find((s) => s.id === "options")!.discuss!;
    expect(discuss.map((o) => o.kind)).toEqual(["REFER", "PRESERVATION"]);
    // Options wait for the consultation, so only one step reads as "next".
    expect(status(steps, "options")).toBe("upcoming");
    expect(currentStep(steps)).toBe("consult");
  });

  it("follows the appointment state", () => {
    const at = (s: NonNullable<JourneyInput["appointment"]>["status"]) => status(buildNavigator({ ...base, appointment: { status: s } }), "consult");
    expect(at("REQUESTED")).toBe("waiting");
    expect(at("SUGGESTED")).toBe("current");
    expect(at("SCHEDULED")).toBe("current");
    expect(at("IN_FOLLOW_UP")).toBe("done");
  });

  it("shows a pending review as waiting even when an earlier one was released", () => {
    expect(status(buildNavigator({ ...base, assessments: [assessment()], pendingReview: true }), "review")).toBe("waiting");
  });
});

describe("timeline", () => {
  const temps = [36.3, 36.35, 36.3, 36.32, 36.28, 36.31, 36.3, 36.33, 36.7, 36.72, 36.75, 36.7, 36.74].map((v, i) => ({
    date: new Date(Date.UTC(2026, 9, 20 + i)),
    value: v
  }));

  it("builds dated events from the record, newest first", () => {
    const events = buildTimeline(
      {
        ...base,
        intakeCompletedAt: "2026-10-01T00:00:00Z",
        labs: [{ id: "l1", code: "AMH", value: 0.9, unit: "ng/mL", collectedAt: "2026-11-07T00:00:00Z", source: "CLINICIAN_VERIFIED" }],
        assessments: [assessment()],
        consents: { LAB_RESULTS: { granted: true, updatedAt: "2026-10-02T00:00:00Z" }, WEARABLES: { granted: false, updatedAt: "2026-10-02T00:00:00Z" } },
        temperatures: temps
      },
      new Date("2026-11-18T00:00:00Z")
    );
    expect(events.map((e) => e.kind)).toEqual(["review", "lab", "bbt-rise", "tracking-start", "consent", "profile"]);
    const lab = events.find((e) => e.kind === "lab");
    expect(lab && lab.kind === "lab" && lab.items[0].below).toBe(true);
    // A consent that is not granted is not shown.
    expect(events.find((e) => e.kind === "consent")).toMatchObject({ purposes: ["LAB_RESULTS"] });
  });

  it("groups results collected on the same day", () => {
    const at = "2026-11-07T00:00:00Z";
    const events = buildTimeline({
      ...base,
      sex: "male",
      labs: [
        { id: "a", code: "SPERM_CONCENTRATION", value: 22, unit: "million/mL", collectedAt: at, source: "CLINICIAN_VERIFIED" },
        { id: "b", code: "SPERM_MORPHOLOGY", value: 5, unit: "%", collectedAt: at, source: "CLINICIAN_VERIFIED" },
        { id: "c", code: "SPERM_CONCENTRATION", value: 18, unit: "million/mL", collectedAt: "2025-11-01T00:00:00Z", source: "CLINICIAN_VERIFIED" }
      ]
    });
    expect(events.map((e) => (e.kind === "lab" ? e.items.length : 0))).toEqual([2, 1]);
  });

  it("merges consents given on the same day", () => {
    const events = buildTimeline({
      ...base,
      consents: {
        CLINICIAN_ACCESS: { granted: true, updatedAt: "2026-11-12T08:00:00Z" },
        LAB_RESULTS: { granted: true, updatedAt: "2026-11-12T08:00:01Z" },
        WEARABLES: { granted: true, updatedAt: "2026-11-14T08:00:00Z" }
      }
    });
    const consents = events.filter((e) => e.kind === "consent");
    expect(consents).toHaveLength(2);
    expect(consents[1]).toMatchObject({ purposes: ["CLINICIAN_ACCESS", "LAB_RESULTS"] });
  });

  it("adds a scheduled appointment and marks it upcoming", () => {
    const events = buildTimeline(
      { ...base, appointment: { status: "SCHEDULED", scheduledAt: "2026-11-25T09:00:00Z", slot: "25 Nov, 09:00" } },
      new Date("2026-11-18T00:00:00Z")
    );
    expect(events[0]).toMatchObject({ kind: "appointment", upcoming: true });
  });

  it("has no events when nothing is recorded", () => {
    expect(buildTimeline(base)).toEqual([]);
  });
});
