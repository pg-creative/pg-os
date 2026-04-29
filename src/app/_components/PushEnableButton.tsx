"use client";
/**
 * PushEnableButton — handles the full push subscription lifecycle.
 *
 * States:
 *  initial   → "Enable notifications"
 *  loading   → spinner
 *  granted   → "Notifications on ✓" + optional "Send test" button
 *  denied    → "Notifications blocked — enable in browser settings"
 *  unsupported → "Push not supported in this browser"
 */

import { useEffect, useState, useCallback } from "react";
import {
  subscribePush,
  getPermissionState,
  type PushPermissionState,
} from "@/lib/pushBrowser";

type Props = {
  /** Pass directly when available, or omit to have the component fetch from /api/push/subscribe. */
  vapidPublicKey?: string;
  onGranted?: () => void;
};

export function PushEnableButton({ vapidPublicKey: vapidProp, onGranted }: Props) {
  const [state, setState] = useState<PushPermissionState | "loading" | "checking">("checking");
  const [testStatus, setTestStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [vapidKey, setVapidKey] = useState<string | null>(vapidProp ?? null);

  // On mount: check current permission state + fetch VAPID key if not provided
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setState("unsupported");
      return;
    }
    setState(getPermissionState());

    if (!vapidProp) {
      fetch("/api/push/subscribe")
        .then((r) => r.json())
        .then((d: { vapid_public?: string }) => {
          if (d.vapid_public) setVapidKey(d.vapid_public);
        })
        .catch(() => {/* ignore — button will show unsupported */});
    }
  }, [vapidProp]);

  const handleEnable = useCallback(async () => {
    if (!vapidKey) {
      setState("unsupported");
      console.warn("[push] VAPID key not available");
      return;
    }
    setState("loading");
    const result = await subscribePush(vapidKey);
    if (result.ok) {
      setState("granted");
      onGranted?.();
    } else if (result.error === "permission_denied") {
      setState("denied");
    } else {
      // Treat unknown errors as unsupported (e.g. HTTP in non-standalone iOS)
      setState("unsupported");
      console.warn("[push] subscribe error:", result.error);
    }
  }, [vapidKey, onGranted]);

  const handleTest = useCallback(async () => {
    setTestStatus("sending");
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean };
      setTestStatus(data.ok ? "sent" : "error");
      setTimeout(() => setTestStatus("idle"), 3000);
    } catch {
      setTestStatus("error");
      setTimeout(() => setTestStatus("idle"), 3000);
    }
  }, []);

  if (state === "checking") return null;

  if (state === "unsupported") {
    return (
      <span className="push-btn push-btn--unsupported" aria-live="polite">
        Push not supported in this browser
      </span>
    );
  }

  if (state === "denied") {
    return (
      <span className="push-btn push-btn--denied" aria-live="polite">
        Notifications blocked — enable in browser settings
      </span>
    );
  }

  if (state === "loading") {
    return (
      <button className="push-btn push-btn--loading" disabled aria-label="Enabling notifications…">
        <span className="push-spinner" aria-hidden="true" />
        Enabling…
      </button>
    );
  }

  if (state === "granted") {
    return (
      <span className="push-btn-group" aria-live="polite">
        <span className="push-btn push-btn--granted">Notifications on ✓</span>
        <button
          className="push-btn push-btn--test"
          onClick={handleTest}
          disabled={testStatus === "sending"}
          aria-label="Send a test push notification"
        >
          {testStatus === "sending" ? "Sending…" : testStatus === "sent" ? "Sent ✓" : testStatus === "error" ? "Failed" : "Send test"}
        </button>
      </span>
    );
  }

  // default state
  return (
    <button className="push-btn push-btn--default" onClick={handleEnable}>
      Enable notifications
    </button>
  );
}
