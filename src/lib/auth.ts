// Authentication and session handling. Email/password with bcrypt hashing and
// an HTTP-only JWT session cookie signed with AUTH_SECRET. Role-based helpers
// gate patient vs clinician areas.

import { cookies, headers } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import type { Role } from "@/types";

const COOKIE = process.env.SESSION_COOKIE ?? "reproai_session";

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(s);
}

export interface SessionPayload {
  userId: string;
  role: Role;
  coupleId?: string | null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await signSessionToken(payload);

  cookies().set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8
  });
}

export async function createMobileAccessToken(payload: SessionPayload): Promise<string> {
  return signSessionToken(payload, { client: "capacitor", aud: "reproai-mobile" });
}

async function signSessionToken(payload: SessionPayload, claims: Record<string, string> = {}): Promise<string> {
  return new SignJWT({ ...payload, ...claims })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret());
}

export function destroySession(): void {
  cookies().delete(COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const authorization = headers().get("authorization");
  const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const token = bearer ?? cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (bearer && (payload.client !== "capacitor" || payload.aud !== "reproai-mobile")) return null;
    return {
      userId: payload.userId as string,
      role: payload.role as Role,
      coupleId: (payload.coupleId as string | undefined) ?? null
    };
  } catch {
    return null;
  }
}

export async function requireRole(role: Role): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new AuthError("Not authenticated", 401);
  if (session.role !== role) throw new AuthError("Forbidden", 403);
  return session;
}

export async function authenticate(email: string, password: string): Promise<SessionPayload> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.password))) {
    throw new AuthError("Invalid credentials", 401);
  }
  return { userId: user.id, role: user.role as Role, coupleId: user.coupleId };
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
