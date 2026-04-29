/**
 * pushBrowser.ts — client-side helpers for web push subscription flow.
 *
 * Runs in the browser only. Never import server-only modules here.
 */

/** Convert a base64url string (VAPID public key) to an ArrayBuffer for pushManager.subscribe. */
export function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    view[i] = rawData.charCodeAt(i);
  }
  return buffer;
}

/** Register (or retrieve existing) the service worker at /sw.js. */
export async function registerSW(): Promise<ServiceWorkerRegistration> {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service workers not supported in this browser.");
  }
  const reg = await navigator.serviceWorker.register("/sw.js");
  // Wait until the SW is active (handles first-install case)
  await navigator.serviceWorker.ready;
  return reg;
}

/** True when running on iOS Safari (push only works in standalone mode on iOS 16.4+). */
export function isIOS(): boolean {
  return (
    typeof navigator !== "undefined" &&
    /iPhone|iPad|iPod/.test(navigator.userAgent) &&
    // MSStream is IE-only; absence confirms Safari
    !("MSStream" in window)
  );
}

/** True when the app is installed (standalone display-mode, i.e. Added to Home Screen). */
export function isStandalone(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(display-mode: standalone)").matches
  );
}

export type PushPermissionState = "default" | "granted" | "denied" | "unsupported";

/** Get the current Notification permission state without prompting. */
export function getPermissionState(): PushPermissionState {
  if (typeof window === "undefined") return "unsupported";
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission as PushPermissionState;
}

/** Full subscribe flow: register SW → request permission → subscribe → POST to /api/push/subscribe. */
export async function subscribePush(vapidPublicKey: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const reg = await registerSW();

    // Check if already subscribed
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      // Re-POST to upsert (last_seen_at refresh)
      await postSubscription(existing);
      return { ok: true };
    }

    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { ok: false, error: "permission_denied" };
    }

    // Subscribe
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    await postSubscription(subscription);
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

async function postSubscription(subscription: PushSubscription): Promise<void> {
  const json = subscription.toJSON();
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
      label: `${navigator.userAgent.slice(0, 60)}`,
      user_agent: navigator.userAgent,
    }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `subscribe failed with status ${res.status}`);
  }
}
