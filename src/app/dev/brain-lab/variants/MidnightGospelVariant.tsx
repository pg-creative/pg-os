"use client";
/**
 * VARIANT 5 — MIDNIGHT GOSPEL (FALSIFIER)
 * Cosmic canvas with floating ringed-orb entries. Outside PG's typical aesthetic.
 * Net-new: Portal Network (cross-refs as cosmic threads) + Realm Frequency.
 */
import { useState, useMemo } from "react";
import { useBrainEntries } from "../../../_components/views/brain/useBrainEntries";
import { useBrainMutations } from "../shared/Mutations";
import { useTheme } from "../shared/ThemeProvider";
import type { BrainEntry } from "@/lib/brain/types";

export function MidnightGospelVariant() {
  const theme = useTheme();
  const { entries, filtered, filter, setFilter, loading, refresh } =
    useBrainEntries();
  const [selected, setSelected] = useState<BrainEntry | null>(null);
  const { busySlug, throwIt, defer, archive } = useBrainMutations(refresh);

  // Portal Network: simple cross-reference map by shared tags
  const portalNet = useMemo(() => {
    const edges: { a: string; b: string; weight: number }[] = [];
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const a = new Set(entries[i].frontmatter.tags ?? []);
        const b = new Set(entries[j].frontmatter.tags ?? []);
        let shared = 0;
        for (const t of a) if (b.has(t)) shared++;
        if (shared >= 2)
          edges.push({
            a: entries[i].slug,
            b: entries[j].slug,
            weight: shared,
          });
      }
    }
    return edges.slice(0, 30);
  }, [entries]);

  return (
    <div className="gospel">
      <div className="gospel-cosmos" />
      <div className="gospel-stars" />
      <div className="gospel-content">
        <header className="gospel-mast">
          <div className="gospel-eyebrow">∞ MULTIVERSE BROADCAST ∞</div>
          <h1 className="gospel-headline">
            {entries.length}
            <span>—realms in the cabinet</span>
          </h1>
          <input
            type="search"
            className="gospel-search"
            placeholder="tune the realm…"
            value={filter.query}
            onChange={(e) => setFilter({ query: e.target.value })}
          />
          <div className="gospel-portal-info">
            portals: {portalNet.length} active cross-references
          </div>
        </header>

        <main className="gospel-orbs">
          {loading && entries.length === 0 ? (
            <div className="gospel-empty">tuning the broadcast…</div>
          ) : filtered.length === 0 ? (
            <div className="gospel-empty">no realm matches this frequency</div>
          ) : (
            <div className="gospel-orb-field">
              {filtered.map((e, i) => {
                const score = e.frontmatter.score ?? 0;
                const tier = score >= 14 ? "high" : score >= 10 ? "mid" : "low";
                const qualityFreq =
                  e.frontmatter.source_quality === "verified"
                    ? "slow"
                    : e.frontmatter.source_quality === "hype"
                      ? "chaotic"
                      : "steady";
                return (
                  <article
                    key={e.slug}
                    className={`gospel-orb gospel-orb-${tier} gospel-orb-freq-${qualityFreq}`}
                    onClick={() => setSelected(e)}
                    style={{ animationDelay: `${(i % 7) * 0.3}s` }}
                  >
                    <div className="gospel-orb-ring" />
                    <div className="gospel-orb-ring gospel-orb-ring-2" />
                    <div className="gospel-orb-core">
                      <div className="gospel-orb-num" data-tier={tier}>
                        {score || "∅"}
                      </div>
                    </div>
                    <div className="gospel-orb-label">{e.title}</div>
                  </article>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* PORTAL DRAWER */}
      {selected && (
        <div
          className="gospel-portal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
        >
          <aside className="gospel-portal">
            <button
              type="button"
              className="gospel-portal-close"
              onClick={() => setSelected(null)}
            >
              ×
            </button>
            <div className="gospel-portal-glow" />
            <div className="gospel-eyebrow">
              REALM: {selected.fileType.toUpperCase()} · FREQUENCY{" "}
              {selected.frontmatter.score ?? "—"}/20
            </div>
            <h2 className="gospel-portal-title">{selected.title}</h2>
            <div className="gospel-portal-tags">
              {(selected.frontmatter.tags ?? []).map((t) => (
                <span key={t}>#{t}</span>
              ))}
            </div>
            <div className="gospel-portal-actions">
              <button
                type="button"
                disabled={busySlug === selected.slug}
                onClick={() => throwIt(selected.slug)}
              >
                open portal
              </button>
              <button
                type="button"
                disabled={busySlug === selected.slug}
                onClick={() => defer(selected.slug)}
              >
                orbit
              </button>
              <button
                type="button"
                disabled={busySlug === selected.slug}
                onClick={() => archive(selected.slug)}
              >
                collapse
              </button>
              {selected.frontmatter.source_url && (
                <a
                  href={selected.frontmatter.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  source dimension ↗
                </a>
              )}
            </div>
            <pre className="gospel-portal-body">{selected.body}</pre>
          </aside>
        </div>
      )}
    </div>
  );
}
