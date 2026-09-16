import type { Task } from "@/types/database";

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
}

export interface TimelineRange {
  start: string;
  end: string;
}

/** The overall timeline span for a Gantt chart: earliest start (falling
 * back to the task's own due date when it has no start_date) to latest due
 * date across all tasks, with a day of padding on each side so the first
 * and last bars aren't flush against the chart edge. Tasks with no due
 * date can't anchor a bar and are excluded; null when nothing anchors. */
export function resolveTimelineRange(tasks: Array<Pick<Task, "start_date" | "due_date">>): TimelineRange | null {
  const anchored = tasks.filter((t): t is typeof t & { due_date: string } => t.due_date !== null);
  if (anchored.length === 0) return null;

  const starts = anchored.map((t) => t.start_date ?? t.due_date);
  const ends = anchored.map((t) => t.due_date);

  const earliestStart = starts.reduce((min, d) => (d < min ? d : min));
  const latestEnd = ends.reduce((max, d) => (d > max ? d : max));

  return { start: addDays(earliestStart, -1), end: addDays(latestEnd, 1) };
}

export function buildTimelineDays(start: string, end: string): string[] {
  const days: string[] = [];
  let cursor = start;
  while (cursor <= end) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

export interface BarStyle {
  leftPx: number;
  widthPx: number;
}

/** Pixel position/width for a task's bar within the timeline, in whole-day
 * units. A task with no due_date has nothing to anchor a bar to (null); a
 * task with no start_date renders as a single-day bar on its due date. */
export function computeBarStyle(
  task: Pick<Task, "start_date" | "due_date">,
  timelineStart: string,
  dayWidthPx: number,
): BarStyle | null {
  if (!task.due_date) return null;
  const start = task.start_date ?? task.due_date;
  const leftPx = daysBetween(timelineStart, start) * dayWidthPx;
  const spanDays = daysBetween(start, task.due_date) + 1;
  return { leftPx, widthPx: spanDays * dayWidthPx };
}
