import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getNotificationsForUser, markNotificationAsRead } from "@/lib/notifications";

// GET /api/notifications
// Retrieves in-app care notifications for the authenticated user.
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const notifications = getNotificationsForUser(session.userId);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return NextResponse.json({
    ok: true,
    notifications,
    unreadCount
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

  const success = markNotificationAsRead(session.userId, id);
  return NextResponse.json({ ok: success });
}
