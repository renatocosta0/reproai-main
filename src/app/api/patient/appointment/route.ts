import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getPatientAppointmentState,
  requestAppointmentByPatient,
  acceptSuggestionByPatient,
  declineSuggestionByPatient,
  cancelAppointment
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
    const action = body?.action as string | undefined;

    if (action === "accept") {
      const followUpId = typeof body?.followUpId === "string" ? body.followUpId : undefined;
      if (!followUpId) return NextResponse.json({ error: "followUpId required" }, { status: 400 });
      const result = await acceptSuggestionByPatient(session.userId, followUpId);
      return NextResponse.json(result);
    }

    if (action === "decline") {
      const followUpId = typeof body?.followUpId === "string" ? body.followUpId : undefined;
      const declineNote = typeof body?.note === "string" ? body.note.trim() : undefined;
      if (!followUpId) return NextResponse.json({ error: "followUpId required" }, { status: 400 });
      const result = await declineSuggestionByPatient(session.userId, followUpId, declineNote);
      return NextResponse.json(result);
    }

    // Default: patient requests a consultation
    const note = typeof body?.note === "string" ? body.note.trim() : undefined;
    const result = await requestAppointmentByPatient(session.userId, note);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[POST /api/patient/appointment] error:", error);
    return NextResponse.json({ error: error?.message ?? "Failed to process request" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "PATIENT") {
      return NextResponse.json({ error: "Patient authentication required" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const followUpId = typeof body?.followUpId === "string" ? body.followUpId : undefined;
    const cancelNote = typeof body?.note === "string" ? body.note.trim() : undefined;
    if (!followUpId) return NextResponse.json({ error: "followUpId required" }, { status: 400 });

    const result = await cancelAppointment(session.userId, "PATIENT", followUpId, cancelNote);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[DELETE /api/patient/appointment] error:", error);
    return NextResponse.json({ error: error?.message ?? "Failed to cancel" }, { status: 500 });
  }
}
