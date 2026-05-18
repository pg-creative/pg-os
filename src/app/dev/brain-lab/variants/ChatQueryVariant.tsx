"use client";
/**
 * UX VARIANT — CHAT QUERY
 * Perplexity-style search-first interface. Hero input centered, live fuzzy
 * filter as you type, results render as numbered citation cards beneath.
 * - Citation numbers (①②③) link result entries
 * - Follow-up chip buttons beneath results (related tags, common routes)
 * - v0: pure client-side fuzzy filter. v1 hook-point for LLM synthesis.
 * - Suggested prompts shown as empty-state seeds
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useBrainEntries } from "../../../_components/views/brain/useBrainEntries";
import { useBrainMutations } from "../shared/Mutations";
import type { BrainEntry } from "@/lib/brain/types";

const NUMERALS = [
  "①",
  "②",
  "③",
  "④",
  "⑤",
  "⑥",
  "⑦",
  "⑧",
  "⑨",
  "⑩",
  "⑪",
  "⑫",
  "⑬",
  "⑭",
  "⑮",
  "⑯",
  "⑰",
  "⑱",
  "⑲",
  "⑳",
];

function scoreMatch(entry: BrainEntry, q: string): number {
  if (!q) return 0;
  const lq = q.toLowerCase();
  const title = entry.title.toLowerCase();
  const tags = (entry.frontmatter.tags ?? []).map((t) => t.toLowerCase());
  const body = entry.body.toLowerCase();
  let s = 0;
  if (title.includes(lq)) s += 40;
  if (title.startsWith(lq)) s += 20;
  for (const t of tags) if (t.includes(lq)) s += 25;
  if (body.includes(lq)) s += 10;
  // Token overlap
  for (const tok of lq.split(/\s+/)) {
    if (tok.length < 2) continue;
    if (title.includes(tok)) s += 6;
    if (tags.some((t) => t.includes(tok))) s += 5;
    if (body.includes(tok)) s += 2;
  }
  return s;
}

const SUGGESTED_PROMPTS = [
  "agent loops",
  "context window",
  "skill design",
  "voice writing",
  "verified sources",
];

export function ChatQueryVariant() {
  const { entries, loading, refresh } = useBrainEntries();
  const { busySlug, throwIt, defer, archive } = useBrainMutations(refresh);
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = useMemo(() => {
    if (!q.trim()) return [];
    const scored = entries
      .map((e) => ({ e, s: scoreMatch(e, q) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 12);
    return scored;
  }, [q, entries]);

  // Follow-up tag chips: tags appearing in ≥2 results
  const followTags = useMemo(() => {
    const count = new Map<string, number>();
    for (const r of results) {
      for (const t of r.e.frontmatter.tags ?? []) {
        count.set(t, (count.get(t) ?? 0) + 1);
      }
    }
    return Array.from(count.entries())
      .filter(([, c]) => c >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([t]) => t);
  }, [results]);

  const toggleExpand = (slug: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });

  const tier = (s: number) => (s >= 14 ? "high" : s >= 10 ? "mid" : "low");

  return (
    <div className="ux-chat" style={{ minHeight: "calc(100vh - 50px)" }}>
      <div className="ux-chat-hero">
        <div className="ux-chat-eyebrow">BRAIN · QUERY</div>
        <h1 className="ux-chat-headline">What are you looking for in here?</h1>
        <div className="ux-chat-search-wrap">
          <span className="ux-chat-search-icon">⌕</span>
          <input
            ref={inputRef}
            type="search"
            className="ux-chat-search"
            placeholder="ask the brain — type a word, a tag, a fragment…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {q && (
            <button
              type="button"
              className="ux-chat-clear"
              onClick={() => setQ("")}
            >
              clear
            </button>
          )}
        </div>
        <div className="ux-chat-stats">
          {q ? (
            <span>
              {results.length} match{results.length === 1 ? "" : "es"} in{" "}
              {entries.length} entries
            </span>
          ) : (
            <span>{entries.length} entries indexed · type to filter</span>
          )}
        </div>
      </div>

      {!q && (
        <div className="ux-chat-suggestions">
          <div className="ux-chat-suggest-head">try a starter:</div>
          <div className="ux-chat-suggest-chips">
            {SUGGESTED_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                className="ux-chat-suggest-chip"
                onClick={() => setQ(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {q && followTags.length > 0 && (
        <div className="ux-chat-followups">
          <span className="ux-chat-followups-label">refine to tag:</span>
          {followTags.map((t) => (
            <button
              key={t}
              type="button"
              className="ux-chat-followup-chip"
              onClick={() => setQ(t)}
            >
              #{t}
            </button>
          ))}
        </div>
      )}

      <div className="ux-chat-results">
        {loading && entries.length === 0 && (
          <div className="ux-chat-empty">indexing…</div>
        )}
        {q && results.length === 0 && !loading && (
          <div className="ux-chat-empty">
            no matches. try a broader term or check a different tag.
          </div>
        )}
        {results.map(({ e, s }, idx) => {
          const isOpen = expanded.has(e.slug);
          const score = e.frontmatter.score ?? 0;
          return (
            <article
              key={e.slug}
              className={`ux-chat-citation${isOpen ? " open" : ""}`}
            >
              <header
                className="ux-chat-citation-head"
                onClick={() => toggleExpand(e.slug)}
              >
                <span className="ux-chat-citation-numeral">
                  {NUMERALS[idx] ?? `[${idx + 1}]`}
                </span>
                <div className="ux-chat-citation-titleblock">
                  <h3>{e.title}</h3>
                  <div className="ux-chat-citation-meta">
                    <span
                      className={`ux-chat-citation-score tier-${tier(score)}`}
                    >
                      {score || "—"}/20
                    </span>
                    <span className="ux-chat-citation-type">{e.fileType}</span>
                    <span className="ux-chat-citation-route">
                      {e.frontmatter.route ?? "second_brain"}
                    </span>
                    <span className="ux-chat-citation-tags">
                      {(e.frontmatter.tags ?? []).slice(0, 4).join(" · ")}
                    </span>
                    <span className="ux-chat-citation-relevance">
                      match {s}
                    </span>
                  </div>
                </div>
                <span className="ux-chat-citation-caret">
                  {isOpen ? "▼" : "▶"}
                </span>
              </header>
              {isOpen && (
                <div className="ux-chat-citation-body">
                  <pre>
                    {e.body.slice(0, 1400)}
                    {e.body.length > 1400 ? "\n\n…" : ""}
                  </pre>
                  <div className="ux-chat-citation-actions">
                    <button
                      type="button"
                      disabled={busySlug === e.slug}
                      onClick={() => throwIt(e.slug)}
                    >
                      throw
                    </button>
                    <button
                      type="button"
                      disabled={busySlug === e.slug}
                      onClick={() => defer(e.slug)}
                    >
                      defer
                    </button>
                    <button
                      type="button"
                      disabled={busySlug === e.slug}
                      onClick={() => archive(e.slug)}
                    >
                      archive
                    </button>
                    {e.frontmatter.source_url && (
                      <a
                        href={e.frontmatter.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        source ↗
                      </a>
                    )}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
