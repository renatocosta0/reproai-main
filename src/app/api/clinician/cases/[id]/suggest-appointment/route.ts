import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { suggestAppointmentByClinician } from "@/lib/appointment";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession();
    if (!session || session.role !== "CLINICIAN") {
      return NextResponse.json({ error: "Clinician access required" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const slot = typeof body?.slot === "string" ? body.slot.trim() : undefined;
    const reason = typeof body?.reason === "string" ? body.reason.trim() : undefined;

    const result = await suggestAppointmentByClinician(session.userId, params.id, slot, reason);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[POST /api/clinician/cases/:id/suggest-appointment] error:", error);
    return NextResponse.json({ error: error?.message ?? "Failed to suggest appointment" }, { status: 500 });
  }
}
