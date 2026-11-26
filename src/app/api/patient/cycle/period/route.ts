import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasConsent } from "@/lib/consent";
import { addDays, dayKey, diffDays } from "@/lib/cycle";
import { afterCycleWrite, removePeriod, startPeriod } from "@/lib/cycle-server";

// POST /api/patient/cycle/period { date } → record the first day of a period (today or back-filled).
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "PATIENT") return NextResponse.json({ error: "Patient access required" }, { status: 403 });
    if (!(await hasConsent(session.userId, "CYCLE_TRACKING"))) return NextResponse.json({ error: "Turn on cycle tracking in Privacy & consent first." }, { status: 403 });
    const body = await req.json().catch(() => null);
    const date = typeof body?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : null;
    const today = dayKey(new Date());
    if (!date || date > addDays(today, 1) || diffDays(today, date) > 400) {
      return NextResponse.json({ error: "Choose the first day of your period (not in the future, within the last 400 days)." }, { status: 400 });
    }
    await startPeriod(session.userId, date);
    const analysis = await afterCycleWrite(session.userId);
    return NextResponse.json({ ok: true, prediction: analysis.prediction }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/patient/cycle/period] error:", error);
    return NextResponse.json({ error: "The period could not be saved." }, { status: 500 });
  }
}

// DELETE /api/patient/cycle/period?id=… → remove a period start recorded by mistake.
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "PATIENT") return NextResponse.json({ error: "Patient access required" }, { status: 403 });
    const id = req.nextUrl.searchParams.get("id");
    if (!id || !(await removePeriod(session.userId, id))) return NextResponse.json({ error: "That period was not found." }, { status: 404 });
    await afterCycleWrite(session.userId);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[DELETE /api/patient/cycle/period] error:", error);
    return NextResponse.json({ error: "The period could not be removed." }, { status: 500 });
  }
}
