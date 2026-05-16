"use client";
import type { BrainEntry, Route } from "@/lib/brain/types";

interface Props {
  entry: BrainEntry;
  onClick: () => void;
}

const ROUTE_LABEL: Record<Route, string> = {
  second_brain: "FILED",
  queue: "QUEUE",
  kill: "KILLED",
};

const QUALITY_GLYPH: Record<string, string> = {
  verified: "●",
  unverified: "◐",
  hype: "○",
};

export function BrainEntryCard({ entry, onClick }: Props) {
  const fm = entry.frontmatter;
  const route = (fm.route as Route) ?? "second_brain";
  const score = typeof fm.score === "number" ? fm.score : null;
  const tags = (fm.tags ?? []).slice(0, 5);

  return (
    <button
      className={`brain-card brain-card-route-${route}`}
      onClick={onClick}
      data-file-type={entry.fileType}
      type="button"
    >
      <div className="brain-card-head">
        <div className="brain-card-title">{entry.title}</div>
        {score !== null && (
          <div
            className="brain-card-score"
            data-tier={score >= 14 ? "high" : score >= 10 ? "mid" : "low"}
          >
            {score}
            <span className="brain-card-score-suffix">/20</span>
          </div>
        )}
      </div>
      <div className="brain-card-meta">
        <span className={`brain-route-badge brain-route-${route}`}>
          {ROUTE_LABEL[route]}
        </span>
        <span className="brain-file-type">{entry.fileType}</span>
        {fm.source_quality && (
          <span
            className={`brain-quality brain-quality-${fm.source_quality}`}
            title={`source quality: ${fm.source_quality}`}
          >
            {QUALITY_GLYPH[fm.source_quality]} {fm.source_quality}
          </span>
        )}
        {fm.tags?.includes("seedling") && (
          <span className="brain-seedling-pill">seedling</span>
        )}
      </div>
      {tags.length > 0 && (
        <div className="brain-card-tags">
          {tags.map((t) => (
            <span key={t} className="brain-tag-chip">
              #{t}
            </span>
          ))}
          {(fm.tags?.length ?? 0) > tags.length && (
            <span className="brain-tag-more">
              +{(fm.tags?.length ?? 0) - tags.length}
            </span>
          )}
        </div>
      )}
    </button>
  );
}
