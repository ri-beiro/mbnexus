import { percentageComplete } from "@/lib/progress";
import { PRIORITY_ORDER } from "@/features/tasks/taskLabels";
import type { Task, TaskPriority, TaskStatus } from "@/types/database";

export interface TaskDueGroups<T> {
  overdue: T[];
  dueToday: T[];
  thisWeek: T[];
  upcoming: T[];
  completed: T[];
}

/**
 * Groups tasks the way the Home and task-list views need (sections 14/16):
 * completed tasks always land in `completed` regardless of due date (an
 * overdue-but-done task isn't a problem); everything else is bucketed by due
 * date relative to `referenceDate`, with no due date treated as `upcoming`
 * rather than dropped.
 */
export function classifyTasksByDueDate<T extends Pick<Task, "status" | "due_date">>(
  tasks: T[],
  referenceDate: string,
): TaskDueGroups<T> {
  const groups: TaskDueGroups<T> = { overdue: [], dueToday: [], thisWeek: [], upcoming: [], completed: [] };
  const in7Days = addDays(referenceDate, 7);

  for (const task of tasks) {
    if (task.status === "concluido") {
      groups.completed.push(task);
      continue;
    }
    if (!task.due_date) {
      groups.upcoming.push(task);
    } else if (task.due_date < referenceDate) {
      groups.overdue.push(task);
    } else if (task.due_date === referenceDate) {
      groups.dueToday.push(task);
    } else if (task.due_date <= in7Days) {
      groups.thisWeek.push(task);
    } else {
      groups.upcoming.push(task);
    }
  }

  return groups;
}

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Percentage of subtasks marked concluido, rounded to the nearest whole
 * number (section 8: "75% concluído" computed automatically from
 * subtasks). Returns null when there are no subtasks, so callers know to
 * keep the task's own manually-set progress instead of overwriting it.
 */
export function computeParentProgressFromSubtasks(subtasks: Array<Pick<Task, "status">>): number | null {
  return percentageComplete(subtasks, (t) => t.status === "concluido");
}

/** Default ordering for the smart list (section 5): highest priority first
 * (urgente/crítica before baixa/normal), then soonest due date, with a
 * stable tiebreak (Array#sort is stable) so equal-rank tasks keep their
 * original relative order instead of jumping around on every render. */
export function sortTasksByPriorityAndDueDate<T extends Pick<Task, "priority" | "due_date">>(tasks: T[]): T[] {
  const rank = (p: TaskPriority) => PRIORITY_ORDER.length - 1 - PRIORITY_ORDER.indexOf(p);
  return [...tasks].sort((a, b) => {
    const byPriority = rank(a.priority) - rank(b.priority);
    if (byPriority !== 0) return byPriority;
    if (a.due_date === b.due_date) return 0;
    if (a.due_date === null) return 1;
    if (b.due_date === null) return -1;
    return a.due_date < b.due_date ? -1 : 1;
  });
}

export function sortTasksByDueDate<T extends Pick<Task, "due_date">>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => {
    if (a.due_date === b.due_date) return 0;
    if (a.due_date === null) return 1;
    if (b.due_date === null) return -1;
    return a.due_date < b.due_date ? -1 : 1;
  });
}

export interface FilterableTask extends Task {
  assigneeIds: string[];
}

export interface TaskFilters {
  statuses?: TaskStatus[];
  priorities?: TaskPriority[];
  projectId?: string;
  assigneeId?: string;
  search?: string;
}

/** Applies the filter bar (section 10/37) with AND semantics across fields.
 * Search matches title or description, case-insensitively. */
export function filterTasks<T extends FilterableTask>(tasks: T[], filters: TaskFilters): T[] {
  const search = filters.search?.trim().toLowerCase();

  return tasks.filter((task) => {
    if (filters.statuses && filters.statuses.length > 0 && !filters.statuses.includes(task.status)) return false;
    if (filters.priorities && filters.priorities.length > 0 && !filters.priorities.includes(task.priority)) return false;
    if (filters.projectId && task.project_id !== filters.projectId) return false;
    if (filters.assigneeId && !task.assigneeIds.includes(filters.assigneeId)) return false;
    if (search) {
      const inTitle = task.title.toLowerCase().includes(search);
      const inDescription = task.description?.toLowerCase().includes(search) ?? false;
      if (!inTitle && !inDescription) return false;
    }
    return true;
  });
}

/** Splits classifyTasksByDueDate's `upcoming` bucket (which deliberately
 * mixes "due date more than 7 days out" with "no due date at all") into two
 * separate groups for display, so a task with no deadline isn't shown next
 * to one with a known future date under the same label. */
export function splitByDueDate<T extends Pick<Task, "due_date">>(tasks: T[]): { withDate: T[]; withoutDate: T[] } {
  const withDate: T[] = [];
  const withoutDate: T[] = [];
  for (const task of tasks) {
    (task.due_date ? withDate : withoutDate).push(task);
  }
  return { withDate, withoutDate };
}

/** Human-readable due-date text (section 5: "Atrasada há 2 dias", "Vence
 * hoje"), or null when there's nothing to say (no due date, or already
 * completed — a finished task's due date is no longer a looming deadline). */
export function formatDueDateLabel(
  dueDate: string | null,
  status: TaskStatus,
  referenceDate: string,
): string | null {
  if (!dueDate || status === "concluido") return null;

  const diffDays = daysBetween(referenceDate, dueDate);
  if (diffDays < 0) {
    const days = Math.abs(diffDays);
    return `Atrasada há ${days} ${days === 1 ? "dia" : "dias"}`;
  }
  if (diffDays === 0) return "Vence hoje";
  if (diffDays === 1) return "Vence amanhã";
  return `Vence em ${diffDays} dias`;
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = Date.UTC(...parseIsoDateParts(fromIso));
  const to = Date.UTC(...parseIsoDateParts(toIso));
  return Math.round((to - from) / 86_400_000);
}

function parseIsoDateParts(iso: string): [number, number, number] {
  const [y, m, d] = iso.split("-").map(Number);
  return [y, m - 1, d];
}
