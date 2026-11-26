import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasConsent } from "@/lib/consent";
import { afterCycleWrite, loadCycleRecord, saveDayLog, validateDayLog } from "@/lib/cycle-server";

const CONSENT_ERROR = "Turn on 'Store my cycle and symptom log' in Privacy & consent to use cycle tracking.";

// GET /api/patient/cycle → the patient's own cycle record (cycles, logs, analysis).
export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "PATIENT") return NextResponse.json({ error: "Patient access required" }, { status: 403 });
    const consented = await hasConsent(session.userId, "CYCLE_TRACKING");
    if (!consented) return NextResponse.json({ consented: false });
    const record = await loadCycleRecord(session.userId, "PATIENT");
    return NextResponse.json({ consented: true, ...record });
  } catch (error: any) {
    console.error("[GET /api/patient/cycle] error:", error);
    return NextResponse.json({ error: "Your cycle record could not be loaded." }, { status: 500 });
  }
}

// POST /api/patient/cycle { date, bleedingFlow?, cervicalMucus?, ovulationTest?, basalTempCelsius?, ... } → save one day.
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "PATIENT") return NextResponse.json({ error: "Patient access required" }, { status: 403 });
    if (!(await hasConsent(session.userId, "CYCLE_TRACKING"))) return NextResponse.json({ error: CONSENT_ERROR }, { status: 403 });
    const checked = validateDayLog(await req.json().catch(() => null));
    if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });
    const { startedCycle } = await saveDayLog(session.userId, checked.value);
    const analysis = await afterCycleWrite(session.userId);
    return NextResponse.json({ ok: true, startedCycle, prediction: analysis.prediction });
  } catch (error: any) {
    console.error("[POST /api/patient/cycle] error:", error);
    return NextResponse.json({ error: "This day could not be saved." }, { status: 500 });
  }
}
