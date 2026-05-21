"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { CardGlyph } from "../CardGlyph";
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
import { TabShell } from "../bento/TabShell";
import { BentoBox } from "../bento/BentoBox";
import { useEmaki } from "../bento/emakiContext";

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
  const { tk } = useEmaki();
  if (days === null) return null;

  let label: string;
  let color: string;
  if (days < 0) {
    label = "OVERDUE";
    color = "#B8536F";
  } else if (days === 0) {
    label = "TODAY";
    color = tk.foxfire;
  } else if (days <= 14) {
    label = `${days} DAYS`;
    color = tk.foxfire;
  } else if (days <= 45) {
    label = `${days} DAYS`;
    color = tk.accent;
  } else {
    if (!isoDate) return null;
    const d = new Date(isoDate);
    label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
    color = tk.gold;
  }

  return (
    <span
      style={{
        fontFamily: "var(--mono), ui-monospace, monospace",
        fontSize: "var(--text-2xs)",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color,
        border: `1px solid ${color}`,
        borderRadius: 4,
        padding: "2px 7px",
        opacity: 0.9,
        flexShrink: 0,
      }}
    >
      {label}
    </span>
  );
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
  const { tk } = useEmaki();
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
  const running = project.uncommittedCount > 0 || project.queueCount > 0;

  return (
    <BentoBox
      cols={compressed ? 4 : 6}
      eyebrow={`${pad} // ${project.name.toUpperCase()}`}
      kanji="事"
      count={<DeadlineTag days={project.daysUntilDeadline} isoDate={project.deadline} />}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 8, position: "relative" }}>

        {/* Project name + glyph */}
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <CardGlyph name={project.glyph ?? "compass"} />
          <Link
            href={`/projects/${project.id}`}
            prefetch={false}
            style={{
              fontFamily: "var(--serif), Georgia, serif",
              fontSize: "var(--text-lg)",
              fontWeight: 500,
              color: tk.textPrimary,
              textDecoration: "none",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
            }}
          >
            {project.name}
          </Link>
        </div>

        {/* Sub line */}
        <div
          style={{
            fontFamily: "var(--mono), ui-monospace, monospace",
            fontSize: "var(--text-xs)",
            color: tk.textMuted,
            lineHeight: 1.4,
          }}
        >
          {project.sub}
        </div>

        {/* State row */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span
            style={{
              fontFamily: "var(--mono), ui-monospace, monospace",
              fontSize: "var(--text-2xs)",
              letterSpacing: "0.08em",
              color: tk.textMuted,
            }}
          >
            LAST SHIP · {project.lastCommitAt ? relTime(project.lastCommitAt) : "never"}
          </span>
          {project.uncommittedCount > 0 && (
            <StatPill color={tk.accent}>{project.uncommittedCount} UNCOMMITTED</StatPill>
          )}
          {project.queueCount > 0 && (
            <StatPill color={tk.foxfire}>{project.queueCount} QUEUED</StatPill>
          )}
        </div>

        {/* Last commit message */}
        {project.lastCommitMsg && (
          <div
            style={{
              fontFamily: "var(--mono), ui-monospace, monospace",
              fontSize: "var(--text-2xs)",
              color: tk.textSub,
              opacity: 0.8,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {project.lastCommitMsg.length > 70
              ? project.lastCommitMsg.slice(0, 70) + "…"
              : project.lastCommitMsg}
          </div>
        )}

        {/* Top blocker */}
        {project.topBlocker && (
          <div
            style={{
              display: "flex",
              gap: 6,
              alignItems: "flex-start",
              padding: "6px 10px",
              background: "rgba(184,83,111,0.08)",
              borderRadius: 6,
              borderLeft: `2px solid #B8536F`,
            }}
          >
            <span
              style={{
                fontFamily: "var(--mono), ui-monospace, monospace",
                fontSize: "var(--text-2xs)",
                letterSpacing: "0.1em",
                color: "#B8536F",
                flexShrink: 0,
              }}
            >
              BLOCKED ·
            </span>
            <span style={{ fontSize: "var(--text-xs)", color: tk.textSub, lineHeight: 1.4 }}>
              {project.topBlocker}
            </span>
          </div>
        )}

        {/* Top action items */}
        {project.topActions.length > 0 && (
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 3 }}>
            {project.topActions.map((a) => (
              <li
                key={a.id}
                style={{
                  display: "flex",
                  gap: 6,
                  alignItems: "flex-start",
                  fontSize: "var(--text-xs)",
                  color: tk.textSub,
                  lineHeight: 1.4,
                }}
              >
                <span style={{ color: tk.gold, flexShrink: 0 }}>›</span>
                {a.title}
              </li>
            ))}
          </ul>
        )}

        {/* Memory snippet (fallback) */}
        {project.memorySnippet && project.topActions.length === 0 && !project.topBlocker && (
          <div
            style={{
              fontSize: "var(--text-xs)",
              color: tk.textMuted,
              fontStyle: "italic",
              lineHeight: 1.5,
            }}
          >
            {project.memorySnippet}
          </div>
        )}

        {/* Footer: open link + launch button */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 8,
            borderTop: `1px solid ${tk.divider}`,
            marginTop: 4,
          }}
        >
          <Link
            href={`/projects/${project.id}`}
            prefetch={false}
            style={{
              fontFamily: "var(--mono), ui-monospace, monospace",
              fontSize: "var(--text-2xs)",
              letterSpacing: "0.1em",
              color: tk.textMuted,
              textDecoration: "none",
            }}
          >
            OPEN →
          </Link>
          <button
            onClick={handleLaunch}
            disabled={launching}
            type="button"
            style={{
              background: "transparent",
              border: `1px solid ${running ? tk.foxfire : tk.accent}`,
              borderRadius: 5,
              color: running ? tk.foxfire : tk.accent,
              fontFamily: "var(--mono), ui-monospace, monospace",
              fontSize: "var(--text-2xs)",
              letterSpacing: "0.08em",
              padding: "4px 10px",
              cursor: launching ? "default" : "pointer",
              opacity: launching ? 0.6 : 1,
              transition: "opacity 160ms ease",
              whiteSpace: "nowrap",
            }}
          >
            {launching ? "LAUNCHING…" : "LAUNCH SESSION →"}
          </button>
        </div>

        {/* Context preview (shown after clipboard copy) */}
        {contextText && (
          <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 4 }}>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setContextOpen((v) => !v); }}
              type="button"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--mono), ui-monospace, monospace",
                fontSize: "var(--text-2xs)",
                letterSpacing: "0.08em",
                color: tk.textMuted,
                padding: 0,
              }}
            >
              {contextOpen ? "▾ HIDE CONTEXT" : "▸ SHOW CONTEXT"}
            </button>
            {contextOpen && (
              <pre
                style={{
                  margin: "6px 0 0",
                  padding: "8px 10px",
                  background: "rgba(0,0,0,0.18)",
                  borderRadius: 6,
                  fontSize: "var(--text-2xs)",
                  color: tk.textSub,
                  overflowX: "auto",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                }}
              >
                {contextText}
              </pre>
            )}
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div
            style={{
              position: "absolute",
              bottom: -4,
              right: 0,
              fontFamily: "var(--mono), ui-monospace, monospace",
              fontSize: "var(--text-2xs)",
              letterSpacing: "0.08em",
              padding: "4px 10px",
              borderRadius: 5,
              background:
                toast.variant === "success"
                  ? "rgba(124,154,110,0.2)"
                  : toast.variant === "error"
                  ? "rgba(184,83,111,0.2)"
                  : "rgba(0,0,0,0.22)",
              color:
                toast.variant === "success"
                  ? "#7C9A6E"
                  : toast.variant === "error"
                  ? "#B8536F"
                  : tk.textSub,
              border: `1px solid ${
                toast.variant === "success"
                  ? "rgba(124,154,110,0.4)"
                  : toast.variant === "error"
                  ? "rgba(184,83,111,0.4)"
                  : tk.divider
              }`,
              zIndex: 10,
              whiteSpace: "nowrap",
            }}
          >
            {toast.message}
          </div>
        )}

        {/* 3-dot context menu — "Set active" */}
        {onSetActive && (
          <div style={{ position: "absolute", top: 0, right: 0 }}>
            <button
              className="pr-context-menu-trigger"
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen((v) => !v); }}
              aria-label="Project options"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: tk.textMuted,
                fontSize: "var(--text-base)",
                lineHeight: 1,
                padding: "2px 4px",
              }}
            >
              …
            </button>
            {menuOpen && (
              <div
                className="pr-context-menu"
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  background: "rgba(10,10,14,0.92)",
                  border: `1px solid ${tk.divider}`,
                  borderRadius: 6,
                  padding: "4px 0",
                  zIndex: 20,
                  minWidth: 120,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
                }}
              >
                <button
                  className="pr-context-menu-item"
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMenuOpen(false);
                    onSetActive();
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "var(--mono), ui-monospace, monospace",
                    fontSize: "var(--text-xs)",
                    color: tk.textSub,
                    padding: "7px 14px",
                    textAlign: "left",
                  }}
                >
                  Set active
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </BentoBox>
  );
}

function StatPill({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      style={{
        fontFamily: "var(--mono), ui-monospace, monospace",
        fontSize: "var(--text-2xs)",
        letterSpacing: "0.08em",
        color,
        border: `1px solid ${color}`,
        borderRadius: 4,
        padding: "1px 6px",
        opacity: 0.9,
        flexShrink: 0,
      }}
    >
      {children}
    </span>
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

  // Realtime: subscribe to PG OS `tasks` table
  useEffect(() => {
    let channel: RealtimeChannel | null = null;
    let supabaseClient: import("@supabase/supabase-js").SupabaseClient | null = null;
    let destroyed = false;

    async function setupRealtime() {
      try {
        const res = await fetch("/api/realtime/config");
        if (!res.ok) return;
        const cfg: RealtimeConfig = await res.json();
        if (!cfg.pgosUrl || !cfg.pgosPublishableKey) return;

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
        // Realtime is best-effort
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

  // SSE stream for git/memory changes
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
          setTimeout(connect, Math.min(backoffMs, 30_000));
          backoffMs = Math.min(backoffMs * 2, 30_000);
        };
      } catch {
        /* EventSource unavailable */
      }
    };

    connect();
    return () => {
      cancelled = true;
      es?.close();
    };
  }, [fetchProjects]);

  // Active Chest state
  const [activeId, setActiveId] = useState<string | null>(() => getActiveChestId());

  useEffect(() => {
    const stored = getActiveChestId();
    setActiveId(stored ?? getDefaultActiveChestId());
  }, []);

  const filtered = applyModeFilter(projects, brand, "id");
  const brandCfg = brand ? MODE_CONFIG[brand] : null;

  // Keyboard navigation [ and ]
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

  // 14-day idle auto-clear
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

  // Split filtered into active + rest
  const activeProject = activeId ? filtered.find((p) => p.id === activeId) ?? null : null;
  const restProjects = filtered.filter((p) => p.id !== activeProject?.id);

  const count = filtered.length;
  const eyebrow = `PROJECTS // ${count} active${brandCfg ? ` · ${brandCfg.label}` : ""}`;

  return (
    <TabShell title="Projects" eyebrow={eyebrow}>
      {/* Brand mode filter hint */}
      {brandCfg && (
        <BentoBox cols={12}>
          <ProjectsFilterHint brandCfg={brandCfg} />
        </BentoBox>
      )}

      {/* Loading skeletons */}
      {loading && (
        <>
          {Array.from({ length: 6 }).map((_, i) => (
            <BentoBox key={i} cols={6}>
              <Skeleton variant="text" width="40%" height={11} />
              <div style={{ height: 12 }} />
              <Skeleton variant="text" width="70%" height={20} />
              <div style={{ height: 6 }} />
              <Skeleton variant="text" width="55%" height={12} />
              <div style={{ height: 14 }} />
              <Skeleton variant="text" lines={2} />
              <div style={{ height: 16 }} />
              <Skeleton variant="pill" width={140} height={24} />
            </BentoBox>
          ))}
        </>
      )}

      {/* Error */}
      {error && (
        <BentoBox cols={12}>
          <ErrorMessage error={error} />
        </BentoBox>
      )}

      {/* Empty state for filtered brand mode */}
      {!loading && !error && filtered.length === 0 && brand && (
        <BentoBox cols={12}>
          <EmptyState brandCfg={brandCfg} />
        </BentoBox>
      )}

      {/* Active project hero */}
      {!loading && !error && activeProject && (
        <BentoBox cols={12} style={{ padding: 0, overflow: "hidden" }}>
          <ProjectActiveCard project={activeProject} />
        </BentoBox>
      )}

      {/* Project grid cards */}
      {!loading && !error && (activeProject ? restProjects : filtered).map((project, i) => (
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

      {/* Tasks layer */}
      {!loading && !error && (
        <BentoBox cols={12} eyebrow="TASKS" scroll>
          <TasksRegion />
        </BentoBox>
      )}
    </TabShell>
  );
}

// Inner components that use useEmaki() (must be inside EmakiProvider = inside TabShell)

function ProjectsFilterHint({ brandCfg }: { brandCfg: { glyph: string; label: string } }) {
  const { tk } = useEmaki();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontFamily: "var(--mono), ui-monospace, monospace",
        fontSize: "var(--text-xs)",
        color: tk.textMuted,
      }}
    >
      <span style={{ fontSize: "var(--text-base)" }}>{brandCfg.glyph}</span>
      filtered by {brandCfg.label}
    </div>
  );
}

function ErrorMessage({ error }: { error: string }) {
  const { tk } = useEmaki();
  return (
    <div
      style={{
        color: "#B8536F",
        fontFamily: "var(--mono), ui-monospace, monospace",
        fontSize: "var(--text-sm)",
        padding: "8px 0",
      }}
    >
      <span style={{ color: tk.textMuted }}>⚠</span> {error}
    </div>
  );
}

function EmptyState({ brandCfg }: { brandCfg: { label: string } | null }) {
  const { tk } = useEmaki();
  return (
    <p
      style={{
        fontFamily: "var(--mono), ui-monospace, monospace",
        fontSize: "var(--text-sm)",
        color: tk.textMuted,
        margin: 0,
        padding: "16px 0",
        textAlign: "center",
      }}
    >
      No projects in {brandCfg?.label} mode. Clear the mode filter to see all.
    </p>
  );
}
