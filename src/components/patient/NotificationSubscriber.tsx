"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Sparkles, X } from "lucide-react";
import { api } from "@/lib/api-client";
import type { CareNotification } from "@/lib/notifications";
import { useClinicianText } from "@/components/clinician/useClinicianText";
import { notificationCopy } from "@/lib/notification-copy";
import { publishNotificationsUpdated } from "@/lib/notification-events";

export function NotificationSubscriber() {
  const router = useRouter();
  const { locale, ar } = useClinicianText();
  const [activeToast, setActiveToast] = useState<CareNotification | null>(null);
  const activeToastRef = useRef<CareNotification | null>(null);
  const knownIdsRef = useRef<Set<string> | null>(null);

  // Register the service worker without prompting for notification permission.
  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Service worker registration optional in non-HTTPS dev
      });
    }
  }, []);

  // Poll while the portal is open. The persistent inbox handles anything a
  // presenter or user did not see in a toast.
  useEffect(() => {
    let mounted = true;
    let checking = false;

    async function checkNotifications() {
      if (checking) return;
      checking = true;
      try {
        const res = await api<{ ok: boolean; notifications: CareNotification[]; unreadCount: number }>("/api/notifications");
        if (!mounted || !res.ok) return;

        // Establish a baseline on page load: old unread items stay in the inbox,
        // but only events created during this visit produce a toast.
        if (!knownIdsRef.current) {
          knownIdsRef.current = new Set(res.notifications.map((notification) => notification.id));
          publishNotificationsUpdated({ notifications: res.notifications, unreadCount: res.unreadCount });
          return;
        }

        const knownIds = knownIdsRef.current;
        const newlyArrived = res.notifications.filter((notification) => !knownIds.has(notification.id));
        for (const notification of res.notifications) knownIds.add(notification.id);
        while (knownIds.size > 300) {
          const oldestId = knownIds.values().next().value;
          if (oldestId === undefined) break;
          knownIds.delete(oldestId);
        }

        publishNotificationsUpdated({ notifications: res.notifications, unreadCount: res.unreadCount });

        // One toast at a time; additional events remain visible in the inbox.
        const nextUnread = newlyArrived.find((notification) => !notification.read);
        if (nextUnread) {
          knownIds.add(nextUnread.id);
          if (activeToastRef.current) return;
          activeToastRef.current = nextUnread;
          setActiveToast(nextUnread);
          const copy = notificationCopy(nextUnread, locale);

          // Show a browser notification only when the user already granted permission.
          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted" && document.hidden) {
            const registration = await navigator.serviceWorker?.getRegistration();
            if (registration) {
              await registration.showNotification(copy.title, {
                body: copy.body,
                icon: "/logo.svg",
                tag: nextUnread.id,
                lang: locale,
                data: { url: nextUnread.url }
              });
            }
          }
        }
      } catch {
        // Silent degrade if offline
      } finally {
        checking = false;
      }
    }

    const interval = setInterval(checkNotifications, 5000);
    void checkNotifications();

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [locale]);

  if (!activeToast) return null;
  const copy = notificationCopy(activeToast, locale);

  async function handleDismiss() {
    if (activeToast) {
      try {
        const result = await api<{ ok: boolean }>("/api/notifications", {
          method: "PATCH",
          body: JSON.stringify({ id: activeToast.id })
        });
        if (!result?.ok) return false;
      } catch {
        return false;
      }
    }
    activeToastRef.current = null;
    setActiveToast(null);
    return true;
  }

  async function handleOpen() {
    const url = activeToast?.url || "/patient/assessment";
    if (!(await handleDismiss())) return;
    router.push(url);
    router.refresh();
  }

  return (
    <div
      role="alert"
      lang={locale}
      dir={ar ? "rtl" : "ltr"}
      style={{
        position: "fixed",
        top: 16,
        insetInline: 12,
        maxWidth: 420,
        boxSizing: "border-box",
        margin: "0 auto",
        zIndex: 9999,
        background: "#0f172a",
        color: "#ffffff",
        padding: "14px 16px",
        borderRadius: 14,
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)",
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        animation: "slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
      }}
    >
      <div style={{ background: "#3b82f6", color: "#fff", padding: 8, borderRadius: 10 }}>
        <Bell size={18} />
      </div>

      <div style={{ flex: 1, cursor: "pointer" }} onClick={handleOpen}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <strong style={{ fontSize: 13.5, color: "#f8fafc" }}>{copy.title}</strong>
          <span style={{ fontSize: 10.5, background: "#1e293b", padding: "1px 6px", borderRadius: 8, color: "#94a3b8" }}>
            {ar ? "الآن" : "Just now"}
          </span>
        </div>
        <p style={{ margin: 0, fontSize: 12.5, color: "#cbd5e1", lineHeight: 1.4 }}>{copy.body}</p>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 6, fontSize: 11.5, color: "#60a5fa", fontWeight: 500 }}>
          <Sparkles size={12} /> {ar ? "فتح تحديث الرعاية" : "Open care update"}
        </span>
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        aria-label={ar ? "إغلاق الإشعار" : "Dismiss notification"}
        style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", padding: 4 }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
