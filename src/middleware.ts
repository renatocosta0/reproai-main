// Edge middleware enforcing authentication and role-based access on the patient
// and clinician areas. Unauthenticated users are redirected to /login; users in
// the wrong role are sent to their own area.

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE = process.env.SESSION_COOKIE ?? "reproai_session";

async function readRole(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return (payload.role as string) ?? null;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const role = await readRole(req);

  if (!role) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/clinician") && role !== "CLINICIAN") {
    const url = req.nextUrl.clone();
    url.pathname = "/patient/dashboard";
    return NextResponse.redirect(url);
  }
  if (pathname.startsWith("/patient") && role !== "PATIENT") {
    const url = req.nextUrl.clone();
    url.pathname = "/clinician/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/patient/:path*", "/clinician/:path*"]
};
