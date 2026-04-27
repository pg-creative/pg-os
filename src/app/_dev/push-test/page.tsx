"use client";

import { useState } from "react";
import PushSubscribe from "@/app/_components/PushSubscribe";

export default function PushTestPage() {
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<string>("");

  async function sendTest() {
    setBusy(true);
    setLast("");
    try {
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "PG OS test",
          body: "If you see this, web push is working end to end.",
          url: "/",
          tag: "pgos-test",
        }),
      });
      const json = await res.json();
      setLast(JSON.stringify(json, null, 2));
    } catch (err) {
      setLast(err instanceof Error ? err.message : "send_failed");
    } finally {
      setBusy(false);
    }
  }

  async function fireCron() {
    setBusy(true);
    setLast("");
    try {
      const res = await fetch("/api/cron/push-triggers", { method: "GET" });
      const json = await res.json();
      setLast(JSON.stringify(json, null, 2));
    } catch (err) {
      setLast(err instanceof Error ? err.message : "cron_failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      style={{
        padding: 24,
        maxWidth: 640,
        margin: "0 auto",
        color: "var(--fg)",
        fontSize: 14,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Push test</h1>
      <p style={{ opacity: 0.75, margin: 0, lineHeight: 1.5 }}>
        Dev page for Track A2. Subscribe this device, then fire a test push or
        run the cron handler manually.
      </p>

      <PushSubscribe />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={sendTest}
          disabled={busy}
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            border: "1px solid var(--accent-2)",
            background: "var(--accent-2)",
            color: "var(--bg-0)",
            fontWeight: 600,
            cursor: busy ? "wait" : "pointer",
            minHeight: 44,
          }}
        >
          {busy ? "…" : "Send test push"}
        </button>
        <button
          type="button"
          onClick={fireCron}
          disabled={busy}
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            border: "1px solid var(--accent)",
            background: "transparent",
            color: "var(--accent)",
            fontWeight: 600,
            cursor: busy ? "wait" : "pointer",
            minHeight: 44,
          }}
        >
          Run cron triggers
        </button>
      </div>

      {last && (
        <pre
          style={{
            background: "var(--bg-2)",
            padding: 12,
            borderRadius: 8,
            fontSize: 12,
            overflow: "auto",
            maxHeight: 320,
            margin: 0,
          }}
        >
          {last}
        </pre>
      )}
    </main>
  );
}
