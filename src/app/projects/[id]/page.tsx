"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import type { ProjectDetail } from "@/lib/projectState";

function relTime(ms: number): string {
  const diff = Date.now() - ms;
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtDeadline(iso?: string, days?: number | null) {
  if (!iso) return null;
  const d = new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  if (days === null || days === undefined) return d;
  if (days < 0) return `${d} · OVERDUE ${Math.abs(days)}d`;
  if (days === 0) return `${d} · TODAY`;
  return `${d} · ${days}d out`;
}

type LaunchResult = {
  ok: boolean;
  autoLaunched: boolean;
  command: string;
  contextPrompt: string;
  error?: string;
};

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const fetchDetail = useCallback(() => {
    fetch(`/api/projects/${id}`, { cache: "no-store" })
      .then((r) => {
        if (r.status === 404) throw new Error("Project not found");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: { project: ProjectDetail }) => setProject(data.project))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  // Live updates from the SSE stream
  useEffect(() => {
    let es: EventSource | null = null;
    let cancelled = false;
    let backoff = 2000;
    const connect = () => {
      if (cancelled) return;
      try {
        es = new EventSource("/api/projects/events");
        es.addEventListener("refresh", (e) => {
          // Refresh only if the event is for this project (data is the projectId)
          if ((e as MessageEvent).data === id) fetchDetail();
        });
        es.onopen = () => { backoff = 2000; };
        es.onerror = () => {
          es?.close();
          es = null;
          if (cancelled) return;
          setTimeout(connect, Math.min(backoff, 30_000));
          backoff = Math.min(backoff * 2, 30_000);
        };
      } catch { /* skip */ }
    };
    connect();
    return () => { cancelled = true; es?.close(); };
  }, [id, fetchDetail]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleLaunch = useCallback(async () => {
    setLaunching(true);
    try {
      const res = await fetch("/api/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: id }),
      });
      const data: LaunchResult = await res.json();
      if (!res.ok || !data.ok) {
        showToast(`⚠ ${data.error ?? "launch failed"}`);
        return;
      }
      if (data.autoLaunched) {
        showToast("✓ Launched in Ghostty");
      } else {
        await navigator.clipboard.writeText(data.command);
        showToast("📋 Copied — paste in your terminal");
      }
    } catch (err) {
      showToast(`⚠ ${err instanceof Error ? err.message : "network error"}`);
    } finally {
      setLaunching(false);
    }
  }, [id]);

  if (loading) {
    return (
      <main className="pd-page">
        <div className="pd-loading">Loading…</div>
      </main>
    );
  }

  if (error || !project) {
    return (
      <main className="pd-page">
        <div className="pd-error">⚠ {error ?? "Unknown error"}</div>
        <Link href="/" className="pd-back">← Back</Link>
      </main>
    );
  }

  const deadline = fmtDeadline(project.deadline, project.daysUntilDeadline);
  const hasBlockers = project.queueItems.length > 0;
  const openTasks = project.tasks.filter((t) => t.status === "todo" || t.status === "doing");

  return (
    <main className="pd-page">
      {/* Top bar */}
      <div className="pd-topbar">
        <Link href="/" className="pd-back">← All projects</Link>
        <button
          className="pd-launch"
          onClick={handleLaunch}
          disabled={launching}
          type="button"
        >
          {launching ? "LAUNCHING…" : "LAUNCH SESSION →"}
        </button>
      </div>

      {/* Hero */}
      <header className="pd-hero">
        <div className="pd-hero-meta">{project.sub}</div>
        <h1 className="pd-title">{project.name}</h1>
        <div className="pd-hero-stats">
          {deadline && <span className="pd-stat-pill amber">{deadline}</span>}
          <span className="pd-stat-pill">
            LAST SHIP · {project.lastCommitAt ? relTime(project.lastCommitAt) : "never"}
          </span>
          {project.uncommittedCount > 0 && (
            <span className="pd-stat-pill amber">{project.uncommittedCount} uncommitted</span>
          )}
          {project.branches.length > 0 && (
            <span className="pd-stat-pill">{project.branches.length} branch{project.branches.length === 1 ? "" : "es"}</span>
          )}
        </div>
        {project.lastCommitMsg && (
          <div className="pd-last-commit">› {project.lastCommitMsg}</div>
        )}
      </header>

      {/* Current state */}
      {project.sections.currentState && (
        <section className="pd-section">
          <h2 className="pd-section-title">Current state</h2>
          <p className="pd-prose">{project.sections.currentState}</p>
        </section>
      )}

      {/* Two-column grid: Blockers + Action items */}
      <div className="pd-grid-2">
        <section className="pd-section">
          <h2 className="pd-section-title">
            Blockers
            {hasBlockers && <span className="pd-count">{project.queueItems.length}</span>}
          </h2>
          {hasBlockers ? (
            <ul className="pd-list">
              {project.queueItems.map((q) => (
                <li key={q.id} className="pd-list-item pd-blocker-item">
                  <div className="pd-list-title">{q.title}</div>
                  {q.options && q.options.length > 0 && (
                    <div className="pd-list-meta">
                      {q.options.map((o, i) => (
                        <span key={i} className="pd-chip">{o}</span>
                      ))}
                    </div>
                  )}
                  <div className="pd-list-meta dim">
                    waiting · {relTime(q.created_at)}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="pd-empty">No pending decisions.</div>
          )}
          {/* Memory-derived blockers (if MEMORY.md called something out) */}
          {project.sections.blockers.length > 0 && (
            <>
              <div className="pd-subhead">From memory</div>
              <ul className="pd-list">
                {project.sections.blockers.map((b, i) => (
                  <li key={i} className="pd-list-item dim">{b}</li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="pd-section">
          <h2 className="pd-section-title">
            Action items
            {openTasks.length > 0 && <span className="pd-count">{openTasks.length}</span>}
          </h2>
          {openTasks.length > 0 ? (
            <ul className="pd-list">
              {openTasks.map((t) => (
                <li key={t.id} className={`pd-list-item pd-task-item status-${t.status}`}>
                  <div className="pd-list-title">{t.title}</div>
                  <div className="pd-list-meta">
                    <span className={`pd-chip status-${t.status}`}>{t.status}</span>
                    {t.priority && <span className={`pd-chip prio-${t.priority}`}>{t.priority}</span>}
                    {t.due_at && <span className="pd-chip">due {new Date(t.due_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="pd-empty">No open tasks.</div>
          )}
          {/* Memory-derived action items */}
          {project.sections.actionItems.length > 0 && (
            <>
              <div className="pd-subhead">From memory</div>
              <ul className="pd-list">
                {project.sections.actionItems.map((a, i) => (
                  <li key={i} className="pd-list-item dim">{a}</li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      {/* Roadmap */}
      <section className="pd-section">
        <h2 className="pd-section-title">Roadmap</h2>
        {project.sections.roadmap.length > 0 ? (
          <ol className="pd-roadmap">
            {project.sections.roadmap.map((r, i) => (
              <li key={i} className="pd-roadmap-item">
                <span className="pd-roadmap-num">{String(i + 1).padStart(2, "0")}</span>
                <span className="pd-roadmap-text">{r}</span>
              </li>
            ))}
          </ol>
        ) : (
          <div className="pd-empty">
            No <code>## Roadmap</code> section in MEMORY. Add one to see it here.
          </div>
        )}
        {project.specsFiles.length > 0 && (
          <>
            <div className="pd-subhead">Spec docs</div>
            <ul className="pd-list">
              {project.specsFiles.map((f) => (
                <li key={f.relPath} className="pd-list-item">
                  <span className="pd-mono">{f.relPath}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* Git momentum */}
      <section className="pd-section">
        <h2 className="pd-section-title">Recent commits</h2>
        {project.recentCommits.length > 0 ? (
          <ul className="pd-commits">
            {project.recentCommits.map((c) => (
              <li key={c.hash} className="pd-commit">
                <span className="pd-commit-hash">{c.hash}</span>
                <span className="pd-commit-subject">{c.subject}</span>
                <span className="pd-commit-date">{relTime(c.date)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="pd-empty">No commit history available.</div>
        )}
      </section>

      {toast && <div className="pd-toast">{toast}</div>}
    </main>
  );
}
