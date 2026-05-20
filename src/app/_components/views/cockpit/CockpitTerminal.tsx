"use client";

/**
 * CockpitTerminal — the two-way control pane.
 *
 * Connects an xterm.js terminal over a raw WebSocket to the cockpit daemon,
 * which has node-pty attached to the session's tmux pane. Reading AND writing
 * the same pane that Ghostty (`tmux attach`) is also on — one PTY, two clients.
 *
 * Protocol (matches scripts/cockpit-daemon.mjs):
 *   in   {"t":"o","d":bytes}  output      |  {"t":"exit","code":n}
 *   out  {"t":"i","d":bytes}  input       |  {"t":"z","c":cols,"r":rows}  resize
 *
 * xterm touches window at import time → load it lazily inside useEffect so it
 * never runs during SSR. Only the (inert) CSS is statically imported.
 */

import { useEffect, useRef, useState } from "react";
import "@xterm/xterm/css/xterm.css";

export function CockpitTerminal({
  sessionId,
  wsBase,
  token,
}: {
  sessionId: string;
  wsBase: string; // ws://127.0.0.1:7790/terminal
  token: string;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<
    "connecting" | "open" | "closed" | "error"
  >("connecting");

  useEffect(() => {
    let disposed = false;
    let ws: WebSocket | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let term: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let fit: any = null;
    let resizeObs: ResizeObserver | null = null;
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;

    (async () => {
      const [{ Terminal }, { FitAddon }] = await Promise.all([
        import("@xterm/xterm"),
        import("@xterm/addon-fit"),
      ]);
      if (disposed || !hostRef.current) return;

      term = new Terminal({
        fontFamily:
          '"JetBrains Mono", "SF Mono", ui-monospace, Menlo, monospace',
        fontSize: 13,
        lineHeight: 1.2,
        cursorBlink: true,
        scrollback: 50000,
        allowProposedApi: true,
        theme: {
          background: "#13110D",
          foreground: "#EFE6D4",
          cursor: "#D6A367",
          selectionBackground: "rgba(214,163,103,0.35)",
        },
      });
      fit = new FitAddon();
      term.loadAddon(fit);
      term.open(hostRef.current);
      try {
        fit.fit();
      } catch {
        /* not yet measurable */
      }

      const { cols, rows } = term;
      const url = `${wsBase}?session=${encodeURIComponent(
        sessionId,
      )}&token=${encodeURIComponent(token)}&cols=${cols}&rows=${rows}`;
      ws = new WebSocket(url);

      ws.onopen = () => !disposed && setStatus("open");
      ws.onerror = () => !disposed && setStatus("error");
      ws.onclose = () => !disposed && setStatus("closed");
      ws.onmessage = (evt) => {
        let msg: { t?: string; d?: string; code?: number };
        try {
          msg = JSON.parse(evt.data);
        } catch {
          return;
        }
        if (msg.t === "o" && typeof msg.d === "string") term.write(msg.d);
        else if (msg.t === "exit")
          term.write(
            `\r\n\x1b[2m[session exited · code ${msg.code}]\x1b[0m\r\n`,
          );
      };

      // Browser → PTY: every keystroke/paste.
      term.onData((d: string) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ t: "i", d }));
        }
      });

      // Resize: debounce 300ms so scrollback doesn't fill with reflow debris.
      const sendResize = () => {
        try {
          fit.fit();
        } catch {
          return;
        }
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ t: "z", c: term.cols, r: term.rows }));
        }
      };
      resizeObs = new ResizeObserver(() => {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(sendResize, 300);
      });
      resizeObs.observe(hostRef.current);
    })();

    return () => {
      disposed = true;
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeObs?.disconnect();
      try {
        ws?.close();
      } catch {
        /* noop */
      }
      try {
        term?.dispose();
      } catch {
        /* noop */
      }
    };
  }, [sessionId, wsBase, token]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 10px",
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          fontSize: 10,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "#9C8B70",
          borderBottom: "1px solid rgba(214,163,103,0.16)",
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background:
              status === "open"
                ? "#7C9A6E"
                : status === "connecting"
                  ? "#D6A367"
                  : "#B8536F",
            boxShadow: status === "open" ? "0 0 6px #7C9A6E" : "none",
          }}
        />
        terminal · {status} · two-way
        <span style={{ flex: 1 }} />
        <span style={{ opacity: 0.6 }}>{sessionId.slice(0, 8)}</span>
      </div>
      <div ref={hostRef} style={{ flex: 1, minHeight: 280, padding: 6 }} />
    </div>
  );
}
