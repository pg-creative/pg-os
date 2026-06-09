"use client";

/**
 * ProjectsModule — active project count + most-recently-active project glance.
 * Fetches /api/projects.
 * Tapping opens the Projects tab.
 */

import { useState, useEffect } from "react";
import { BentoBox } from "../../../bento/BentoBox";
import { useActiveTab } from "../../../useActiveTab";

interface Project {
  id?: string;
  name?: string;
  uncommittedCount?: number;
  lastCommitAt?: number | null;
}

interface ProjectsResp {
  projects?: Project[];
}

function relTime(ms: number | null | undefined): string {
  if (!ms) return "—";
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function ProjectsModule({ cols = 4 }: { cols?: number }) {
  const { setActive } = useActiveTab();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d: ProjectsResp) => {
        if (cancelled) return;
        setProjects(d.projects ?? []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const active = projects.filter((p) => p.lastCommitAt);
  const recent = [...active].sort(
    (a, b) => (b.lastCommitAt ?? 0) - (a.lastCommitAt ?? 0),
  )[0];
  const dirty = active.filter((p) => (p.uncommittedCount ?? 0) > 0).length;

  return (
    <BentoBox
      cols={cols}
      eyebrow="Projects"
      kanji="案"
      count={
        !loading && active.length > 0 ? `${active.length} active` : undefined
      }
      onClick={() => setActive("projects")}
    >
      {loading ? (
        <span style={{ opacity: 0.45, fontSize: 13 }}>Loading...</span>
      ) : active.length === 0 ? (
        <span style={{ opacity: 0.5, fontSize: 13 }}>No project activity</span>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {recent && (
            <>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  lineHeight: 1.3,
                  fontFamily: "'Noto Serif JP', serif",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {recent.name ?? recent.id}
              </div>
              <div style={{ fontSize: 12, opacity: 0.55 }}>
                Last activity {relTime(recent.lastCommitAt)}
                {dirty > 0 && ` · ${dirty} with changes`}
              </div>
            </>
          )}
        </div>
      )}
    </BentoBox>
  );
}
