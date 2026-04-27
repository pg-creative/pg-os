// PG OS — service worker for web push.
// Vanilla JS (NOT TypeScript) so the browser executes it directly out of /public.
//
// Lifecycle: register from the app, accept push events, render notifications,
// open the dashboard at the URL embedded in the payload on click.

self.addEventListener("install", (event) => {
  // Activate this SW as soon as it's installed — single-user app, no need to
  // wait for old tabs to close.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch (_e) {
    payload = { title: "PG OS", body: event.data.text() };
  }

  const title = payload.title || "PG OS";
  const body = payload.body || "";
  const url = payload.url || "/";
  const tag = payload.tag || "pgos-push";

  const options = {
    body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag,
    renotify: false,
    data: { url },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // If the dashboard is already open, focus it and navigate.
      for (const client of all) {
        if ("focus" in client) {
          try {
            await client.focus();
            if ("navigate" in client && targetUrl !== "/") {
              await client.navigate(targetUrl);
            }
            return;
          } catch (_e) { /* try the next one */ }
        }
      }
      // Otherwise open a new window.
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })(),
  );
});
