"use client";
import type { TimelineSource } from "./views/TimelineView";

const SOURCES: { id: TimelineSource | "all"; label: string }[] = [
  { id: "all", label: "ALL" },
  { id: "ship", label: "SHIPS" },
  { id: "queue", label: "QUEUE" },
  { id: "agent_run", label: "AGENTS" },
  { id: "decision", label: "DECISIONS" },
  { id: "telegram", label: "TELEGRAM" },
  { id: "capture", label: "CAPTURE" },
];

type Props = {
  selected: Set<TimelineSource>;
  counts: Partial<Record<TimelineSource | "total", number>>;
  onToggle: (id: TimelineSource | "all") => void;
};

export function TimelineFilters({ selected, counts, onToggle }: Props) {
  const allActive = selected.size === 0;
  return (
    <div className="timeline-filters" role="group" aria-label="Timeline source filters">
      {SOURCES.map((s) => {
        const active = s.id === "all" ? allActive : selected.has(s.id as TimelineSource);
        const count = s.id === "all" ? counts.total ?? 0 : counts[s.id as TimelineSource] ?? 0;
        return (
          <button
            key={s.id}
            type="button"
            className={`timeline-filter-pill source-${s.id}${active ? " active" : ""}`}
            aria-pressed={active}
            onClick={() => onToggle(s.id)}
          >
            <span className="timeline-filter-label">{s.label}</span>
            <span className="timeline-filter-count">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
