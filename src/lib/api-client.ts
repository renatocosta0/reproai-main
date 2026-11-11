// Browser-side fetch helper for the Next.js API routes. Surfaces the API's
// `{ error }` message so the UI can show it instead of a generic failure.

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers }
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      (data && typeof data.error === "string" && data.error) || `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
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
