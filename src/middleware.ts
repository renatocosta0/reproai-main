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
  if (pathname.startsWith("/api/")) return handleApiCors(req);

  const role = await readRole(req);

  if (!role) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/clinician") && role !== "CLINICIAN") {
    const url = req.nextUrl.clone();
    url.pathname = "/patient/overview";
    return NextResponse.redirect(url);
  }
  if (pathname.startsWith("/patient") && role !== "PATIENT") {
    const url = req.nextUrl.clone();
    url.pathname = "/clinician/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

function handleApiCors(req: NextRequest) {
  const origin = req.headers.get("origin");
  const sameOrigin = origin === req.nextUrl.origin;
  const allowedOrigins = new Set(
    (process.env.CAPACITOR_ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((value) => value.trim().replace(/\/$/, ""))
      .filter(Boolean)
  );
  const allowedNativeOrigin = !!origin && allowedOrigins.has(origin.replace(/\/$/, ""));

  if (origin && !sameOrigin && !allowedNativeOrigin) {
    return NextResponse.json({ error: "Origin is not allowed." }, { status: 403 });
  }

  if (req.method === "OPTIONS") {
    if (!sameOrigin && !allowedNativeOrigin) return new NextResponse(null, { status: 403 });
    const response = new NextResponse(null, { status: 204 });
    if (allowedNativeOrigin) applyNativeCors(response, origin!);
    return response;
  }

  const response = NextResponse.next();
  if (allowedNativeOrigin) applyNativeCors(response, origin!);
  return response;
}

function applyNativeCors(response: NextResponse, origin: string) {
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-ReproAI-Client");
  response.headers.set("Access-Control-Max-Age", "600");
  response.headers.append("Vary", "Origin");
}

export const config = {
  matcher: ["/api/:path*", "/patient/:path*", "/clinician/:path*"]
};
