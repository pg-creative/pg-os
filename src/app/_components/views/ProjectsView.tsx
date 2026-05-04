"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { SparkleCorner, CardGlyph } from "../CardGlyph";
import { Skeleton } from "../Skeleton";
import { useMode } from "../ModeProvider";
import { MODE_CONFIG, applyModeFilter } from "../../../lib/modes";
import { createBrowserSupabaseClient } from "../../../lib/realtimeBrowser";
import { subscribeTable } from "../../../lib/realtime";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { RealtimeConfig } from "../../api/realtime/config/route";
import { TasksRegion } from "../Tasks/TasksRegion";
import { ProjectActiveCard } from "./ProjectActiveCard";
import { getActiveChestId, setActiveChestId, getDefaultActiveChestId } from "../../../lib/projects";

type Glyph = "sun" | "star" | "heart" | "sparkles" | "feather" | "music" | "compass";

interface Project {
  id: string;
  name: string;
  path: string;
  sub: string;
  deadline?: string;
  glyph?: Glyph;
  uncommittedCount: number;
  lastCommitAt: number | null;
  lastCommitMsg: string | null;
  memorySnippet: string | null;
  queueCount: number;
  daysUntilDeadline: number | null;
  topBlocker: string | null;
  topActions: { id: string; title: string }[];
}

interface LaunchResult {
  ok: boolean;
  autoLaunched: boolean;
  command: string;
  contextPrompt: string;
  error?: string;
}

type ToastState = {
  message: string;
  variant: "success" | "copy" | "error";
} | null;

function relTime(ms: number): string {
  const diff = Date.now() - ms;
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  const date = new Date(ms);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function DeadlineTag({ days, isoDate }: { days: number | null; isoDate?: string }) {
  if (days === null) return null;
  if (days < 0) {
    return <span className="pr-deadline pr-deadline-overdue">OVERDUE</span>;
  }
  if (days === 0) {
    return <span className="pr-deadline pr-deadline-ember">TODAY</span>;
  }
  if (days <= 14) {
    return <span className="pr-deadline pr-deadline-ember">{days} DAYS</span>;
  }
  if (days <= 45) {
    return <span className="pr-deadline pr-deadline-amber">{days} DAYS</span>;
  }
  // > 45 days — show formatted date
  if (isoDate) {
    const d = new Date(isoDate);
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
    return <span className="pr-deadline pr-deadline-gold">{label}</span>;
  }
  return null;
}

function ProjectCard({
  project,
  num,
  compressed,
  onSetActive,
}: {
  project: Project;
  num: number;
  compressed?: boolean;
  onSetActive?: () => void;
}) {
  const [launching, setLaunching] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [contextOpen, setContextOpen] = useState(false);
  const [contextText, setContextText] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const showToast = (message: string, variant: NonNullable<ToastState>["variant"]) => {
    setToast({ message, variant });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLaunch = useCallback(async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setLaunching(true);
    try {
      const res = await fetch("/api/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id }),
      });
      const data: LaunchResult = await res.json();
      if (!res.ok || !data.ok) {
        showToast(`⚠ Launch failed: ${data.error ?? "unknown error"}`, "error");
        return;
      }
      if (data.autoLaunched) {
        showToast("✓ Launched in Ghostty", "success");
      } else {
        await navigator.clipboard.writeText(data.command);
        setContextText(data.contextPrompt);
        showToast("📋 Copied — paste in your terminal", "copy");
      }
    } catch (err) {
      showToast(`⚠ Launch failed: ${err instanceof Error ? err.message : "network error"}`, "error");
    } finally {
      setLaunching(false);
    }
  }, [project.id]);

  // Close context menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function handleOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest(".pr-context-menu") && !target.closest(".pr-context-menu-trigger")) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [menuOpen]);

  const pad = String(num).padStart(2, "0");

  return (
    <Link
      href={`/projects/${project.id}`}
      className={`card pr-card pr-card-link spring-hover${compressed ? " pr-card-compressed" : ""}`}
      prefetch={false}
    >
      <SparkleCorner />

      {/* Header row */}
      <div className="card-label pr-header">
        <div className="pr-header-left">
          <CardGlyph name={project.glyph ?? "compass"} />
          <span className="pr-num-name">
            {pad} // {project.name.toUpperCase()}
          </span>
        </div>
        <DeadlineTag days={project.daysUntilDeadline} isoDate={project.deadline} />
      </div>

      {/* Title */}
      <div className="pr-name">{project.name}</div>

      {/* Sub line */}
      <div className="pr-sub">{project.sub}</div>

      {/* State row */}
      <div className="pr-state">
        <span className="pr-stat">
          LAST SHIP ·{" "}
          {project.lastCommitAt ? relTime(project.lastCommitAt) : "never"}
        </span>
        {project.uncommittedCount > 0 && (
          <span className="pr-stat amber">{project.uncommittedCount} UNCOMMITTED</span>
        )}
        {project.queueCount > 0 && (
          <span className="pr-stat accent">{project.queueCount} QUEUED</span>
        )}
      </div>

      {/* Last commit message */}
      {project.lastCommitMsg && (
        <div className="pr-commit-msg">
          {project.lastCommitMsg.length > 70
            ? project.lastCommitMsg.slice(0, 70) + "…"
            : project.lastCommitMsg}
        </div>
      )}

      {/* Top blocker (queue item awaiting decision) */}
      {project.topBlocker && (
        <div className="pr-blocker">
          <span className="pr-blocker-label">BLOCKED ·</span> {project.topBlocker}
        </div>
      )}

      {/* Top action items (open tasks) */}
      {project.topActions.length > 0 && (
        <ul className="pr-actions">
          {project.topActions.map((a) => (
            <li key={a.id} className="pr-action">
              <span className="pr-action-dot">›</span> {a.title}
            </li>
          ))}
        </ul>
      )}

      {/* Memory snippet (fallback signal when no actions) */}
      {project.memorySnippet && project.topActions.length === 0 && !project.topBlocker && (
        <div className="pr-memory">{project.memorySnippet}</div>
      )}

      {/* Footer: open arrow + launch button */}
      <div className="pr-footer">
        <span className="pr-open-hint">OPEN →</span>
        <button
          className="pr-launch spring-hover"
          onClick={handleLaunch}
          disabled={launching}
          type="button"
        >
          {launching ? "LAUNCHING…" : "LAUNCH SESSION →"}
        </button>
      </div>

      {/* Context preview (shown after clipboard copy) */}
      {contextText && (
        <div className="pr-context-preview" onClick={(e) => e.stopPropagation()}>
          <button
            className="pr-context-toggle"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setContextOpen((v) => !v); }}
            type="button"
          >
            {contextOpen ? "▾ HIDE CONTEXT" : "▸ SHOW CONTEXT"}
          </button>
          {contextOpen && (
            <pre className="pr-context-body">{contextText}</pre>
          )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`pr-toast pr-toast-${toast.variant}`}>{toast.message}</div>
      )}

      {/* 3-dot context menu — "Set active" */}
      {onSetActive && (
        <>
          <button
            className="pr-context-menu-trigger"
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen((v) => !v); }}
            aria-label="Project options"
          >
            …
          </button>
          {menuOpen && (
            <div className="pr-context-menu" onClick={(e) => e.stopPropagation()}>
              <button
                className="pr-context-menu-item"
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setMenuOpen(false);
                  onSetActive();
                }}
              >
                Set active
              </button>
            </div>
          )}
        </>
      )}
    </Link>
  );
}

export function ProjectsView() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { brand } = useMode();

  const fetchProjects = useCallback(() => {
    fetch("/api/projects", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: { projects: Project[] }) => {
        setProjects(data.projects);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load projects");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // ── Realtime: subscribe to PG OS `tasks` table ────────────────────────────
  useEffect(() => {
    let channel: RealtimeChannel | null = null;
    let supabaseClient: import("@supabase/supabase-js").SupabaseClient | null = null;
    let destroyed = false;

    async function setupRealtime() {
      try {
        const res = await fetch("/api/realtime/config");
        if (!res.ok) return;
        const cfg: RealtimeConfig = await res.json();
        if (!cfg.pgosUrl || !cfg.pgosPublishableKey) return; // graceful no-op

        const client = await createBrowserSupabaseClient(cfg.pgosUrl, cfg.pgosPublishableKey);
        if (!client || destroyed) return;

        supabaseClient = client;
        channel = subscribeTable({
          client,
          channelName: "tasks-realtime",
          table: "tasks",
          onchange: () => { fetchProjects(); },
        });
      } catch {
        // Realtime is best-effort — never surface errors to the user.
      }
    }

    void setupRealtime();

    return () => {
      destroyed = true;
      if (supabaseClient && channel) {
        supabaseClient.removeChannel(channel);
      }
    };
  }, [fetchProjects]);

  // ── Local-only: SSE stream that emits `refresh` on git/memory changes ─────
  // In dev the Node server can fs.watch each project's .git/logs/HEAD and
  // .git/index. The stream returns 501 in cloud — silently skipped.
  useEffect(() => {
    let es: EventSource | null = null;
    let cancelled = false;
    let backoffMs = 2000;

    const connect = () => {
      if (cancelled) return;
      try {
        es = new EventSource("/api/projects/events");
        es.addEventListener("refresh", () => fetchProjects());
        es.onopen = () => { backoffMs = 2000; };
        es.onerror = () => {
          es?.close();
          es = null;
          if (cancelled) return;
          // Re-attempt with capped backoff (covers transient hot-reload disconnects)
          setTimeout(connect, Math.min(backoffMs, 30_000));
          backoffMs = Math.min(backoffMs * 2, 30_000);
        };
      } catch {
        /* EventSource unavailable — silently skip */
      }
    };

    connect();
    return () => {
      cancelled = true;
      es?.close();
    };
  }, [fetchProjects]);

  // ── Active Chest state ────────────────────────────────────────────────────
  const [activeId, setActiveId] = useState<string | null>(() => getActiveChestId());

  // Hydrate from localStorage on mount (handles SSR mismatch); fall back to
  // the default first-active project so the hero card always renders unless
  // the 14-day idle effect has explicitly cleared it.
  useEffect(() => {
    const stored = getActiveChestId();
    setActiveId(stored ?? getDefaultActiveChestId());
  }, []);

  const filtered = applyModeFilter(projects, brand, "id");
  const brandCfg = brand ? MODE_CONFIG[brand] : null;

  // ── Keyboard navigation [ and ] ───────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key !== "[" && e.key !== "]") return;
      e.preventDefault();
      const list = filtered;
      if (list.length === 0) return;
      const currentIdx = activeId ? list.findIndex((p) => p.id === activeId) : -1;
      let nextIdx: number;
      if (e.key === "]") nextIdx = (currentIdx + 1) % list.length;
      else nextIdx = currentIdx <= 0 ? list.length - 1 : currentIdx - 1;
      const next = list[nextIdx];
      if (!next) return;
      setActiveChestId(next.id);
      setActiveId(next.id);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, filtered]);

  // ── 14-day idle auto-clear ────────────────────────────────────────────────
  useEffect(() => {
    if (!activeId) return;
    const p = projects.find((x) => x.id === activeId);
    if (!p) return;
    const last = p.lastCommitAt ? new Date(p.lastCommitAt).getTime() : 0;
    const idleMs = Date.now() - last;
    const hasQueue = (p.queueCount ?? 0) > 0;
    const hasActions = (p.topActions?.length ?? 0) > 0;
    if (idleMs > 14 * 86_400_000 && !hasQueue && !hasActions) {
      setActiveChestId(null);
      setActiveId(null);
    }
  }, [activeId, projects]);

  // ── Split filtered into active + rest ─────────────────────────────────────
  const activeProject = activeId ? filtered.find((p) => p.id === activeId) ?? null : null;
  const restProjects = filtered.filter((p) => p.id !== activeProject?.id);

  return (
    <div className="view view-projects">
      <div className="view-header">
        <h1 className="view-title">Projects</h1>
        <div className="view-sub">MASTER VIEW · STATE · LAUNCHERS</div>
      </div>

      {brandCfg && (
        <div className="cm-filter-hint">
          <span className="cm-filter-glyph">{brandCfg.glyph}</span>
          {" "}filtered by {brandCfg.label}
        </div>
      )}

      {loading && (
        <div className="pr-grid pr-grid-loading">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card pr-card pr-card-skeleton">
              <Skeleton variant="text" width="40%" height={11} />
              <div style={{ height: 12 }} />
              <Skeleton variant="text" width="70%" height={20} />
              <div style={{ height: 6 }} />
              <Skeleton variant="text" width="55%" height={12} />
              <div style={{ height: 14 }} />
              <Skeleton variant="text" lines={2} />
              <div style={{ height: 16 }} />
              <Skeleton variant="pill" width={140} height={24} />
            </div>
          ))}
        </div>
      )}
      {error && <div className="pr-error">⚠ {error}</div>}

      {!loading && !error && filtered.length === 0 && brand && (
        <p className="cm-filter-empty">No projects in {brandCfg?.label} mode. Clear the mode filter to see all.</p>
      )}

      {!loading && !error && (
        <>
          {activeProject && <ProjectActiveCard project={activeProject} />}
          <div className={activeProject ? "pr-grid pr-grid-compressed" : "pr-grid"}>
            {(activeProject ? restProjects : filtered).map((project, i) => (
              <ProjectCard
                key={project.id}
                project={project}
                num={i + 1}
                compressed={!!activeProject}
                onSetActive={() => {
                  setActiveChestId(project.id);
                  setActiveId(project.id);
                }}
              />
            ))}
          </div>
        </>
      )}

      {/* Tasks layer — full cross-project list below project cards */}
      <TasksRegion />
    </div>
  );
}
