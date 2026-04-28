"use client";
import { useEffect, useMemo, useState } from "react";

type ActivityNode = {
  kind: "agent_run" | "queue_item" | "decision" | "telegram_event";
  id: string;
  timestamp: string;
  title: string;
  agent?: string;
  status?: string;
  summary?: string;
  body_md?: string;
  source?: string;
  decision?: string | null;
  decided_at?: string | null;
  decided_via?: string | null;
  options?: string[];
  cost_usd?: number | null;
  model?: string | null;
  notion_url?: string | null;
  related_telegram_event_ids?: number[];
};

type TelegramEvent = {
  id: number;
  direction: "in" | "out";
  kind: string;
  ref_kind?: string | null;
  ref_id?: string | null;
  payload?: { text?: string; body?: string; reply_markup?: unknown } | null;
  created_at: string;
};

type ActivityResponse = {
  days: number;
  counts: { runs: number; queue: number; decisions: number; telegram: number };
  nodes: ActivityNode[];
  telegram_events_by_id: Record<number, TelegramEvent>;
};

const KIND_ICON: Record<ActivityNode["kind"], string> = {
  agent_run: "◆",
  queue_item: "◯",
  decision: "✓",
  telegram_event: "↯",
};

const KIND_LABEL: Record<ActivityNode["kind"], string> = {
  agent_run: "AGENT",
  queue_item: "QUEUE",
  decision: "DECISION",
  telegram_event: "TELEGRAM",
};

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  return `${d}d`;
}

function formatTime(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatDate(ts: string): string {
  return new Date(ts).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function ClaudeActivity() {
  const [data, setData] = useState<ActivityResponse | null>(null);
  const [filter, setFilter] = useState<"all" | "agent_run" | "queue_item" | "decision" | "telegram_event">("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/claude/activity?days=${days}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setLoading(false);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setError(e.message);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days]);

  const filteredNodes = useMemo(() => {
    if (!data) return [];
    if (filter === "all") return data.nodes;
    return data.nodes.filter((n) => n.kind === filter);
  }, [data, filter]);

  const groupedByDay = useMemo(() => {
    const map = new Map<string, ActivityNode[]>();
    for (const n of filteredNodes) {
      const day = n.timestamp.slice(0, 10);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(n);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredNodes]);

  function toggle(nodeId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }

  return (
    <section id="cl-activity" className="cl-section cl-activity">
      <div className="cl-section-header">
        <h2 className="cl-section-title">Activity Stream</h2>
        <div className="cl-section-sub">
          {loading
            ? "Loading…"
            : error
            ? `Error: ${error}`
            : data
            ? `${data.counts.runs} runs · ${data.counts.queue} queue · ${data.counts.decisions} decisions · ${data.counts.telegram} telegram (${days}d)`
            : "—"}
        </div>
      </div>

      <div className="cl-activity-controls">
        <div className="cl-activity-filters">
          {(["all", "agent_run", "queue_item", "decision", "telegram_event"] as const).map((k) => (
            <button
              key={k}
              className={`cl-activity-filter${filter === k ? " active" : ""}`}
              onClick={() => setFilter(k)}
            >
              {k === "all" ? "ALL" : KIND_LABEL[k]}
            </button>
          ))}
        </div>
        <div className="cl-activity-window">
          {[1, 3, 7, 14, 30].map((d) => (
            <button
              key={d}
              className={`cl-activity-window-pill${days === d ? " active" : ""}`}
              onClick={() => setDays(d)}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {!loading && filteredNodes.length === 0 && (
        <div className="cl-activity-empty">No activity in this window.</div>
      )}

      <div className="cl-activity-timeline">
        {groupedByDay.map(([day, nodes]) => (
          <div key={day} className="cl-activity-day">
            <div className="cl-activity-day-label">{formatDate(day + "T12:00:00")}</div>
            <div className="cl-activity-day-nodes">
              {nodes.map((node) => {
                const isOpen = expanded.has(node.id);
                const tgIds = node.related_telegram_event_ids ?? [];
                const tgThread = data
                  ? tgIds
                      .map((id) => data.telegram_events_by_id[id])
                      .filter(Boolean)
                      .sort((a, b) => a.created_at.localeCompare(b.created_at))
                  : [];
                return (
                  <div
                    key={node.id}
                    className={`cl-activity-node cl-activity-${node.kind}${isOpen ? " expanded" : ""}`}
                  >
                    <button
                      className="cl-activity-node-head"
                      onClick={() => toggle(node.id)}
                      aria-expanded={isOpen}
                    >
                      <span className="cl-activity-node-icon" aria-hidden="true">
                        {KIND_ICON[node.kind]}
                      </span>
                      <span className="cl-activity-node-kind">{KIND_LABEL[node.kind]}</span>
                      <span className="cl-activity-node-title">{node.title}</span>
                      <span className="cl-activity-node-meta">
                        {node.agent && <span className="cl-activity-node-agent">{node.agent}</span>}
                        {node.decision && (
                          <span className={`cl-activity-node-decision cl-activity-decision-${node.decision}`}>
                            {node.decision}
                          </span>
                        )}
                        {node.cost_usd != null && (
                          <span className="cl-activity-node-cost">${Number(node.cost_usd).toFixed(2)}</span>
                        )}
                        <span className="cl-activity-node-time" title={node.timestamp}>
                          {formatTime(node.timestamp)} · {timeAgo(node.timestamp)} ago
                        </span>
                      </span>
                    </button>
                    {isOpen && (
                      <div className="cl-activity-node-body">
                        {node.summary && node.summary !== node.title && (
                          <div className="cl-activity-node-summary">{node.summary}</div>
                        )}
                        {node.body_md && (
                          <pre className="cl-activity-node-mdblock">{node.body_md.slice(0, 6000)}</pre>
                        )}
                        {node.options && node.options.length > 0 && (
                          <div className="cl-activity-node-options">
                            <span className="cl-activity-node-options-label">options:</span>
                            {node.options.map((o) => (
                              <span key={o} className="cl-activity-node-option-pill">
                                {o}
                              </span>
                            ))}
                          </div>
                        )}
                        {node.decided_at && (
                          <div className="cl-activity-node-decided">
                            decided <strong>{node.decision}</strong> via {node.decided_via ?? "?"} at{" "}
                            {new Date(node.decided_at).toLocaleString()}
                          </div>
                        )}
                        {tgThread.length > 0 && (
                          <div className="cl-activity-node-telegram">
                            <div className="cl-activity-node-telegram-label">telegram thread</div>
                            {tgThread.map((e) => (
                              <div
                                key={e.id}
                                className={`cl-activity-tg-msg cl-activity-tg-${e.direction}`}
                              >
                                <span className="cl-activity-tg-arrow">
                                  {e.direction === "in" ? "← " : "→ "}
                                </span>
                                <span className="cl-activity-tg-kind">{e.kind}</span>
                                <span className="cl-activity-tg-text">
                                  {(e.payload?.text ?? e.payload?.body ?? "(no body)").slice(0, 280)}
                                </span>
                                <span className="cl-activity-tg-time">{formatTime(e.created_at)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {node.notion_url && (
                          <div className="cl-activity-node-link">
                            <a href={node.notion_url} target="_blank" rel="noreferrer">
                              open in Notion (legacy mirror) ↗
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
