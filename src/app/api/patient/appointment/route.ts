import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getPatientAppointmentState,
  confirmAppointmentByPatient
} from "@/lib/appointment-server";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "PATIENT") {
      return NextResponse.json({ error: "Patient authentication required" }, { status: 401 });
    }

    const appointment = await getPatientAppointmentState(session.userId);
    return NextResponse.json({ appointment });
  } catch (error: any) {
    console.error("[GET /api/patient/appointment] error:", error);
    return NextResponse.json({ error: error?.message ?? "Failed to fetch appointment" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "PATIENT") {
      return NextResponse.json({ error: "Patient authentication required" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const slot = typeof body?.slot === "string" ? body.slot.trim() : undefined;
    const note = typeof body?.note === "string" ? body.note.trim() : undefined;

    const result = await confirmAppointmentByPatient(session.userId, slot, note);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[POST /api/patient/appointment] error:", error);
    return NextResponse.json({ error: error?.message ?? "Failed to book appointment" }, { status: 500 });
  }
}
