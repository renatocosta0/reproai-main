"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import type { CareNotification } from "@/lib/notifications";
import { useLocale } from "@/components/i18n/LocaleContext";
import { notificationCopy } from "@/lib/notification-copy";
import { getLatestNotificationsUpdate, NOTIFICATIONS_UPDATED_EVENT, type NotificationsUpdatedDetail } from "@/lib/notification-events";

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
  const { locale } = useLocale();
  const ar = locale === "ar";
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<CareNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const onNotificationsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<NotificationsUpdatedDetail>).detail;
      if (!detail) return;
      setNotifications(detail.notifications);
      setUnreadCount(detail.unreadCount);
    };
    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, onNotificationsUpdated);
    const latestUpdate = getLatestNotificationsUpdate();
    if (latestUpdate) {
      setNotifications(latestUpdate.notifications);
      setUnreadCount(latestUpdate.unreadCount);
    }
    return () => {
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, onNotificationsUpdated);
    };
  }, []);

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
        aria-label={ar ? (unreadCount ? `${unreadCount} إشعارات غير مقروءة` : "الإشعارات") : (unreadCount ? `${unreadCount} unread notifications` : "Notifications")}
        aria-expanded={open}
        style={{ position: "relative", minWidth: 44, minHeight: 44, padding: "9px 12px", touchAction: "manipulation" }}
      >
        <Bell size={16} aria-hidden />
        {unreadCount > 0 && (
          <span
            aria-label={ar ? `${unreadCount} غير مقروء` : `${unreadCount} unread`}
            style={{
              position: "absolute", top: -4, insetInlineEnd: -5, minWidth: 17, height: 17,
              borderRadius: 10, background: "#dc2626", color: "white", fontSize: 10,
              display: "grid", placeItems: "center", border: "2px solid var(--notification-surface)", padding: "0 3px"
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <section
          aria-label={ar ? "الإشعارات" : "Notifications"}
          dir={ar ? "rtl" : "ltr"}
          style={{
            position: "fixed", zIndex: 10000, top: 76, insetInlineEnd: 12,
            width: "min(390px, calc(100vw - 24px))", maxHeight: "min(560px, calc(100dvh - 88px))",
            overflowY: "auto", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch", background: "var(--notification-surface)", color: "var(--notification-text)", border: "1px solid var(--notification-border)",
            borderRadius: 14, boxShadow: "0 16px 40px rgba(15, 23, 42, .18)", padding: 8, boxSizing: "border-box"
          }}
        >
          <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 9px 10px" }}>
            <strong style={{ fontSize: 14 }}>{ar ? "الإشعارات" : "Notifications"}</strong>
            <span style={{ color: "var(--notification-muted)", fontSize: 12 }}>{ar ? (unreadCount ? `${unreadCount} غير مقروء` : "لا توجد تحديثات جديدة") : (unreadCount ? `${unreadCount} unread` : "All caught up")}</span>
          </header>
          {notifications.length === 0 ? (
            <p style={{ color: "var(--notification-muted)", fontSize: 13, padding: "14px 9px", margin: 0 }}>{ar ? "لا توجد تحديثات رعاية حالياً." : "No care updates yet."}</p>
          ) : notifications.map((notification) => {
            const copy = notificationCopy(notification, locale);
            return (
            <article
              key={notification.id}
              style={{
                display: "grid", gridTemplateColumns: "1fr auto", gap: 8, padding: "10px 9px",
                borderRadius: 9, background: notification.read ? "transparent" : "var(--notification-unread)", marginBottom: 2
              }}
            >
              <button
                type="button"
                onClick={() => void openNotification(notification)}
                style={{ textAlign: ar ? "right" : "left", background: "transparent", border: 0, padding: 0, cursor: "pointer", color: "inherit", minWidth: 0, overflowWrap: "anywhere", touchAction: "manipulation" }}
              >
                <strong style={{ display: "block", fontSize: 12.5, marginBottom: 3 }}>{copy.title}</strong>
                <span style={{ display: "block", fontSize: 12, color: "var(--notification-muted)", lineHeight: 1.4 }}>{copy.body}</span>
                  <small style={{ display: "block", marginTop: 5, color: "var(--notification-muted)", fontSize: 10.5 }}>
                  {new Date(notification.createdAt).toLocaleString(ar ? "ar-AE" : "en-AE", { dateStyle: "short", timeStyle: "short" })}
                </small>
              </button>
              {!notification.read ? (
                <button
                  type="button"
                  title={ar ? "وضع علامة كمقروء" : "Mark as read"}
                  aria-label={ar ? "وضع علامة كمقروء" : "Mark as read"}
                  onClick={() => void markRead(notification.id)}
                  style={{ border: 0, background: "transparent", color: "var(--notification-action)", cursor: "pointer", alignSelf: "start", padding: 8, minWidth: 40, minHeight: 40, touchAction: "manipulation" }}
                >
                  <CheckCheck size={16} />
                </button>
              ) : <ExternalLink size={14} aria-hidden style={{ color: "var(--notification-icon-muted)", marginTop: 2 }} />}
            </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
