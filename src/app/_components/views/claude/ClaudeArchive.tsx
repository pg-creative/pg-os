"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type ArchiveStats = {
  totalConversations: number;
  totalMessages: number;
  dateRange: { first: string; last: string };
  recentMonths: Array<{ month: string; conversations: number; messages: number }>;
};

type ArchiveConversation = {
  uuid: string;
  name: string;
  summary: string;
  created_at: string;
  message_count: number;
};

function fmtDate(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

export function ClaudeArchive() {
  const [stats, setStats] = useState<ArchiveStats | null>(null);
  const [recent, setRecent] = useState<ArchiveConversation[]>([]);
  const [results, setResults] = useState<ArchiveConversation[] | null>(null);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const debounceRef = useRef<number | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/claude/archive", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load archive");
      const data = await res.json();
      if (!data.stats) {
        setMissing(true);
        return;
      }
      setStats(data.stats);
      setRecent(data.recent ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults(null);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/claude/archive?search=${encodeURIComponent(q)}&limit=20`, { cache: "no-store" });
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setResults(data.results ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => runSearch(query), 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  if (missing) {
    return (
      <section id="cl-archive" className="card cl-card cl-archive-section">
        <div className="card-label">
          <span>06 // ARCHIVE</span>
          <span className="cl-tag-muted">missing</span>
        </div>
        <p className="cl-empty">
          Web chat archive not found at <code>~/CEREBRUM/claude-web-history/db/archive.db</code>.
          Run <code>node scripts/ingest.mjs</code> in <code>claude-web-history/</code> to set it up.
        </p>
      </section>
    );
  }

  const items = results ?? recent;

  return (
    <section id="cl-archive" className="card cl-card cl-archive-section">
      <div className="card-label">
        <span>06 // ARCHIVE</span>
        {stats && (
          <span className="cl-tag-muted">
            {stats.totalConversations.toLocaleString()} convos · {stats.totalMessages.toLocaleString()} msgs
          </span>
        )}
      </div>

      {error && <span className="flow-error">{error}</span>}

      {stats && (
        <div className="cl-archive-stats">
          <span className="cl-stat-sub">
            {fmtDate(stats.dateRange.first)} → {fmtDate(stats.dateRange.last)}
          </span>
        </div>
      )}

      <input
        type="search"
        className="cl-archive-search"
        placeholder="Search conversations (FTS5)…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="cl-archive-meta-row">
        <span className="cl-tag-muted">
          {results ? (searching ? "searching…" : `${results.length} matches`) : "10 most recent"}
        </span>
      </div>

      <ul className="cl-archive-results">
        {items.map((c) => (
          <li key={c.uuid} className="cl-archive-result">
            <div className="cl-arch-row">
              <span className="cl-arch-name">{c.name || "Untitled conversation"}</span>
              <span className="cl-arch-count">{c.message_count} msgs</span>
            </div>
            {c.summary && <p className="cl-arch-summary">{c.summary}</p>}
            <span className="cl-arch-date">{fmtDate(c.created_at)}</span>
          </li>
        ))}
      </ul>

      {items.length === 0 && !searching && (
        <p className="cl-empty-small">No conversations match.</p>
      )}
    </section>
  );
}
