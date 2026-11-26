import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { TRACKING_MODES } from "@/lib/cycle";
import { afterCycleWrite, setTrackingMode } from "@/lib/cycle-server";

// PATCH /api/patient/cycle/settings { trackingMode } → what cycle tracking is for.
// Contraception, postpartum and perimenopause pause ovulation predictions and anovulation alerts.
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "PATIENT") return NextResponse.json({ error: "Patient access required" }, { status: 403 });
    const body = await req.json().catch(() => null);
    const mode = body?.trackingMode ?? null;
    if (mode !== null && !(TRACKING_MODES as readonly string[]).includes(mode)) return NextResponse.json({ error: "Choose a tracking mode." }, { status: 400 });
    await setTrackingMode(session.userId, mode);
    const analysis = await afterCycleWrite(session.userId);
    return NextResponse.json({ ok: true, trackingMode: mode, prediction: analysis.prediction });
  } catch (error: any) {
    console.error("[PATCH /api/patient/cycle/settings] error:", error);
    return NextResponse.json({ error: "The setting could not be saved." }, { status: 500 });
  }
}
