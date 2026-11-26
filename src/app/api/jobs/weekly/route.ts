import { NextRequest, NextResponse } from "next/server";
import { jobAuthorised } from "@/lib/job-auth";
import { runWeeklyJob } from "@/lib/jobs";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// POST /api/jobs/weekly  (Authorization: Bearer <CRON_SECRET>)
export async function POST(req: NextRequest) {
  const auth = jobAuthorised(req);
  if (auth === "disabled") return NextResponse.json({ error: "Scheduled jobs are not configured (set CRON_SECRET)." }, { status: 503 });
  if (auth === "denied") return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, job: "weekly", ...(await runWeeklyJob()) });
  } catch (error: any) {
    console.error("[jobs:weekly] failed", error);
    return NextResponse.json({ error: "Job failed" }, { status: 500 });
  }
}
