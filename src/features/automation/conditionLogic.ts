/**
 * Client-side preview/validation of an automation's `condition` jsonb
 * (section 26/27). The real evaluation that fires actions happens in the
 * scheduled Edge Function against live data; this mirrors that logic so the
 * Automação settings UI can show "this rule matches N tasks today" without a
 * round trip, using the same rules.
 */

const DONE_STATUSES = new Set(["done", "completed", "concluida", "concluído", "concluido"]);

export interface AutomationTaskContext {
  due_date: string | null;
  status: string;
  priority: string | null;
  subtasks_total: number;
  subtasks_done: number;
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00Z`).getTime();
  const to = new Date(`${toIso}T00:00:00Z`).getTime();
  return Math.round((to - from) / (24 * 60 * 60 * 1000));
}

function matchesCommonFilters(condition: Record<string, unknown>, task: AutomationTaskContext): boolean {
  if (typeof condition.status === "string" && condition.status !== task.status) return false;
  if (typeof condition.priority === "string" && condition.priority !== task.priority) return false;
  return true;
}

function matchesTrigger(
  triggerEvent: string,
  condition: Record<string, unknown>,
  task: AutomationTaskContext,
  referenceDate: string,
): boolean {
  switch (triggerEvent) {
    case "task.due_soon": {
      if (!task.due_date || DONE_STATUSES.has(task.status)) return false;
      const daysUntilDue = daysBetween(referenceDate, task.due_date);
      const window = typeof condition.days_before === "number" ? condition.days_before : 3;
      return daysUntilDue >= 0 && daysUntilDue <= window;
    }

    case "task.overdue": {
      if (!task.due_date || DONE_STATUSES.has(task.status)) return false;
      const daysOverdue = daysBetween(task.due_date, referenceDate);
      const minDaysOverdue = typeof condition.min_days_overdue === "number" ? condition.min_days_overdue : 1;
      return daysOverdue >= minDaysOverdue;
    }

    case "subtasks.completed":
      return task.subtasks_total > 0 && task.subtasks_done === task.subtasks_total;

    default:
      return false;
  }
}

/** Evaluates an automation's trigger + condition against a single task. */
export function evaluateAutomationCondition(
  triggerEvent: string,
  condition: Record<string, unknown>,
  task: AutomationTaskContext,
  referenceDate: string,
): boolean {
  return matchesTrigger(triggerEvent, condition, task, referenceDate) && matchesCommonFilters(condition, task);
}
