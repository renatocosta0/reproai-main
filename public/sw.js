// Service Worker for ReproAI Push Notifications.
// Displays privacy-compliant notifications on mobile lock screen & desktop even when app is closed.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {
    title: "ReproAI · Care Update",
    body: "Your healthcare provider updated your personalized care guidance. Tap to view.",
    url: "/patient/overview"
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text() || data.body;
    }
  }

  const options = {
    body: data.body,
    icon: "/logo.svg",
    badge: "/logo.svg",
    tag: "reproai-care-update",
    renotify: true,
    requireInteraction: true,
    data: {
      url: data.url || "/patient/overview"
    }
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const requestedUrl = event.notification.data?.url || "/patient/overview";
  const targetUrl = new URL(requestedUrl, self.location.origin);
  if (targetUrl.origin !== self.location.origin) {
    targetUrl.href = new URL("/patient/overview", self.location.origin).href;
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          client.navigate(targetUrl.href);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl.href);
      }
    })
  );
});
