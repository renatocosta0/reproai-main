import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

// Returns the current session for client-side components.
// This endpoint allows client components to check authentication status
// without directly importing next/headers (which only works in Server Components).
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ session: null }, { status: 401 });
  }
  return NextResponse.json({ session });
}
