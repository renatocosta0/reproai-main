import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  suggestSlotByClinician,
  confirmBookingByClinician,
  cancelAppointment
} from "@/lib/appointment-server";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session || session.role !== "CLINICIAN") {
      return NextResponse.json({ error: "Clinician access required" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action as string | undefined;

    // Confirm/finalize booking after patient accepted
    if (action === "confirm") {
      const followUpId = typeof body?.followUpId === "string" ? body.followUpId : undefined;
      const finalSlot = typeof body?.slot === "string" ? body.slot.trim() : undefined;
      const notes = typeof body?.notes === "string" ? body.notes.trim() : undefined;
      if (!followUpId || !finalSlot) {
        return NextResponse.json({ error: "followUpId and slot are required" }, { status: 400 });
      }
      const result = await confirmBookingByClinician(session.userId, params.id, followUpId, finalSlot, notes);
      return NextResponse.json(result);
    }

    // Default: suggest a slot to the patient
    const slot = typeof body?.slot === "string" ? body.slot.trim() : undefined;
    const reason = typeof body?.reason === "string" ? body.reason.trim() : undefined;
    if (!slot) return NextResponse.json({ error: "slot is required" }, { status: 400 });

    const result = await suggestSlotByClinician(session.userId, params.id, slot, reason);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[POST /api/clinician/cases/:id/suggest-appointment] error:", error);
    return NextResponse.json({ error: error?.message ?? "Failed to suggest appointment" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session || session.role !== "CLINICIAN") {
      return NextResponse.json({ error: "Clinician access required" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const followUpId = typeof body?.followUpId === "string" ? body.followUpId : undefined;
    const cancelNote = typeof body?.note === "string" ? body.note.trim() : undefined;
    if (!followUpId) return NextResponse.json({ error: "followUpId required" }, { status: 400 });

    const result = await cancelAppointment(session.userId, "CLINICIAN", followUpId, cancelNote);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[DELETE /api/clinician/cases/:id/suggest-appointment] error:", error);
    return NextResponse.json({ error: error?.message ?? "Failed to cancel" }, { status: 500 });
  }
}
