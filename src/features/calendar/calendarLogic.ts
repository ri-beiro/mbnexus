import type { TaskListRow } from "@/repositories/taskRepository";
import type { Event, EventType } from "@/types/database";

export interface MonthGridCell {
  date: string;
  inCurrentMonth: boolean;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** A fixed 6-week (42-cell) grid for `month` (0-indexed, matches Date's
 * convention) of `year`, padded with the surrounding month's days so every
 * row is a full week (section 11: calendário mensal). Week starts on
 * Sunday. */
export function buildMonthGrid(year: number, month: number): MonthGridCell[] {
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const start = new Date(firstOfMonth);
  start.setUTCDate(start.getUTCDate() - firstOfMonth.getUTCDay());

  const cells: MonthGridCell[] = [];
  const cursor = new Date(start);
  for (let i = 0; i < 42; i++) {
    cells.push({ date: toIsoDate(cursor), inCurrentMonth: cursor.getUTCMonth() === month });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return cells;
}

export type CalendarItemKind = "tarefa" | "evento" | "reuniao" | "prazo";

export interface CalendarItem {
  id: string;
  date: string;
  title: string;
  kind: CalendarItemKind;
}

const EVENT_TYPE_TO_KIND: Record<EventType, CalendarItemKind> = {
  event: "evento",
  meeting: "reuniao",
  deadline: "prazo",
};

/** Merges tasks (by due date) and events (by start date) into one list of
 * calendar items — the calendar doesn't hold its own data, it's another
 * view over the same tasks/events entities (section 4). */
export function buildCalendarItems(tasks: TaskListRow[], events: Event[]): CalendarItem[] {
  const taskItems: CalendarItem[] = tasks
    .filter((t): t is TaskListRow & { due_date: string } => t.due_date !== null)
    .map((t) => ({ id: t.id, date: t.due_date, title: t.title, kind: "tarefa" }));

  const eventItems: CalendarItem[] = events.map((e) => ({
    id: e.id,
    date: e.starts_at.slice(0, 10),
    title: e.title,
    kind: EVENT_TYPE_TO_KIND[e.type],
  }));

  return [...taskItems, ...eventItems];
}

/** Moves an event to `newDate` (YYYY-MM-DD), shifting both starts_at and
 * ends_at by the same number of days so time-of-day and duration are
 * preserved — used when a calendar item is dragged (or its accessible date
 * field is changed) to another day. */
export function shiftEventToDate(event: Pick<Event, "starts_at" | "ends_at">, newDate: string): { startsAt: string; endsAt: string } {
  const oldDateKey = event.starts_at.slice(0, 10);
  const deltaDays = Math.round(
    (Date.parse(`${newDate}T00:00:00.000Z`) - Date.parse(`${oldDateKey}T00:00:00.000Z`)) / 86400000,
  );

  const shift = (iso: string) => {
    const date = new Date(iso);
    date.setUTCDate(date.getUTCDate() + deltaDays);
    return date.toISOString();
  };

  return { startsAt: shift(event.starts_at), endsAt: shift(event.ends_at) };
}

export function groupItemsByDate(items: CalendarItem[]): Record<string, CalendarItem[]> {
  const groups: Record<string, CalendarItem[]> = {};
  for (const item of items) {
    (groups[item.date] ??= []).push(item);
  }
  return groups;
}
