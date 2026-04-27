"use client";

/**
 * CopilotPanel.tsx — Slide-in side panel for the AI co-pilot.
 * ⌘J toggles open/close. ESC closes. Backdrop click closes.
 * Focus-trapped when open. 420px wide, full height, slides from right.
 */

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  useId,
} from "react";
import { CopilotMessage, CopilotMsg, ToolCallEvent } from "./CopilotMessage";
import { CopilotInput } from "./CopilotInput";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";

// ── SSE event types from the server ──────────────────────────────────────────

interface SSEEvent {
  type: string;
  delta?: string;
  name?: string;
  input?: unknown;
  ok?: boolean;
  error?: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    cache_read: number;
    cache_creation: number;
  };
}

// ── Panel component ───────────────────────────────────────────────────────────

interface CopilotPanelProps {
  open: boolean;
  onClose: () => void;
}

function nanoid() {
  return Math.random().toString(36).slice(2, 10);
}

export function CopilotPanel({ open, onClose }: CopilotPanelProps) {
  const [messages, setMessages] = useState<CopilotMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  // Canonical message history sent to the API (grows with each turn)
  const historyRef = useRef<MessageParam[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const inputAreaRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // ── Auto-scroll to bottom ─────────────────────────────────────────────────
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // ── Focus management ──────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      returnFocusRef.current = document.activeElement as HTMLElement;
      // Focus first focusable in panel
      const el = panelRef.current?.querySelector<HTMLElement>(
        'button:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      el?.focus();
    } else {
      returnFocusRef.current?.focus?.();
    }
  }, [open]);

  // ── Keyboard: ESC closes, Tab traps focus ─────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const root = panelRef.current;
      if (!root) return;
      const focusables = root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [open, onClose]);

  // ── ⌘J global toggle — registered by parent (CopilotLauncher) ────────────
  // (The parent page.tsx registers ⌘J and passes open/onClose props)

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setLoading(true);

    // Add user message to display
    const userMsgId = nanoid();
    const userMsg: CopilotMsg = {
      id: userMsgId,
      role: "user",
      text,
    };
    setMessages((prev) => [...prev, userMsg]);

    // Update canonical history
    historyRef.current = [
      ...historyRef.current,
      { role: "user", content: text },
    ];

    // Add streaming assistant placeholder
    const assistantMsgId = nanoid();
    const placeholder: CopilotMsg = {
      id: assistantMsgId,
      role: "assistant",
      text: "",
      streaming: true,
      toolCalls: [],
    };
    setMessages((prev) => [...prev, placeholder]);

    try {
      const res = await fetch("/api/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: historyRef.current }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assembledText = "";
      const toolCalls: ToolCallEvent[] = [];
      // Track pending tool calls (started but not yet completed)
      const pendingTools = new Map<string, ToolCallEvent>();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse SSE lines
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;
          let event: SSEEvent;
          try {
            event = JSON.parse(jsonStr) as SSEEvent;
          } catch {
            continue;
          }

          switch (event.type) {
            case "text":
              if (event.delta) {
                assembledText += event.delta;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? { ...m, text: assembledText, streaming: true }
                      : m,
                  ),
                );
              }
              break;

            case "tool_start":
              if (event.name) {
                const pending: ToolCallEvent = { name: event.name };
                pendingTools.set(event.name, pending);
                toolCalls.push(pending);
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? { ...m, toolCalls: [...toolCalls] }
                      : m,
                  ),
                );
              }
              break;

            case "tool_result":
              if (event.name) {
                const tc = toolCalls.find((t) => t.name === event.name);
                if (tc) {
                  tc.ok = event.ok ?? true;
                  tc.error = event.error;
                  pendingTools.delete(event.name);
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId
                        ? { ...m, toolCalls: [...toolCalls] }
                        : m,
                    ),
                  );
                }
              }
              break;

            case "done":
              // Final update — stop streaming cursor
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, text: assembledText, streaming: false }
                    : m,
                ),
              );
              break;

            case "error":
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        streaming: false,
                        error: event.error ?? "Unknown error",
                      }
                    : m,
                ),
              );
              break;
          }
        }
      }

      // Append assistant reply to canonical history
      if (assembledText) {
        historyRef.current = [
          ...historyRef.current,
          { role: "assistant", content: assembledText },
        ];
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Request failed";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? { ...m, streaming: false, error: errMsg }
            : m,
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [input, loading]);

  const handleClear = useCallback(() => {
    setMessages([]);
    historyRef.current = [];
    setInput("");
  }, []);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="cp-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        ref={panelRef}
        className={`cp-panel${open ? " cp-panel-open" : ""}`}
        role="complementary"
        aria-labelledby={titleId}
        aria-label="AI Co-pilot"
      >
        {/* Header */}
        <div className="cp-header">
          <div className="cp-header-left">
            <span className="cp-header-icon" aria-hidden="true">⬡</span>
            <h2 className="cp-title" id={titleId}>CO-PILOT</h2>
          </div>
          <div className="cp-header-actions">
            {messages.length > 0 && (
              <button
                type="button"
                className="cp-clear-btn"
                onClick={handleClear}
                aria-label="Clear conversation"
              >
                CLEAR
              </button>
            )}
            <button
              type="button"
              className="cp-close-btn"
              onClick={onClose}
              aria-label="Close co-pilot panel"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Message list */}
        <div className="cp-messages" ref={scrollRef} aria-live="polite" aria-atomic="false">
          {messages.length === 0 && (
            <div className="cp-empty">
              <p className="cp-empty-heading">What&apos;s next?</p>
              <p className="cp-empty-hint">
                Ask about your calendar, recovery, queue depth, or what to work on next.
              </p>
              <div className="cp-suggestions">
                {[
                  "What should I do for the next 90 minutes?",
                  "How's my recovery today?",
                  "What's in my queue?",
                  "Log a ship for me",
                ].map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="cp-suggestion"
                    onClick={() => {
                      setInput(s);
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <CopilotMessage key={msg.id} msg={msg} />
          ))}
        </div>

        {/* Input */}
        <div className="cp-input-area" ref={inputAreaRef}>
          <CopilotInput
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            disabled={loading}
          />
          <p className="cp-footer-hint">
            ⌘J to toggle · ESC to close · ⌘↩ to send
          </p>
        </div>
      </aside>
    </>
  );
}

// ── Launcher: handles ⌘J globally and renders the panel ──────────────────────

export function CopilotLauncher() {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => setOpen(false), []);

  // ⌘J global keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "j" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggle]);

  return <CopilotPanel open={open} onClose={close} />;
}
