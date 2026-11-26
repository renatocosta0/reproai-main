// Scheduled jobs are called by the platform scheduler (Azure Functions timer,
// GitHub Actions, Vercel Cron…) with "Authorization: Bearer <CRON_SECRET>".
// Without CRON_SECRET configured the endpoints are disabled.

import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export function jobAuthorised(req: NextRequest): "ok" | "disabled" | "denied" {
  const secret = process.env.CRON_SECRET;
  if (!secret) return "disabled";
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b) ? "ok" : "denied";
}
