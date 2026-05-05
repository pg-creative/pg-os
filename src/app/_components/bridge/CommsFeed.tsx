"use client";

/**
 * CommsFeed — Bridge mode's center column.
 *
 * Unified chronological feed:
 *   - chat (you ↔ co-pilot, streamed via /api/copilot/chat)
 *   - agent_run / ship / capture / decision / telegram (from /api/timeline)
 *   - pending approvals (from /api/claude/proposals)
 *
 * Items sort by timestamp ascending — oldest at top, newest at bottom.
 * Chat input lives at the bottom; new turns + new activity scroll into view.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type ActivityRow = {
  source: string;
  id: string;
  timestamp: string;
  title: string;
  summary?: string;
  agent?: string;
  status?: string;
  cost_usd?: number | null;
};

type Proposal = {
  description: string;
  category?: string;
  type?: string;
  occurrences?: number;
  source?: string;
  __index?: number; // injected so approve/dismiss know which slot
};

type ChatItem = { kind: "chat"; ts: number; msg: CopilotMsg };
type ActivityItem = { kind: "activity"; ts: number; row: ActivityRow };
type ApprovalItem = { kind: "approval"; ts: number; proposal: Proposal };
type FeedItem = ChatItem | ActivityItem | ApprovalItem;

const STORAGE_KEY = "pg-os-comms-history-v1";
const HISTORY_KEY = "pg-os-comms-history-canonical-v1";
const CHAT_TS_KEY = "pg-os-comms-ts-v1"; // map id→ts so persisted chat keeps chronological position
const MAX_PERSISTED = 60;
const ACTIVITY_LIMIT = 30;

function nanoid() {
  return Math.random().toString(36).slice(2, 10);
}

export function CommsFeed() {
  const [messages, setMessages] = useState<CopilotMsg[]>([]);
  const [chatTs, setChatTs] = useState<Record<string, number>>({});
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState<number | null>(null);
  const historyRef = useRef<MessageParam[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Boot — restore chat from localStorage ─────────────────────────────────
  useEffect(() => {
    try {
      const rawMsgs = localStorage.getItem(STORAGE_KEY);
      if (rawMsgs) setMessages(JSON.parse(rawMsgs) as CopilotMsg[]);
      const rawHistory = localStorage.getItem(HISTORY_KEY);
      if (rawHistory) historyRef.current = JSON.parse(rawHistory) as MessageParam[];
      const rawTs = localStorage.getItem(CHAT_TS_KEY);
      if (rawTs) setChatTs(JSON.parse(rawTs) as Record<string, number>);
    } catch {
      /* ignore corrupted history */
    }
  }, []);

  // Persist chat on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_PERSISTED)));
    } catch { /* ignore */ }
  }, [messages]);

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_TS_KEY, JSON.stringify(chatTs));
    } catch { /* ignore */ }
  }, [chatTs]);

  // ── Initial fetch + SSE subscription for activity + proposals ─────────────
  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch(`/api/timeline?days=2`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const rows: ActivityRow[] = Array.isArray(data.rows) ? data.rows : data.events ?? [];
      setActivity(rows.slice(-ACTIVITY_LIMIT));
    } catch { /* ignore */ }
  }, []);

  const fetchProposals = useCallback(async () => {
    try {
      const res = await fetch(`/api/claude/proposals`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const list = (data.proposals ?? []) as Proposal[];
      setProposals(list.map((p, i) => ({ ...p, __index: i })));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchActivity();
    fetchProposals();

    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/timeline/events");
      es.addEventListener("refresh", () => {
        fetchActivity();
        fetchProposals();
      });
      es.onerror = () => { /* will reconnect automatically */ };
    } catch { /* SSE unavailable */ }

    const i = setInterval(() => {
      fetchActivity();
      fetchProposals();
    }, 60_000);
    return () => {
      clearInterval(i);
      es?.close();
    };
  }, [fetchActivity, fetchProposals]);

  // Auto-scroll to bottom on new content
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activity, proposals]);

  const persistHistory = useCallback(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(historyRef.current.slice(-MAX_PERSISTED)));
    } catch { /* ignore */ }
  }, []);

  const handleClear = useCallback(() => {
    setMessages([]);
    historyRef.current = [];
    setInput("");
    setChatTs({});
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(HISTORY_KEY);
      localStorage.removeItem(CHAT_TS_KEY);
    } catch { /* ignore */ }
  }, []);

  const decide = useCallback(async (index: number, action: "approve" | "dismiss") => {
    setActing(index);
    try {
      await fetch("/api/claude/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, index }),
      });
      await fetchProposals();
    } finally {
      setActing(null);
    }
  }, [fetchProposals]);

  const handleSubmit = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setLoading(true);

    const userId = nanoid();
    const userTs = Date.now();
    const userMsg: CopilotMsg = { id: userId, role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setChatTs((prev) => ({ ...prev, [userId]: userTs }));
    historyRef.current = [...historyRef.current, { role: "user", content: text }];

    const assistantId = nanoid();
    const assistantTs = Date.now();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", text: "", streaming: true, toolCalls: [] },
    ]);
    setChatTs((prev) => ({ ...prev, [assistantId]: assistantTs }));

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
                  prev.map((m) => (m.id === assistantId ? { ...m, toolCalls: [...toolCalls] } : m)),
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
                    prev.map((m) => (m.id === assistantId ? { ...m, toolCalls: [...toolCalls] } : m)),
                  );
                }
              }
              break;
            case "done":
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, text: assembled, streaming: false } : m)),
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
        historyRef.current = [...historyRef.current, { role: "assistant", content: assembled }];
        persistHistory();
      }
      // Refresh activity in case the chat emitted a tool that wrote a ship/queue item.
      fetchActivity();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Request failed";
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, streaming: false, error: errMsg } : m)),
      );
    } finally {
      setLoading(false);
    }
  }, [input, loading, persistHistory, fetchActivity]);

  // ── Build unified feed ────────────────────────────────────────────────────
  const feed: FeedItem[] = useMemo(() => {
    const items: FeedItem[] = [];
    for (const m of messages) {
      const ts = chatTs[m.id] ?? 0;
      items.push({ kind: "chat", ts: ts || 0, msg: m });
    }
    for (const r of activity) {
      const ts = new Date(r.timestamp).getTime();
      if (Number.isFinite(ts)) items.push({ kind: "activity", ts, row: r });
    }
    // Approvals always sort to "now" so they pin to the bottom — actionable.
    for (const p of proposals) {
      items.push({ kind: "approval", ts: Date.now(), proposal: p });
    }
    items.sort((a, b) => a.ts - b.ts);
    return items;
  }, [messages, chatTs, activity, proposals]);

  const isEmpty = feed.length === 0;
  const headerMeta = isEmpty
    ? "ready"
    : `${activity.length} events · ${proposals.length} pending`;

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
            headerMeta
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
              Chat with the co-pilot, and you&apos;ll also see agent runs,
              approvals, and activity from across PG OS interleave here.
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
          feed.map((item, i) => {
            if (item.kind === "chat") {
              return <CopilotMessage key={`c-${item.msg.id}`} msg={item.msg} />;
            }
            if (item.kind === "approval") {
              return (
                <ApprovalCard
                  key={`a-${item.proposal.__index ?? i}`}
                  proposal={item.proposal}
                  acting={acting === item.proposal.__index}
                  onDecide={(action) => decide(item.proposal.__index ?? 0, action)}
                />
              );
            }
            return <ActivityCard key={`act-${item.row.id}`} row={item.row} />;
          })
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

// ── Activity card (agent run / ship / capture / decision / telegram) ────────

function ActivityCard({ row }: { row: ActivityRow }) {
  const sourceLabel = row.source.replace(/_/g, " ");
  const tag = row.agent ?? row.status ?? sourceLabel;
  const time = new Date(row.timestamp).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return (
    <article className={`comms-card comms-card-${row.source}`} aria-label={sourceLabel}>
      <header className="comms-card-head">
        <span className="comms-card-tag">{sourceLabel}</span>
        {tag && tag !== sourceLabel && (
          <span className="comms-card-meta">{tag}</span>
        )}
        <span className="comms-card-time">{time}</span>
      </header>
      <p className="comms-card-title">{row.title}</p>
      {row.summary && <p className="comms-card-summary">{row.summary}</p>}
    </article>
  );
}

// ── Approval card ───────────────────────────────────────────────────────────

function ApprovalCard({
  proposal,
  acting,
  onDecide,
}: {
  proposal: Proposal;
  acting: boolean;
  onDecide: (action: "approve" | "dismiss") => void;
}) {
  return (
    <article className="comms-card comms-card-approval" aria-label="Pending approval">
      <header className="comms-card-head">
        <span className="comms-card-tag">approval</span>
        {proposal.category && (
          <span className="comms-card-meta">{proposal.category}</span>
        )}
        {proposal.occurrences && (
          <span className="comms-card-meta">×{proposal.occurrences}</span>
        )}
      </header>
      <p className="comms-card-title">{proposal.description}</p>
      <div className="comms-card-actions">
        <button
          type="button"
          className="bridge-btn bridge-btn-approve"
          onClick={() => onDecide("approve")}
          disabled={acting}
        >
          {acting ? "…" : "Approve"}
        </button>
        <button
          type="button"
          className="bridge-btn bridge-btn-dismiss"
          onClick={() => onDecide("dismiss")}
          disabled={acting}
        >
          Skip
        </button>
      </div>
    </article>
  );
}
