"use client";

import { Task } from "@/lib/tasks";
import styles from "./tasks.module.css";

interface TaskRowProps {
  task: Task;
  onToggle: (task: Task) => void;
  onDelete: (task: Task) => void;
}

function formatDue(isoString: string): { label: string; overdue: boolean } {
  const due = new Date(isoString);
  const now = new Date();
  const overdue = due < now;

  const diff = due.getTime() - now.getTime();
  const days = Math.ceil(diff / 86_400_000);

  if (overdue) {
    const daysAgo = Math.abs(days);
    return { label: daysAgo === 0 ? "today" : `${daysAgo}d ago`, overdue: true };
  }
  if (days === 0) return { label: "today", overdue: false };
  if (days === 1) return { label: "tomorrow", overdue: false };
  if (days <= 7) return { label: `${days}d`, overdue: false };

  return {
    label: due.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    overdue: false,
  };
}

function ProjectChip({ projectId }: { projectId: string }) {
  const labels: Record<string, string> = {
    "metrasens": "MTS",
    "heros-chronicle": "HC",
    "pg-creative": "PGC",
    "voyager": "VOY",
    "personal-os": "OS",
    "career-ops": "CAR",
    "alchmy": "ALM",
    "writer": "WRI",
    "claude-config": "CC",
  };
  const label = labels[projectId] ?? projectId.slice(0, 4).toUpperCase();
  return (
    <span
      className={styles.projectChip}
      data-project={projectId}
      title={projectId}
    >
      {label}
    </span>
  );
}

function PriorityDot({ priority }: { priority: string }) {
  const cls = priority === "high"
    ? styles.priorityHigh
    : priority === "med"
    ? styles.priorityMed
    : styles.priorityLow;
  return (
    <span
      className={`${styles.priority} ${cls}`}
      title={`Priority: ${priority}`}
      aria-label={`Priority ${priority}`}
    />
  );
}

export function TaskRow({ task, onToggle, onDelete }: TaskRowProps) {
  const isDone = task.status === "done";

  const handleToggle = () => onToggle(task);
  const handleDelete = () => onDelete(task);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleToggle();
    }
  };

  return (
    <div className={styles.row} role="listitem">
      {/* Checkbox */}
      <button
        className={`${styles.checkbox}${isDone ? " " + styles.checkboxDone : ""}`}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        aria-label={isDone ? `Mark "${task.title}" as todo` : `Mark "${task.title}" as done`}
        aria-pressed={isDone}
        type="button"
      >
        {isDone ? "✓" : ""}
      </button>

      {/* Title */}
      <span
        className={`${styles.taskTitle}${isDone ? " " + styles.taskTitleDone : ""}`}
        title={task.title}
      >
        {task.title}
      </span>

      {/* Priority dot */}
      {task.priority && <PriorityDot priority={task.priority} />}

      {/* Project chip */}
      {task.project_id && <ProjectChip projectId={task.project_id} />}

      {/* Due date */}
      {task.due_at && (() => {
        const { label, overdue } = formatDue(task.due_at);
        return (
          <span className={`${styles.due}${overdue ? " " + styles.dueOverdue : ""}`}>
            {overdue ? "⚠" : "⏰"} {label}
          </span>
        );
      })()}

      {/* Delete */}
      <button
        className={styles.deleteBtn}
        onClick={handleDelete}
        aria-label={`Delete "${task.title}"`}
        type="button"
      >
        ✕
      </button>
    </div>
  );
}
