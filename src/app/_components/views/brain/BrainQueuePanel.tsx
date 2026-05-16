"use client";
import { useState } from "react";
import type { BrainEntry } from "@/lib/brain/types";

interface Props {
  entries: BrainEntry[];
  onSelect: (entry: BrainEntry) => void;
  onMutate: (
    slug: string,
    patch: { status?: string; route?: string },
  ) => Promise<void>;
}

export function BrainQueuePanel({ entries, onSelect, onMutate }: Props) {
  const [busy, setBusy] = useState<string | null>(null);

  // Surface: queue-routed entries OR queue-folder entries, top 5 by score
  const queueEntries = entries
    .filter(
      (e) =>
        e.fileType === "queue" ||
        e.frontmatter.route === "queue" ||
        e.frontmatter.tags?.includes("seedling"),
    )
    .sort((a, b) => (b.frontmatter.score ?? 0) - (a.frontmatter.score ?? 0))
    .slice(0, 5);

  const handleAction = async (
    slug: string,
    action: "throw" | "defer" | "archive",
  ) => {
    setBusy(slug);
    try {
      const patch =
        action === "throw"
          ? { status: "active", route: "queue" }
          : action === "defer"
            ? { status: "active" }
            : { status: "archived" };
      await onMutate(slug, patch);
    } finally {
      setBusy(null);
    }
  };

  if (queueEntries.length === 0) {
    return (
      <div className="brain-queue-panel">
        <div className="brain-queue-head">
          <span className="brain-queue-glyph">🎯</span> Throw next
        </div>
        <div className="brain-queue-empty">
          Nothing queued. Run /sweep-inbox or drop something into Notion.
        </div>
      </div>
    );
  }

  return (
    <div className="brain-queue-panel">
      <div className="brain-queue-head">
        <span className="brain-queue-glyph">🎯</span> Throw next
        <span className="brain-queue-count">{queueEntries.length}</span>
      </div>
      <div className="brain-queue-list">
        {queueEntries.map((e) => (
          <div key={e.slug} className="brain-queue-item">
            <button
              type="button"
              className="brain-queue-title"
              onClick={() => onSelect(e)}
            >
              <div className="brain-queue-score">
                {e.frontmatter.score ?? "?"}
              </div>
              <div className="brain-queue-text">{e.title}</div>
            </button>
            <div className="brain-queue-actions">
              <button
                type="button"
                disabled={busy === e.slug}
                onClick={() => handleAction(e.slug, "throw")}
                title="Mark as actively in progress"
              >
                Throw
              </button>
              <button
                type="button"
                disabled={busy === e.slug}
                onClick={() => handleAction(e.slug, "defer")}
                title="Keep in queue, revisit later"
              >
                Defer
              </button>
              <button
                type="button"
                disabled={busy === e.slug}
                onClick={() => handleAction(e.slug, "archive")}
                title="No longer relevant"
              >
                Archive
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
