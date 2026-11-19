"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import type { CareNotification } from "@/lib/notifications";

interface NotificationResponse {
  ok: boolean;
  notifications: CareNotification[];
  unreadCount: number;
}

/**
 * Persistent notification history for both portals. Toasts make an incoming
 * event visible; this inbox makes it recoverable and observable afterwards.
 */
export function NotificationInbox() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<CareNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    try {
      const result = await api<NotificationResponse>("/api/notifications");
      if (!result.ok) return;
      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);
    } catch {
      // The inbox remains available with the last successfully fetched state.
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = window.setInterval(load, 2_500);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [load]);

  async function markRead(id: string) {
    try {
      const result = await api<{ ok: boolean }>("/api/notifications", {
        method: "PATCH",
        body: JSON.stringify({ id })
      });
      if (!result.ok) return false;
      setNotifications((current) => current.map((n) => n.id === id ? { ...n, read: true } : n));
      setUnreadCount((count) => Math.max(0, count - 1));
      return true;
    } catch {
      return false;
    }
  }

  async function openNotification(notification: CareNotification) {
    if (!notification.read && !(await markRead(notification.id))) return;
    setOpen(false);
    router.push(notification.url);
    router.refresh();
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        className="secondary compact"
        onClick={() => setOpen((value) => !value)}
        aria-label={unreadCount ? `${unreadCount} unread notifications` : "Notifications"}
        aria-expanded={open}
        style={{ position: "relative", minWidth: 36, padding: "7px 9px" }}
      >
        <Bell size={16} aria-hidden />
        {unreadCount > 0 && (
          <span
            aria-label={`${unreadCount} unread`}
            style={{
              position: "absolute", top: -6, right: -7, minWidth: 17, height: 17,
              borderRadius: 10, background: "#dc2626", color: "white", fontSize: 10,
              display: "grid", placeItems: "center", border: "2px solid var(--surface, white)", padding: "0 3px"
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <section
          aria-label="Notifications"
          style={{
            position: "absolute", zIndex: 10000, top: "calc(100% + 10px)", right: 0,
            width: "min(390px, calc(100vw - 24px))", maxHeight: "min(560px, calc(100vh - 100px))",
            overflowY: "auto", background: "var(--surface, #fff)", border: "1px solid #dbe3ea",
            borderRadius: 14, boxShadow: "0 16px 40px rgba(15, 23, 42, .18)", padding: 8
          }}
        >
          <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 9px 10px" }}>
            <strong style={{ fontSize: 14 }}>Notifications</strong>
            <span style={{ color: "#64748b", fontSize: 12 }}>{unreadCount ? `${unreadCount} unread` : "All caught up"}</span>
          </header>
          {notifications.length === 0 ? (
            <p style={{ color: "#64748b", fontSize: 13, padding: "14px 9px", margin: 0 }}>No care updates yet.</p>
          ) : notifications.map((notification) => (
            <article
              key={notification.id}
              style={{
                display: "grid", gridTemplateColumns: "1fr auto", gap: 8, padding: "10px 9px",
                borderRadius: 9, background: notification.read ? "transparent" : "#eff6ff", marginBottom: 2
              }}
            >
              <button
                type="button"
                onClick={() => void openNotification(notification)}
                style={{ textAlign: "left", background: "transparent", border: 0, padding: 0, cursor: "pointer", color: "inherit" }}
              >
                <strong style={{ display: "block", fontSize: 12.5, marginBottom: 3 }}>{notification.title}</strong>
                <span style={{ display: "block", fontSize: 12, color: "#475569", lineHeight: 1.4 }}>{notification.body}</span>
                <small style={{ display: "block", marginTop: 5, color: "#64748b", fontSize: 10.5 }}>
                  {new Date(notification.createdAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                </small>
              </button>
              {!notification.read ? (
                <button
                  type="button"
                  title="Mark as read"
                  aria-label="Mark as read"
                  onClick={() => void markRead(notification.id)}
                  style={{ border: 0, background: "transparent", color: "#2563eb", cursor: "pointer", alignSelf: "start", padding: 2 }}
                >
                  <CheckCheck size={16} />
                </button>
              ) : <ExternalLink size={14} aria-hidden style={{ color: "#94a3b8", marginTop: 2 }} />}
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
