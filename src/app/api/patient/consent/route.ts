import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getConsents, isPurpose, NON_DISCRIMINATION, PURPOSE_INFO, setConsent } from "@/lib/consent";

// GET /api/patient/consent -> { consents, purposes, nonDiscrimination }
// PUT /api/patient/consent { purpose, granted } — takes effect immediately, audited.
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "PATIENT") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ consents: await getConsents(session.userId), purposes: PURPOSE_INFO, nonDiscrimination: NON_DISCRIMINATION });
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "PATIENT") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => null);
    if (!isPurpose(body?.purpose) || typeof body?.granted !== "boolean") {
      return NextResponse.json({ error: "purpose and granted (boolean) are required" }, { status: 400 });
    }
    await setConsent(session.userId, body.purpose, body.granted);
    return NextResponse.json({ consents: await getConsents(session.userId) });
  } catch (error: any) {
    console.error("[PUT /api/patient/consent] error:", error);
    return NextResponse.json({ error: error?.message ?? "Failed to update consent" }, { status: 500 });
  }
}
