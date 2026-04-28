"use client";

import { useState, useEffect, useCallback } from "react";
import { SparkleCorner, CardGlyph } from "../CardGlyph";
import { useMode } from "../ModeProvider";
import { MODE_CONFIG, applyModeFilter } from "../../../lib/modes";
import { createBrowserSupabaseClient } from "../../../lib/realtimeBrowser";
import { subscribeTable } from "../../../lib/realtime";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { RealtimeConfig } from "../../api/realtime/config/route";
import { TasksRegion } from "../Tasks/TasksRegion";

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

function ProjectCard({ project, num }: { project: Project; num: number }) {
  const [launching, setLaunching] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [contextOpen, setContextOpen] = useState(false);
  const [contextText, setContextText] = useState<string | null>(null);

  const showToast = (message: string, variant: NonNullable<ToastState>["variant"]) => {
    setToast({ message, variant });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLaunch = useCallback(async () => {
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

  const pad = String(num).padStart(2, "0");

  return (
    <div className="card pr-card">
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

      {/* Memory snippet */}
      {project.memorySnippet && (
        <div className="pr-memory">{project.memorySnippet}</div>
      )}

      {/* Launch button */}
      <button
        className="pr-launch"
        onClick={handleLaunch}
        disabled={launching}
      >
        {launching ? "LAUNCHING…" : "LAUNCH SESSION →"}
      </button>

      {/* Context preview (shown after clipboard copy) */}
      {contextText && (
        <div className="pr-context-preview">
          <button
            className="pr-context-toggle"
            onClick={() => setContextOpen((v) => !v)}
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
    </div>
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

  const filtered = applyModeFilter(projects, brand, "id");
  const brandCfg = brand ? MODE_CONFIG[brand] : null;

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

      {loading && <div className="pr-loading">Loading projects…</div>}
      {error && <div className="pr-error">⚠ {error}</div>}

      {!loading && !error && filtered.length === 0 && brand && (
        <p className="cm-filter-empty">No projects in {brandCfg?.label} mode. Clear the mode filter to see all.</p>
      )}

      {!loading && !error && (
        <div className="pr-grid">
          {filtered.map((project, i) => (
            <ProjectCard key={project.id} project={project} num={i + 1} />
          ))}
        </div>
      )}

      {/* Tasks layer — full cross-project list below project cards */}
      <TasksRegion />
    </div>
  );
}
