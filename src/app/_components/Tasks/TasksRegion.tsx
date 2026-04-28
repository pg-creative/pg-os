"use client";

import { useState, useEffect, useCallback } from "react";
import { Task, TaskStatus } from "@/lib/tasks";
import { TaskRow } from "./TaskRow";
import { QuickAddTask } from "./QuickAddTask";
import styles from "./tasks.module.css";

type FilterStatus = "all" | TaskStatus;

const FILTER_OPTIONS: { value: FilterStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "todo", label: "Todo" },
  { value: "doing", label: "Doing" },
  { value: "done", label: "Done" },
  { value: "archived", label: "Archived" },
];

interface TasksRegionProps {
  // Optional: pre-filter by project when used inline within a specific project card
  filterProjectId?: string | null;
}

export function TasksRegion({ filterProjectId }: TasksRegionProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async (status: FilterStatus) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);
      if (filterProjectId) params.set("project", filterProjectId);

      const res = await fetch(`/api/tasks?${params}`, { cache: "no-store" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const data: { tasks: Task[] } = await res.json();
      setTasks(data.tasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [filterProjectId]);

  useEffect(() => {
    fetchTasks(filter);
  }, [filter, fetchTasks]);

  const handleToggle = useCallback(async (task: Task) => {
    const newStatus: TaskStatus = task.status === "done" ? "todo" : "done";
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => t.id === task.id ? { ...t, status: newStatus } : t),
    );
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Refresh to get server-side completed_at, etc.
      fetchTasks(filter);
    } catch (err) {
      console.error("Toggle task failed:", err);
      // Revert on error
      setTasks((prev) =>
        prev.map((t) => t.id === task.id ? { ...t, status: task.status } : t),
      );
    }
  }, [filter, fetchTasks]);

  const handleDelete = useCallback(async (task: Task) => {
    // Optimistic remove
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      console.error("Delete task failed:", err);
      // Revert on error
      fetchTasks(filter);
    }
  }, [filter, fetchTasks]);

  const handleAdded = useCallback(() => {
    fetchTasks(filter);
  }, [filter, fetchTasks]);

  // Visible tasks — when showing "all", exclude archived
  const visibleTasks = filter === "all"
    ? tasks.filter((t) => t.status !== "archived")
    : tasks;

  const activeTasks = tasks.filter(
    (t) => t.status === "todo" || t.status === "doing",
  );

  return (
    <section className={styles.region} aria-label="Tasks">
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>Tasks</h2>
        {activeTasks.length > 0 && (
          <span className={styles.count}>{activeTasks.length}</span>
        )}

        {/* Filter chips */}
        <div className={styles.filters} role="group" aria-label="Filter tasks">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`${styles.chip}${filter === opt.value ? " " + styles.chipActive : ""}`}
              onClick={() => setFilter(opt.value)}
              aria-pressed={filter === opt.value}
              aria-label={`Show ${opt.label} tasks`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quick-add input */}
      <QuickAddTask
        onAdded={handleAdded}
        defaultProjectId={filterProjectId ?? null}
      />

      {/* Task list */}
      {loading && <div className={styles.loading}>Loading tasks…</div>}

      {error && !loading && (
        <div className={styles.error}>
          {error.includes("PGOS_SUPABASE") ? (
            <span className={styles.unconfigured}>
              Tasks need Supabase configured — add{" "}
              <code>PGOS_SUPABASE_URL</code> + <code>PGOS_SUPABASE_SERVICE_ROLE_KEY</code> to{" "}
              <code>.env.local</code>.
            </span>
          ) : (
            `⚠ ${error}`
          )}
        </div>
      )}

      {!loading && !error && (
        <div className={styles.list} role="list">
          {visibleTasks.length === 0 ? (
            <div className={styles.empty}>
              {filter === "all" || filter === "todo"
                ? <>no tasks — add one above or capture with <kbd className={styles.emptyKbd}>⌘⇧K</kbd></>
                : `no ${filter} tasks`}
            </div>
          ) : (
            visibleTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onToggle={handleToggle}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      )}
    </section>
  );
}
