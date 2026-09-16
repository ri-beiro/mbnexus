import { STATUS_ORDER } from "@/features/tasks/taskLabels";
import type { TaskStatus } from "@/types/database";

/** Buckets tasks by status for the Kanban board (section 9), one column per
 * status, always including every status key even when a column is empty so
 * the board's columns stay stable as tasks move around. Preserves the
 * caller's ordering within each column (sort before calling if needed). */
export function groupTasksByStatus<T extends { status: TaskStatus }>(tasks: T[]): Record<TaskStatus, T[]> {
  const groups = Object.fromEntries(STATUS_ORDER.map((status) => [status, [] as T[]])) as Record<TaskStatus, T[]>;
  for (const task of tasks) {
    groups[task.status].push(task);
  }
  return groups;
}

/** Pure, immutable status change used for optimistic UI updates when a card
 * is dropped in a new column — the actual persistence is a separate
 * repository call. A no-op (returns an equal-valued copy) if the id isn't
 * found, rather than throwing, since a stale drag target is a UI race, not
 * an error. */
export function moveTaskToStatus<T extends { id: string; status: TaskStatus }>(
  tasks: T[],
  taskId: string,
  newStatus: TaskStatus,
): T[] {
  return tasks.map((task) => (task.id === taskId ? { ...task, status: newStatus } : task));
}
