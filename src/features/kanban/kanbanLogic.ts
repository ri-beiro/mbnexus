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

/** Stable sort by board_position ascending; tasks with no position yet
 * (null — pre-migration rows, or a race with a just-created card) sort to
 * the end, in their original relative order. */
export function sortTasksByBoardPosition<T extends { board_position: number | null }>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => {
    if (a.board_position === b.board_position) return 0;
    if (a.board_position === null) return 1;
    if (b.board_position === null) return -1;
    return a.board_position - b.board_position;
  });
}

/** Trello's own trick for drag-and-drop reordering: a dropped card's new
 * position is the midpoint between its new neighbors, so placing one card
 * only ever rewrites that one row — never the whole column. `before`/`after`
 * are the positions of the cards now immediately above/below the drop spot
 * (null when dropped at that end of the column, or into an empty one). */
export function computeBoardPosition(before: number | null, after: number | null): number {
  if (before === null && after === null) return 1000;
  if (before === null) return after! - 1000;
  if (after === null) return before + 1000;
  return (before + after) / 2;
}
