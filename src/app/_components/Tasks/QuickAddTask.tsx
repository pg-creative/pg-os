"use client";

import { useState, useRef } from "react";
import styles from "./tasks.module.css";

// Client-safe project list (id + name only — no server-only paths)
const PROJECT_OPTIONS: { id: string; name: string }[] = [
  { id: "metrasens",        name: "Metrasens" },
  { id: "heros-chronicle",  name: "Hero's Chronicle" },
  { id: "pg-creative",      name: "PG Creative" },
  { id: "voyager",          name: "Voyager" },
  { id: "personal-os",      name: "Personal OS" },
  { id: "career-ops",       name: "Career Ops" },
  { id: "claude-config",    name: "Claude Config" },
];

interface QuickAddTaskProps {
  onAdded: () => void;
  defaultProjectId?: string | null;
}

export function QuickAddTask({ onAdded, defaultProjectId }: QuickAddTaskProps) {
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || adding) return;

    setAdding(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmed,
          project_id: projectId || null,
          source: "projects-view",
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setTitle("");
      onAdded();
      inputRef.current?.focus();
    } catch (err) {
      console.error("QuickAddTask failed:", err);
    } finally {
      setAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form className={styles.quickAdd} onSubmit={handleSubmit} aria-label="Add task">
      <input
        ref={inputRef}
        type="text"
        className={styles.quickInput}
        placeholder="what needs doing?"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={adding}
        aria-label="New task title"
        autoComplete="off"
      />

      <select
        className={styles.quickProjectSelect}
        value={projectId}
        onChange={(e) => setProjectId(e.target.value)}
        aria-label="Project"
      >
        <option value="">(no project)</option>
        {PROJECT_OPTIONS.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>

      <button
        type="submit"
        className={styles.quickAddBtn}
        disabled={!title.trim() || adding}
        aria-label="Add task"
      >
        {adding ? "…" : "+ ADD"}
      </button>
    </form>
  );
}
