import { describe, expect, it, vi, beforeEach } from "vitest";

const chatMock = vi.fn();
vi.mock("@/lib/chat-provider", () => ({ chat: (...args: unknown[]) => chatMock(...args) }));

import { classifyIntent, ruleIntent, settleDecision } from "@/lib/rag/intent";
import { INTENT_SET } from "@/lib/rag/eval-set";
import { groundedAnswer } from "@/lib/rag/answer";
import type { RecordPassage } from "@/lib/rag/record-passages";

const RECORD: RecordPassage[] = [
  { id: "REC-PROFILE", title: "Your profile", text: "Your profile records sex female, age 34. These details are self-reported in your intake." },
  { id: "REC-AMH", title: "Your AMH", text: "Your latest AMH is 2.4 ng/mL, measured on 2026-11-07 (lab)." },
  { id: "REC-ASSESSMENT", title: "Your latest released assessment", text: "Your latest assessment was released by your clinician on 2026-11-19 (individual). Your clinician's note: Happy to talk through egg-freezing timing at your next visit." }
];

beforeEach(() => chatMock.mockReset());

describe("ruleIntent (fallback rules, English + Arabic)", () => {
  for (const item of INTENT_SET) {
    it(`${item.lang ?? "en"} · ${item.intent} · ${item.q}`, () => {
      expect(ruleIntent(item.q, { audience: item.audience ?? "patient" }).intent).toBe(item.intent);
    });
  }
});

describe("settleDecision", () => {
  const general = ruleIntent("How does age affect fertility?", { audience: "patient" });
  it("accepts a confident LLM verdict", () => {
    expect(settleDecision({ intent: "patient_data", confidence: 0.9 }, general).intent).toBe("patient_data");
  });
  it("defaults low-confidence personal verdicts to general guidance", () => {
    expect(settleDecision({ intent: "clinical_personal", confidence: 0.4 }, general).intent).toBe("clinical_general");
    expect(settleDecision({ intent: "out_of_scope", confidence: 0.3 }, general).intent).toBe("clinical_general");
  });
  it("never lets the LLM override urgent or prescription rules", () => {
    const urgent = ruleIntent("لدي نزيف حاد", { audience: "patient" });
    expect(settleDecision({ intent: "clinical_general", confidence: 1 }, urgent).intent).toBe("urgent");
    const dose = ruleIntent("What dose of letrozole should I take?", { audience: "patient" });
    expect(settleDecision({ intent: "clinical_general", confidence: 1 }, dose).intent).toBe("out_of_scope");
  });
  it("falls back to rules when the LLM reply is unusable", () => {
    expect(settleDecision(null, general)).toEqual(general);
  });
});

describe("classifyIntent", () => {
  it("uses the LLM verdict", async () => {
    chatMock.mockResolvedValueOnce({ reply: '{"intent":"clinical_general","confidence":0.92}', provider: "azure" });
    const d = await classifyIntent("What should we expect at the first visit?", { audience: "patient" });
    expect(d).toMatchObject({ intent: "clinical_general", source: "llm" });
  });
  it("uses the rules when the LLM fails", async () => {
    chatMock.mockRejectedValueOnce(new Error("down"));
    const d = await classifyIntent("ما هي نتيجة تحليل AMH لدي؟", { audience: "patient" });
    expect(d).toMatchObject({ intent: "patient_data", source: "rules" });
  });
  it("does not call the LLM for urgent wording", async () => {
    const d = await classifyIntent("I fainted and have heavy bleeding", { audience: "patient" });
    expect(d.intent).toBe("urgent");
    expect(chatMock).not.toHaveBeenCalled();
  });
});

describe("groundedAnswer routing", () => {
  it("never sends the record for a general question (the consultation bug)", async () => {
    chatMock
      .mockResolvedValueOnce({ reply: '{"intent":"clinical_general","confidence":0.95}', provider: "azure" })
      .mockResolvedValue({ reply: '{"answerable": false, "sentences": []}', provider: "azure" });
    const a = await groundedAnswer("What happens at a fertility consultation?", { audience: "patient", record: RECORD });
    expect(a.intent?.name).toBe("clinical_general");
    expect(a.status).toBe("abstained");
    expect(a.sources.some((s) => s.kind === "record")).toBe(false);
    for (const call of chatMock.mock.calls.slice(1)) expect(JSON.stringify(call[0])).not.toContain("REC-");
  });

  it("answers a record question from the record only", async () => {
    chatMock
      .mockResolvedValueOnce({ reply: '{"intent":"patient_data","confidence":0.95}', provider: "azure" })
      .mockResolvedValueOnce({ reply: '{"answerable": true, "sentences": [{"text": "Your latest AMH is 2.4 ng/mL, measured on 2026-11-07.", "cites": ["REC-AMH"]}]}', provider: "azure" });
    const a = await groundedAnswer("What is my AMH?", { audience: "patient", record: RECORD });
    expect(a.status).toBe("answered");
    expect(a.sources.map((s) => s.id)).toEqual(["REC-AMH"]);
    const generation = JSON.stringify(chatMock.mock.calls[1][0]);
    expect(generation).toContain("[REC-AMH]");
    expect(generation).not.toMatch(/\[(THQ|WHO25|ACOG|RAI)-/);
  });

  it("refuses out-of-scope questions without generating", async () => {
    chatMock.mockResolvedValueOnce({ reply: '{"intent":"out_of_scope","confidence":0.97}', provider: "azure" });
    const a = await groundedAnswer("What is the capital of France?", { audience: "patient", record: RECORD });
    expect(a).toMatchObject({ status: "abstained", mode: "none", intent: { name: "out_of_scope" } });
    expect(chatMock).toHaveBeenCalledTimes(1);
  });

  it("abstains on a record question when there is no record (public assistant)", async () => {
    chatMock.mockResolvedValueOnce({ reply: '{"intent":"patient_data","confidence":0.9}', provider: "azure" });
    const a = await groundedAnswer("What is my AMH?", { audience: "patient" });
    expect(a).toMatchObject({ status: "abstained", intent: { name: "patient_data" } });
    expect(chatMock).toHaveBeenCalledTimes(1);
  });

  it("routes Arabic urgent wording to the urgent message", async () => {
    const a = await groundedAnswer("لدي نزيف حاد", { audience: "patient", locale: "ar" });
    expect(a.status).toBe("urgent");
    expect(chatMock).not.toHaveBeenCalled();
  });
});
