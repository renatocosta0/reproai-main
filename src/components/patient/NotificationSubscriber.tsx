"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, Sparkles, X } from "lucide-react";
import { api } from "@/lib/api-client";
import type { CareNotification } from "@/lib/notifications";

export function NotificationSubscriber() {
  const router = useRouter();
  const [activeToast, setActiveToast] = useState<CareNotification | null>(null);
  const [lastSeenId, setLastSeenId] = useState<string | null>(null);

  // 1. Register Service Worker and request native Notification permissions
  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Service worker registration optional in non-HTTPS dev
      });
    }

    if ("Notification" in window && Notification.permission === "default") {
      // Non-blocking permission request
      Notification.requestPermission().then((perm) => {
        if (perm === "granted") {
          void api("/api/notifications/subscribe", {
            method: "POST",
            body: JSON.stringify({
              endpoint: `browser-${Date.now()}`,
              platform: /iPhone|iPad/.test(navigator.userAgent) ? "ios" : "web"
            })
          }).catch(() => {});
        }
      });
    }
  }, []);

  // 2. Poll for real-time care updates (checks every 8s)
  useEffect(() => {
    let mounted = true;

    async function checkNotifications() {
      try {
        const res = await api<{ ok: boolean; notifications: CareNotification[]; unreadCount: number }>("/api/notifications");
        if (!mounted || !res.ok) return;

        const latest = res.notifications[0];
        if (latest && !latest.read && latest.id !== lastSeenId) {
          setLastSeenId(latest.id);
          setActiveToast(latest);

          // If window is backgrounded or device is locked, fire native notification
          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted" && document.hidden) {
            new Notification(latest.title, {
              body: latest.body,
              icon: "/logo.svg",
              tag: "reproai-update"
            });
          }
        }
      } catch {
        // Silent degrade if offline
      }
    }

    const interval = setInterval(checkNotifications, 8000);
    void checkNotifications();

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [lastSeenId]);

  if (!activeToast) return null;

  async function handleDismiss() {
    if (activeToast) {
      void api("/api/notifications", {
        method: "PATCH",
        body: JSON.stringify({ id: activeToast.id })
      }).catch(() => {});
    }
    setActiveToast(null);
  }

  function handleOpen() {
    const url = activeToast?.url || "/patient/assessment";
    void handleDismiss();
    router.push(url);
    router.refresh();
  }

  return (
    <div
      role="alert"
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        left: 16,
        maxWidth: 420,
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
          <strong style={{ fontSize: 13.5, color: "#f8fafc" }}>{activeToast.title}</strong>
          <span style={{ fontSize: 10.5, background: "#1e293b", padding: "1px 6px", borderRadius: 8, color: "#94a3b8" }}>
            Just now
          </span>
        </div>
        <p style={{ margin: 0, fontSize: 12.5, color: "#cbd5e1", lineHeight: 1.4 }}>{activeToast.body}</p>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 6, fontSize: 11.5, color: "#60a5fa", fontWeight: 500 }}>
          <Sparkles size={12} /> Tap to view recommendation
        </span>
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss notification"
        style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", padding: 4 }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
