"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CardGlyph } from "../CardGlyph";

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
  if (days < 0) return <span className="pr-deadline pr-deadline-overdue">OVERDUE</span>;
  if (days === 0) return <span className="pr-deadline pr-deadline-ember">TODAY</span>;
  if (days <= 14) return <span className="pr-deadline pr-deadline-ember">{days} DAYS</span>;
  if (days <= 45) return <span className="pr-deadline pr-deadline-amber">{days} DAYS</span>;
  if (isoDate) {
    const d = new Date(isoDate);
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
    return <span className="pr-deadline pr-deadline-gold">{label}</span>;
  }
  return null;
}

interface ProjectActiveCardProps {
  project: Project;
}

export function ProjectActiveCard({ project }: ProjectActiveCardProps) {
  const router = useRouter();
  const [launching, setLaunching] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const showToast = (message: string, variant: NonNullable<ToastState>["variant"]) => {
    setToast({ message, variant });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLaunch = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLaunching(true);
    try {
      const res = await fetch("/api/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id }),
      });
      const data = await res.json() as { ok: boolean; autoLaunched: boolean; command: string; contextPrompt: string; error?: string };
      if (!res.ok || !data.ok) {
        showToast(`⚠ Launch failed: ${data.error ?? "unknown error"}`, "error");
        return;
      }
      if (data.autoLaunched) {
        showToast("✓ Launched in Ghostty", "success");
      } else {
        await navigator.clipboard.writeText(data.command);
        showToast("📋 Copied — paste in your terminal", "copy");
      }
    } catch (err) {
      showToast(`⚠ Launch failed: ${err instanceof Error ? err.message : "network error"}`, "error");
    } finally {
      setLaunching(false);
    }
  }, [project.id]);

  const handleOpen = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    router.push(`/projects/${project.id}`);
  }, [project.id, router]);

  return (
    <div className="pr-active-card">
      {/* Ghibli halo via ::before pseudo-element (CSS) */}

      {/* Hero row */}
      <div className="pr-active-card-hero">
        <div className="pr-active-card-hero-left">
          <CardGlyph name={project.glyph ?? "compass"} />
          <h2 className="pr-active-card-name">{project.name}</h2>
          <span className="pr-active-card-sub">{project.sub}</span>
        </div>
        <div className="pr-active-card-hero-right">
          <DeadlineTag days={project.daysUntilDeadline} isoDate={project.deadline} />
          <span className="pr-active-card-time">
            {project.lastCommitAt ? relTime(project.lastCommitAt) : "never"}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="pr-state pr-active-card-stats">
        <span className="pr-stat">
          LAST SHIP · {project.lastCommitAt ? relTime(project.lastCommitAt) : "never"}
        </span>
        {project.uncommittedCount > 0 && (
          <span className="pr-stat amber">{project.uncommittedCount} UNCOMMITTED</span>
        )}
        {project.queueCount > 0 && (
          <span className="pr-stat accent">{project.queueCount} QUEUED</span>
        )}
      </div>

      {/* Full last commit message (no truncation) */}
      {project.lastCommitMsg && (
        <div className="pr-active-card-commit">{project.lastCommitMsg}</div>
      )}

      {/* Top blocker */}
      {project.topBlocker && (
        <div className="pr-blocker pr-active-card-blocker">
          <span className="pr-blocker-label">BLOCKED ·</span> {project.topBlocker}
        </div>
      )}

      {/* All action items (no truncation) */}
      {project.topActions.length > 0 && (
        <ul className="pr-actions pr-active-card-actions">
          {project.topActions.map((a) => (
            <li key={a.id} className="pr-action">
              <span className="pr-action-dot">›</span> {a.title}
            </li>
          ))}
        </ul>
      )}

      {/* Memory snippet (italic, always shown in active card) */}
      {project.memorySnippet && (
        <div className="pr-memory pr-active-card-memory">{project.memorySnippet}</div>
      )}

      {/* Footer CTAs */}
      <div className="pr-active-card-cta">
        <button
          className="pr-active-cta-btn pr-active-cta-open"
          onClick={handleOpen}
          type="button"
        >
          OPEN →
        </button>
        <button
          className="pr-active-cta-btn pr-active-cta-launch"
          onClick={handleLaunch}
          disabled={launching}
          type="button"
        >
          {launching ? "LAUNCHING…" : "LAUNCH SESSION →"}
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`pr-toast pr-toast-${toast.variant}`}>{toast.message}</div>
      )}
    </div>
  );
}
