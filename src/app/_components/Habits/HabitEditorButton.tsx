"use client";
import type { Habit } from "./types";

interface NewHabitButtonProps {
  onClick: () => void;
}

/** "+ new habit" button rendered in the HabitsView header. */
export function NewHabitButton({ onClick }: NewHabitButtonProps) {
  return (
    <button
      type="button"
      className="he-new-btn"
      onClick={onClick}
      aria-label="Create new habit"
    >
      + new habit
    </button>
  );
}

interface EditHabitButtonProps {
  habit: Habit;
  onEdit: (habit: Habit) => void;
}

/** Small inline edit button rendered next to a HabitCard. */
export function EditHabitButton({ habit, onEdit }: EditHabitButtonProps) {
  return (
    <button
      type="button"
      className="he-edit-btn"
      onClick={() => onEdit(habit)}
      aria-label={`Edit ${habit.name}`}
      title="Edit habit"
    >
      ✎
    </button>
  );
}
