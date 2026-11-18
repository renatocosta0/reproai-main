import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { registerPushSubscription } from "@/lib/notifications";

// POST /api/notifications/subscribe
// Registers a WebPush subscription or native device push token (APNs/FCM)
// for receiving lock screen notifications.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || (!body.endpoint && !body.deviceToken)) {
    return NextResponse.json({ error: "Invalid subscription payload" }, { status: 400 });
  }

  registerPushSubscription(session.userId, {
    endpoint: body.endpoint || `native-${session.userId}-${Date.now()}`,
    keys: body.keys,
    deviceToken: body.deviceToken,
    platform: body.platform || "web"
  });

  return NextResponse.json({
    ok: true,
    message: "Push notifications active on this device"
  });
}
