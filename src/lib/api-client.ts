// Browser-side fetch helper for the Next.js API routes. Surfaces the API's
// `{ error }` message so the UI can show it instead of a generic failure.
import { Capacitor } from "@capacitor/core";

let mobileAccessToken: string | null = null;

function isNativeApp(): boolean {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

function apiUrl(path: string, native: boolean): string {
  if (!native) return path;
  const base = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "");
  if (!base) throw new Error("This mobile build is missing NEXT_PUBLIC_API_BASE_URL.");
  return `${base}${path}`;
}

export function clearMobileAccessToken(): void {
  mobileAccessToken = null;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const native = isNativeApp();
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");

  if (native && mobileAccessToken) headers.set("Authorization", `Bearer ${mobileAccessToken}`);
  const mobileAuthRequest = native && (path === "/api/auth/login" || path === "/api/auth/register");
  if (mobileAuthRequest) headers.set("X-ReproAI-Client", "capacitor");

  const res = await fetch(apiUrl(path, native), {
    credentials: native ? "omit" : "include",
    ...init,
    headers
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      (data && typeof data.error === "string" && data.error) || `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }
  if (mobileAuthRequest && typeof data?.accessToken === "string") {
    mobileAccessToken = data.accessToken;
  }
  return data as T;
}

/** Message safe to show users: API validation messages pass through, server faults don't. */
export function userMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    return err.status >= 500 ? "Something went wrong on our side. Please try again shortly." : err.message;
  }
  return fallback;
}

export function homeForRole(role: string): string {
  return role === "CLINICIAN" ? "/clinician/dashboard" : "/patient/overview";
}
