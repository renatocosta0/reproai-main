import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { dispatchCareNotification } from "@/lib/notifications";
import { audit } from "@/lib/audit";
import { analyseAndAlert, WEARABLE_ALERT_PREFIX } from "./observation-alerts";

vi.mock("@/lib/db", () => ({
  prisma: {
    observation: { findMany: vi.fn() },
    menstrualCycle: { findMany: vi.fn().mockResolvedValue([]) },
    patient: { findUnique: vi.fn().mockResolvedValue(null) },
    followUp: { findMany: vi.fn(), create: vi.fn(), update: vi.fn() }
  }
}));
vi.mock("@/lib/notifications", () => ({ dispatchCareNotification: vi.fn() }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));

const DAY = 86_400_000;
const T0 = new Date("2026-09-01T07:00:00Z").getTime();
const temps = (values: number[]) =>
  values.map((value, i) => ({ code: "8310-5", value, effectiveAt: new Date(T0 + i * DAY) })).reverse(); // newest first, as the query returns
const flat = (n: number) => Array.from({ length: n }, (_, i) => 36.3 + (i % 3) * 0.05);
const ovulatory = [...Array(14).fill(36.3), 36.7, 36.75, 36.8, ...Array(11).fill(36.75)];

describe("analyseAndAlert", () => {
  it("pauses anovulation escalation with hormonal contraception", async () => {
    (prisma.patient.findUnique as any).mockResolvedValue({ trackingMode: "HORMONAL_CONTRACEPTION" });
    (prisma.observation.findMany as any).mockResolvedValue(temps(flat(42)));
    const r = await analyseAndAlert("patient-1", "case-1");
    expect(r.analytics.alert_level).toBe("P2");
    expect(prisma.followUp.create).not.toHaveBeenCalled();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.followUp.findMany as any).mockResolvedValue([]);
    (prisma.followUp.create as any).mockResolvedValue({ id: "fu-1" });
    (prisma.menstrualCycle.findMany as any).mockResolvedValue([]);
    (prisma.patient.findUnique as any).mockResolvedValue(null);
  });

  it("opens one wearable follow-up and notifies the clinicians on a P1 signal", async () => {
    (prisma.observation.findMany as any).mockResolvedValue(temps(flat(42)));
    const r = await analyseAndAlert("patient-1", "case-1");
    expect(r.alertTriggered).toBe(true);
    expect(r.analytics.alert_level).toBe("P1");
    expect(prisma.followUp.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ coupleId: "case-1", status: "ALERT_RAISED", note: expect.stringContaining(WEARABLE_ALERT_PREFIX) })
    });
    expect(dispatchCareNotification).toHaveBeenCalledWith(expect.objectContaining({ caseId: "case-1", targetRole: "CLINICIAN", type: "WEARABLE_ALERT" }));
  });

  it("does not open a follow-up for a single flat cycle (P2 advice only)", async () => {
    (prisma.observation.findMany as any).mockResolvedValue(temps([...ovulatory, ...flat(30)]));
    const r = await analyseAndAlert("patient-1", "case-1");
    expect(r.analytics.bbt_profile).toBe("MONOPHASIC_SUSPECTED_ANOVULATORY");
    expect(r.analytics.alert_level).toBe("P2");
    expect(prisma.followUp.create).not.toHaveBeenCalled();
  });

  it("never overwrites a follow-up a clinician opened", async () => {
    (prisma.followUp.findMany as any).mockResolvedValue([{ id: "fu-clin", status: "ALERT_RAISED", note: "Please book a review." }]);
    (prisma.observation.findMany as any).mockResolvedValue(temps(flat(42)));
    await analyseAndAlert("patient-1", "case-1");
    expect(prisma.followUp.update).not.toHaveBeenCalled();
    expect(prisma.followUp.create).toHaveBeenCalledTimes(1);
  });

  it("refreshes an open wearable alert without notifying again", async () => {
    (prisma.followUp.findMany as any).mockResolvedValue([{ id: "fu-w", status: "ALERT_RAISED", note: `${WEARABLE_ALERT_PREFIX}old reason` }]);
    (prisma.observation.findMany as any).mockResolvedValue(temps(flat(42)));
    await analyseAndAlert("patient-1", "case-1");
    expect(prisma.followUp.update).toHaveBeenCalledWith({ where: { id: "fu-w" }, data: { note: expect.stringContaining("Temperature:") } });
    expect(prisma.followUp.create).not.toHaveBeenCalled();
    expect(dispatchCareNotification).not.toHaveBeenCalled();
  });

  it("closes an untouched wearable alert once a confirmed rise is seen, with an audit record", async () => {
    (prisma.followUp.findMany as any).mockResolvedValue([{ id: "fu-w", status: "ALERT_RAISED", note: "Temperature: no sustained rise (legacy)" }]);
    (prisma.observation.findMany as any).mockResolvedValue(temps(ovulatory));
    const r = await analyseAndAlert("patient-1", "case-1");
    expect(r.analytics.alert_resolved).toBe(true);
    expect(prisma.followUp.update).toHaveBeenCalledWith({ where: { id: "fu-w" }, data: expect.objectContaining({ status: "CLOSED" }) });
    expect(audit).toHaveBeenCalledWith("system:wearable-analysis", "follow_up_auto_resolved", "follow_up:fu-w:couple:case-1");
  });
});
