// SSE + POST adapter — Next.js replacement for upstream WebSocket layer.
// Same external interface as the original wsApi.ts so vscodeApi.ts +
// useExtensionMessages don't need to change.
//
// Server -> client: EventSource on /api/pixel-agents/events
// Client -> server: fetch POST to /api/pixel-agents/message

let es: EventSource | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

export function connectWebSocket(): void {
  if (typeof window === "undefined") return;
  es = new EventSource("/api/pixel-agents/events");

  es.onopen = () => {
    console.log("[pixel-agents] SSE connected");
    sendMessage({ type: "webviewReady" });
  };

  es.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      window.dispatchEvent(new MessageEvent("message", { data }));
    } catch (err) {
      console.warn("[pixel-agents] bad SSE payload", err);
    }
  };

  es.onerror = () => {
    es?.close();
    es = null;
    if (!reconnectTimer) {
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connectWebSocket();
      }, 2000);
    }
  };
}

export function sendMessage(msg: unknown): void {
  if (typeof window === "undefined") return;
  fetch("/api/pixel-agents/message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(msg),
  }).catch((err) => console.warn("[pixel-agents] sendMessage failed", err));
}

export function cleanup(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  es?.close();
  es = null;
}
