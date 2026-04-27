"use client";

import { useCallback, useEffect, useState } from "react";

type Status =
  | { kind: "loading" }
  | { kind: "unsupported"; reason: string }
  | { kind: "denied" }
  | { kind: "available" }
  | { kind: "subscribed" }
  | { kind: "error"; message: string };

function urlBase64ToBuffer(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buffer;
}

export function PushSubscribe() {
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [vapidKey, setVapidKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Initial environment / state probe.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (typeof window === "undefined") return;
      if (!("serviceWorker" in navigator)) {
        setStatus({ kind: "unsupported", reason: "no service worker" });
        return;
      }
      if (!("PushManager" in window)) {
        setStatus({ kind: "unsupported", reason: "no PushManager" });
        return;
      }
      if (!("Notification" in window)) {
        setStatus({ kind: "unsupported", reason: "no Notification API" });
        return;
      }

      try {
        const res = await fetch("/api/push/subscribe", { method: "GET" });
        const json = await res.json();
        if (cancelled) return;
        setVapidKey(json.vapid_public ?? null);
      } catch (err) {
        if (cancelled) return;
        setStatus({
          kind: "error",
          message: err instanceof Error ? err.message : "diagnostics_failed",
        });
        return;
      }

      if (Notification.permission === "denied") {
        if (!cancelled) setStatus({ kind: "denied" });
        return;
      }

      try {
        const reg = await navigator.serviceWorker.getRegistration("/sw.js");
        const existing = reg ? await reg.pushManager.getSubscription() : null;
        if (cancelled) return;
        setStatus(existing ? { kind: "subscribed" } : { kind: "available" });
      } catch (err) {
        if (cancelled) return;
        setStatus({
          kind: "error",
          message: err instanceof Error ? err.message : "registration_check_failed",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const enable = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (!vapidKey) {
        setStatus({
          kind: "error",
          message: "VAPID public key not configured. Set VAPID_PUBLIC on the server.",
        });
        return;
      }

      const reg =
        (await navigator.serviceWorker.getRegistration("/sw.js")) ??
        (await navigator.serviceWorker.register("/sw.js", { scope: "/" }));
      await navigator.serviceWorker.ready;

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus({ kind: "denied" });
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToBuffer(vapidKey),
      });

      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
          label: navigator.platform || "this device",
          user_agent: navigator.userAgent,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setStatus({
          kind: "error",
          message: err.error || `subscribe API returned ${res.status}`,
        });
        return;
      }
      setStatus({ kind: "subscribed" });
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "enable_failed",
      });
    } finally {
      setBusy(false);
    }
  }, [busy, vapidKey]);

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 12,
        background: "var(--bg-1)",
        border: "1px solid var(--border-soft, rgba(0,0,0,0.1))",
        color: "var(--fg)",
        fontSize: 13,
        maxWidth: 420,
      }}
    >
      <div style={{ marginBottom: 8, fontWeight: 600, color: "var(--accent)" }}>
        Push notifications
      </div>

      {status.kind === "loading" && <div>Checking permissions…</div>}

      {status.kind === "unsupported" && (
        <div style={{ opacity: 0.7 }}>
          This browser doesn&apos;t support web push ({status.reason}). Try Chrome, Firefox, or Edge.
        </div>
      )}

      {status.kind === "denied" && (
        <div style={{ opacity: 0.85 }}>
          Notifications are blocked. Enable them in your browser settings, then reload.
        </div>
      )}

      {status.kind === "available" && (
        <button
          type="button"
          onClick={enable}
          disabled={busy || !vapidKey}
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            border: "1px solid var(--accent)",
            background: "var(--accent)",
            color: "var(--bg-0)",
            fontWeight: 600,
            cursor: busy || !vapidKey ? "wait" : "pointer",
            minHeight: 44,
            opacity: !vapidKey ? 0.6 : 1,
          }}
        >
          {busy ? "Enabling…" : !vapidKey ? "VAPID key missing" : "Enable push notifications"}
        </button>
      )}

      {status.kind === "subscribed" && (
        <div style={{ color: "var(--accent-2)", fontWeight: 600 }}>
          ✓ Push enabled on this device
        </div>
      )}

      {status.kind === "error" && (
        <div style={{ color: "#c4453d", lineHeight: 1.5 }}>
          Couldn&apos;t enable push: {status.message}
        </div>
      )}
    </div>
  );
}

export default PushSubscribe;
