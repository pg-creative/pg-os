"use client";
import { useState } from "react";
import type { TimelineRow as TimelineRowData } from "./views/TimelineView";

const GLYPH: Record<TimelineRowData["source"], string> = {
  ship: "◆",
  queue: "◯",
  agent_run: "▲",
  decision: "✓",
  telegram: "↯",
  capture: "✱",
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

function absoluteTime(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type Props = {
  row: TimelineRowData;
  isNew?: boolean;
};

export function TimelineRow({ row, isNew }: Props) {
  const [expanded, setExpanded] = useState(false);
  const hasBody = !!(row.body_md || row.summary);

  return (
    <li
      className={`timeline-row source-${row.source}${expanded ? " expanded" : ""}${isNew ? " is-new" : ""}`}
      role="article"
      aria-expanded={expanded}
    >
      <button
        type="button"
        className="timeline-row-head"
        onClick={() => hasBody && setExpanded((v) => !v)}
        aria-label={`${row.title} — ${absoluteTime(row.timestamp)}`}
      >
        <span className="timeline-row-glyph" aria-hidden="true">
          {GLYPH[row.source]}
        </span>
        <span className="timeline-row-time" title={absoluteTime(row.timestamp)}>
          {timeAgo(row.timestamp)}
        </span>
        <span className="timeline-row-title">{row.title}</span>
        {row.meta ? <span className="timeline-row-meta">{row.meta}</span> : null}
        {hasBody ? (
          <span className="timeline-row-chevron" aria-hidden="true">
            {expanded ? "−" : "+"}
          </span>
        ) : null}
      </button>

      {expanded && hasBody ? (
        <div className="timeline-row-body">
          {row.body_md ? (
            <pre className="timeline-row-bodytext">{row.body_md}</pre>
          ) : row.summary ? (
            <p className="timeline-row-bodytext">{row.summary}</p>
          ) : null}
          <div className="timeline-row-bodymeta">
            <span>{absoluteTime(row.timestamp)}</span>
            {row.agent ? <span>agent: {row.agent}</span> : null}
            {row.model ? <span>model: {row.model}</span> : null}
            {typeof row.cost_usd === "number" ? <span>cost: ${row.cost_usd.toFixed(4)}</span> : null}
            {row.href ? (
              <a className="timeline-row-link" href={row.href}>
                open →
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </li>
  );
}
