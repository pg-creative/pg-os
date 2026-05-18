"use client";
/**
 * UX VARIANT — TIMELINE FEED (FALSIFIER)
 * Reeder/Mastodon-style chronological scroll. Each entry a stacked card,
 * day-section dividers between dates, sticky filter bar at top.
 * Lowest-information-density of the 5 variants; tests whether familiarity
 * beats capability for PG's workflow.
 *
 * Research moves applied:
 * - Day-section header with quiet horizontal rule + left date label
 * - Left-margin tag-bar (4px wide vertical accent, color by primary tag)
 * - 2-line summary with right-aligned timestamp
 * - Read-state via opacity fade + checkmark after triage
 * - Sticky "12 new since last visit" pill at top
 */
import { useEffect, useMemo, useState } from "react";
import { useBrainEntries } from "../../../_components/views/brain/useBrainEntries";
import { useBrainMutations } from "../shared/Mutations";
import type { BrainEntry } from "@/lib/brain/types";

const LS_LAST_VISIT = "brain-lab.timeline.lastVisit";

function dayKey(ts: number) {
  return new Date(ts).toISOString().slice(0, 10);
}
function dayLabel(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  const yest = new Date(today);
  yest.setDate(yest.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function TimelineFeedVariant() {
  const { entries, loading, refresh, filter, setFilter } = useBrainEntries();
  const { busySlug, throwIt, defer, archive } = useBrainMutations(refresh);
  const [lastVisit, setLastVisit] = useState<number | null>(null);
  const [scrollNudgeDismissed, setScrollNudgeDismissed] = useState(false);
  const [triaged, setTriaged] = useState<Set<string>>(new Set());

  useEffect(() => {
    const v = localStorage.getItem(LS_LAST_VISIT);
    if (v) setLastVisit(parseInt(v, 10));
    // Stamp on unmount
    return () => {
      localStorage.setItem(LS_LAST_VISIT, String(Date.now()));
    };
  }, []);

  // Chronological — newest first
  const sorted = useMemo(
    () => [...entries].sort((a, b) => b.modifiedAt - a.modifiedAt),
    [entries],
  );

  // Apply text filter inline (the hook's filter applies sorts/filters
  // but we want chronological ordering, so we drop the hook's sort here)
  const filtered = useMemo(() => {
    const q = filter.query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.frontmatter.tags ?? []).some((t) => t.toLowerCase().includes(q)) ||
        e.body.toLowerCase().includes(q),
    );
  }, [sorted, filter.query]);

  // Group by day
  const groups = useMemo(() => {
    const out: { day: string; ts: number; entries: BrainEntry[] }[] = [];
    for (const e of filtered) {
      const k = dayKey(e.modifiedAt);
      const last = out[out.length - 1];
      if (last && last.day === k) last.entries.push(e);
      else out.push({ day: k, ts: e.modifiedAt, entries: [e] });
    }
    return out;
  }, [filtered]);

  const newSinceVisit = useMemo(() => {
    if (!lastVisit) return 0;
    return filtered.filter((e) => e.modifiedAt > lastVisit).length;
  }, [filtered, lastVisit]);

  const markTriaged = (slug: string) =>
    setTriaged((prev) => {
      const n = new Set(prev);
      n.add(slug);
      return n;
    });

  const tier = (s: number) => (s >= 14 ? "high" : s >= 10 ? "mid" : "low");

  const tagAccent = (tags: string[] | undefined) => {
    if (!tags || tags.length === 0) return "#9a958c";
    const t = tags[0];
    // Deterministic hue from tag name
    let h = 0;
    for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0;
    const hue = Math.abs(h) % 360;
    return `hsl(${hue}, 38%, 48%)`;
  };

  const scrollToTop = () => {
    document
      .querySelector(".ux-timeline-body")
      ?.scrollTo({ top: 0, behavior: "smooth" });
    setScrollNudgeDismissed(true);
  };

  return (
    <div
      className="ux-timeline"
      style={{
        height: "calc(100vh - 50px)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header className="ux-timeline-head">
        <input
          type="search"
          className="ux-timeline-search"
          placeholder="filter the feed…"
          value={filter.query}
          onChange={(e) => setFilter({ query: e.target.value })}
        />
        <div className="ux-timeline-meta">
          {filtered.length} entries · newest first
        </div>
      </header>

      {newSinceVisit > 0 && !scrollNudgeDismissed && (
        <button
          type="button"
          className="ux-timeline-new-pill"
          onClick={scrollToTop}
        >
          ↑ {newSinceVisit} new since last visit
        </button>
      )}

      <div className="ux-timeline-body">
        {loading && entries.length === 0 && (
          <div className="ux-timeline-empty">loading feed…</div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="ux-timeline-empty">nothing here yet.</div>
        )}
        {groups.map((g) => (
          <section key={g.day} className="ux-timeline-day">
            <header className="ux-timeline-day-head">
              <span className="ux-timeline-day-label">{dayLabel(g.ts)}</span>
              <span className="ux-timeline-day-rule" />
              <span className="ux-timeline-day-count">
                {g.entries.length}{" "}
                {g.entries.length === 1 ? "entry" : "entries"}
              </span>
            </header>
            <ul className="ux-timeline-list">
              {g.entries.map((e) => {
                const isNew = lastVisit && e.modifiedAt > lastVisit;
                const isTriaged = triaged.has(e.slug);
                const score = e.frontmatter.score ?? 0;
                return (
                  <li
                    key={e.slug}
                    className={`ux-timeline-card${isNew ? " is-new" : ""}${
                      isTriaged ? " is-triaged" : ""
                    }${busySlug === e.slug ? " busy" : ""}`}
                  >
                    <span
                      className="ux-timeline-card-bar"
                      style={{ background: tagAccent(e.frontmatter.tags) }}
                    />
                    <div className="ux-timeline-card-content">
                      <div className="ux-timeline-card-toprow">
                        <h3 className="ux-timeline-card-title">{e.title}</h3>
                        <time className="ux-timeline-card-time">
                          {new Date(e.modifiedAt).toLocaleTimeString(
                            undefined,
                            {
                              hour: "numeric",
                              minute: "2-digit",
                            },
                          )}
                        </time>
                      </div>
                      <p className="ux-timeline-card-summary">
                        {e.body.replace(/\s+/g, " ").slice(0, 180)}
                        {e.body.length > 180 ? "…" : ""}
                      </p>
                      <div className="ux-timeline-card-foot">
                        <span
                          className={`ux-timeline-card-score tier-${tier(score)}`}
                        >
                          {score || "—"}/20
                        </span>
                        <span className="ux-timeline-card-type">
                          {e.fileType}
                        </span>
                        <div className="ux-timeline-card-tags">
                          {(e.frontmatter.tags ?? []).slice(0, 4).map((t) => (
                            <span key={t}>#{t}</span>
                          ))}
                        </div>
                        <div className="ux-timeline-card-actions">
                          <button
                            type="button"
                            disabled={busySlug === e.slug}
                            onClick={() => {
                              throwIt(e.slug);
                              markTriaged(e.slug);
                            }}
                          >
                            throw
                          </button>
                          <button
                            type="button"
                            disabled={busySlug === e.slug}
                            onClick={() => {
                              defer(e.slug);
                              markTriaged(e.slug);
                            }}
                          >
                            defer
                          </button>
                          <button
                            type="button"
                            disabled={busySlug === e.slug}
                            onClick={() => {
                              archive(e.slug);
                              markTriaged(e.slug);
                            }}
                          >
                            archive
                          </button>
                          {isTriaged && (
                            <span className="ux-timeline-check">✓</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
