import { percentageComplete } from "@/lib/progress";
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

/** Applies the filter bar (section 10/37) with AND semantics across fields. */
export function filterTasks<T extends FilterableTask>(tasks: T[], filters: TaskFilters): T[] {
  const search = filters.search?.trim().toLowerCase();

  return tasks.filter((task) => {
    if (filters.statuses && filters.statuses.length > 0 && !filters.statuses.includes(task.status)) return false;
    if (filters.priorities && filters.priorities.length > 0 && !filters.priorities.includes(task.priority)) return false;
    if (filters.projectId && task.project_id !== filters.projectId) return false;
    if (filters.assigneeId && !task.assigneeIds.includes(filters.assigneeId)) return false;
    if (search && !task.title.toLowerCase().includes(search)) return false;
    return true;
  });
}
