import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getNotificationsForUser,
  getUnreadNotificationCount,
  markNotificationAsRead
} from "@/lib/notifications";

// GET /api/notifications
// Retrieves in-app care notifications for the authenticated user.
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const [notifications, unreadCount] = await Promise.all([
    getNotificationsForUser(session.userId),
    getUnreadNotificationCount(session.userId)
  ]);

  return NextResponse.json({
    ok: true,
    notifications,
    unreadCount
  }, {
    headers: { "Cache-Control": "private, no-store, max-age=0" }
  });
}

// PATCH /api/notifications
// Marks a specific notification as read.
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const id = typeof body?.id === "string" ? body.id : null;

  if (!id) {
    return NextResponse.json({ error: "Notification id required" }, { status: 400 });
  }

  const success = await markNotificationAsRead(session.userId, id);
  return NextResponse.json({ ok: success });
}
