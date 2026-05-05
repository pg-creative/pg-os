"use client";

/**
 * CommsFeed — Bridge mode's center column.
 * Stage 3a: persistent inline chat (replaces empty placeholder).
 * Stages 3b/3c: merge agent runs + approvals into the same chronological feed.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import { CopilotMessage, CopilotMsg, ToolCallEvent } from "../Copilot/CopilotMessage";
import { CopilotInput } from "../Copilot/CopilotInput";

interface SSEEvent {
  type: string;
  delta?: string;
  name?: string;
  input?: unknown;
  ok?: boolean;
  error?: string;
}

const STORAGE_KEY = "pg-os-comms-history-v1";
const HISTORY_KEY = "pg-os-comms-history-canonical-v1";
const MAX_PERSISTED = 60;

function nanoid() {
  return Math.random().toString(36).slice(2, 10);
}

export function CommsFeed() {
  const [messages, setMessages] = useState<CopilotMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const historyRef = useRef<MessageParam[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Boot — restore persisted history.
  useEffect(() => {
    try {
      const rawMsgs = localStorage.getItem(STORAGE_KEY);
      if (rawMsgs) {
        const parsed = JSON.parse(rawMsgs) as CopilotMsg[];
        setMessages(parsed);
      }
      const rawHistory = localStorage.getItem(HISTORY_KEY);
      if (rawHistory) {
        historyRef.current = JSON.parse(rawHistory) as MessageParam[];
      }
    } catch {
      /* ignore corrupted history */
    }
  }, []);

  // Persist messages on change (cap to MAX_PERSISTED to keep payload small).
  useEffect(() => {
    try {
      const trimmed = messages.slice(-MAX_PERSISTED);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      /* quota or serialization failure — silently drop */
    }
  }, [messages]);

  // Auto-scroll to bottom on new content.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const persistHistory = useCallback(() => {
    try {
      const trimmed = historyRef.current.slice(-MAX_PERSISTED);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
    } catch {
      /* ignore */
    }
  }, []);

  const handleClear = useCallback(() => {
    setMessages([]);
    historyRef.current = [];
    setInput("");
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setLoading(true);

    const userMsg: CopilotMsg = { id: nanoid(), role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    historyRef.current = [
      ...historyRef.current,
      { role: "user", content: text },
    ];

    const assistantId = nanoid();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", text: "", streaming: true, toolCalls: [] },
    ]);

    try {
      const res = await fetch("/api/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: historyRef.current }),
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assembled = "";
      const toolCalls: ToolCallEvent[] = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;
          let event: SSEEvent;
          try { event = JSON.parse(jsonStr) as SSEEvent; } catch { continue; }

          switch (event.type) {
            case "text":
              if (event.delta) {
                assembled += event.delta;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, text: assembled, streaming: true } : m,
                  ),
                );
              }
              break;
            case "tool_start":
              if (event.name) {
                toolCalls.push({ name: event.name });
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, toolCalls: [...toolCalls] } : m,
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
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId ? { ...m, toolCalls: [...toolCalls] } : m,
                    ),
                  );
                }
              }
              break;
            case "done":
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, text: assembled, streaming: false } : m,
                ),
              );
              break;
            case "error":
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, streaming: false, error: event.error ?? "Unknown error" }
                    : m,
                ),
              );
              break;
          }
        }
      }

      if (assembled) {
        historyRef.current = [
          ...historyRef.current,
          { role: "assistant", content: assembled },
        ];
        persistHistory();
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Request failed";
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, streaming: false, error: errMsg } : m)),
      );
    } finally {
      setLoading(false);
    }
  }, [input, loading, persistHistory]);

  const isEmpty = messages.length === 0;

  return (
    <section className="bridge-comms" aria-label="Comms feed">
      <div className="bridge-rail-header">
        <span className="bridge-rail-title">COMMS</span>
        <span className="bridge-rail-meta">
          {messages.length > 0 ? (
            <button
              type="button"
              className="bridge-comms-clear"
              onClick={handleClear}
              aria-label="Clear conversation"
            >
              CLEAR
            </button>
          ) : (
            "ready"
          )}
        </span>
      </div>

      <div
        ref={scrollRef}
        className={`bridge-comms-feed${isEmpty ? " bridge-comms-empty" : ""}`}
        aria-live="polite"
        aria-atomic="false"
      >
        {isEmpty ? (
          <div className="bridge-empty-block">
            <p className="bridge-empty-heading">Comms link standing by.</p>
            <p className="bridge-empty-hint">
              Ask anything about your day, your queue, your recovery, or what to
              ship next. Replies stream in below.
            </p>
            <div className="bridge-empty-suggestions">
              {[
                "What should I work on for the next 90 minutes?",
                "What's pending in my queue?",
                "How's my recovery today?",
                "Log a ship for me",
              ].map((s) => (
                <button
                  key={s}
                  type="button"
                  className="bridge-empty-suggestion"
                  onClick={() => setInput(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => <CopilotMessage key={msg.id} msg={msg} />)
        )}
      </div>

      <div className="bridge-comms-input">
        <CopilotInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          disabled={loading}
        />
      </div>
    </section>
  );
}
