import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

// POST /api/notifications/subscribe
// Kept as an explicit response for clients that still call the old endpoint.
// This project does not currently have a configured push delivery provider.
export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  return NextResponse.json(
    { error: "Push delivery is not configured. In-app notifications remain available." },
    { status: 501 }
  );
}
