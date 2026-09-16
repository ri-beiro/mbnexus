import { describe, expect, it } from "vitest";
import {
  buildCalendarItems,
  buildMonthGrid,
  groupItemsByDate,
  shiftEventToDate,
  type CalendarItem,
} from "@/features/calendar/calendarLogic";
import type { Event } from "@/types/database";
import type { TaskListRow } from "@/repositories/taskRepository";

function makeTask(overrides: Partial<TaskListRow> & { id: string; title: string }): TaskListRow {
  return {
    organization_id: "org-1",
    project_id: null,
    phase_id: null,
    parent_task_id: null,
    team_id: null,
    description: null,
    status: "a_fazer",
    priority: "normal",
    start_date: null,
    due_date: null,
    estimate_minutes: null,
    progress: 0,
    recurrence_rule: null,
    created_by: "user-1",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    project_name: null,
    assigneeIds: [],
    ...overrides,
  };
}

function makeEvent(overrides: Partial<Event> & { id: string; title: string }): Event {
  return {
    organization_id: "org-1",
    description: null,
    type: "event",
    starts_at: "2026-09-20T10:00:00.000Z",
    ends_at: "2026-09-20T11:00:00.000Z",
    location: null,
    project_id: null,
    task_id: null,
    created_by: "user-1",
    teams_meeting_id: null,
    teams_join_url: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildMonthGrid", () => {
  it("returns 42 cells (6 full weeks)", () => {
    expect(buildMonthGrid(2026, 8)).toHaveLength(42); // September 2026, month is 0-indexed
  });

  it("includes every day of the target month, marked as in-month", () => {
    const grid = buildMonthGrid(2026, 8); // September has 30 days
    const inMonth = grid.filter((cell) => cell.inCurrentMonth);
    expect(inMonth).toHaveLength(30);
    expect(inMonth[0].date).toBe("2026-09-01");
    expect(inMonth[29].date).toBe("2026-09-30");
  });

  it("pads the leading/trailing days from adjacent months, marked as out-of-month", () => {
    const grid = buildMonthGrid(2026, 8);
    expect(grid[0].inCurrentMonth).toBe(false);
    expect(grid[grid.length - 1].inCurrentMonth).toBe(false);
  });

  it("produces a grid whose dates are strictly consecutive", () => {
    const grid = buildMonthGrid(2026, 8);
    for (let i = 1; i < grid.length; i++) {
      const prev = new Date(`${grid[i - 1].date}T00:00:00Z`);
      const curr = new Date(`${grid[i].date}T00:00:00Z`);
      expect((curr.getTime() - prev.getTime()) / 86400000).toBe(1);
    }
  });
});

describe("groupItemsByDate", () => {
  it("buckets items under their date key", () => {
    const items: CalendarItem[] = [
      { id: "1", date: "2026-09-20", title: "A", kind: "tarefa" },
      { id: "2", date: "2026-09-20", title: "B", kind: "evento" },
      { id: "3", date: "2026-09-21", title: "C", kind: "reuniao" },
    ];
    const grouped = groupItemsByDate(items);
    expect(grouped["2026-09-20"].map((i) => i.id)).toEqual(["1", "2"]);
    expect(grouped["2026-09-21"].map((i) => i.id)).toEqual(["3"]);
    expect(grouped["2026-09-22"]).toBeUndefined();
  });
});

describe("buildCalendarItems", () => {
  it("turns a task's due date into a 'tarefa' item", () => {
    const items = buildCalendarItems([makeTask({ id: "t1", title: "Entregar relatório", due_date: "2026-09-20" })], []);
    expect(items).toEqual([{ id: "t1", date: "2026-09-20", title: "Entregar relatório", kind: "tarefa" }]);
  });

  it("skips tasks with no due date", () => {
    expect(buildCalendarItems([makeTask({ id: "t1", title: "Sem prazo", due_date: null })], [])).toEqual([]);
  });

  it("maps each event type to its calendar kind", () => {
    const items = buildCalendarItems(
      [],
      [
        makeEvent({ id: "e1", title: "Reunião de time", type: "meeting", starts_at: "2026-09-21T14:00:00.000Z" }),
        makeEvent({ id: "e2", title: "Entrega final", type: "deadline", starts_at: "2026-09-22T00:00:00.000Z" }),
        makeEvent({ id: "e3", title: "Workshop", type: "event", starts_at: "2026-09-23T09:00:00.000Z" }),
      ],
    );
    expect(items).toEqual([
      { id: "e1", date: "2026-09-21", title: "Reunião de time", kind: "reuniao" },
      { id: "e2", date: "2026-09-22", title: "Entrega final", kind: "prazo" },
      { id: "e3", date: "2026-09-23", title: "Workshop", kind: "evento" },
    ]);
  });

  it("combines tasks and events in one list", () => {
    const items = buildCalendarItems(
      [makeTask({ id: "t1", title: "Tarefa", due_date: "2026-09-20" })],
      [makeEvent({ id: "e1", title: "Evento", starts_at: "2026-09-20T10:00:00.000Z" })],
    );
    expect(items.map((i) => i.id)).toEqual(["t1", "e1"]);
  });
});

describe("shiftEventToDate", () => {
  it("moves both starts_at and ends_at to the new date, preserving time of day and duration", () => {
    const event = makeEvent({
      id: "e1",
      title: "Reunião",
      starts_at: "2026-09-20T10:00:00.000Z",
      ends_at: "2026-09-20T11:30:00.000Z",
    });
    expect(shiftEventToDate(event, "2026-09-25")).toEqual({
      startsAt: "2026-09-25T10:00:00.000Z",
      endsAt: "2026-09-25T11:30:00.000Z",
    });
  });

  it("handles an event that spans past midnight", () => {
    const event = makeEvent({
      id: "e1",
      title: "Plantão",
      starts_at: "2026-09-20T22:00:00.000Z",
      ends_at: "2026-09-21T02:00:00.000Z",
    });
    expect(shiftEventToDate(event, "2026-09-22")).toEqual({
      startsAt: "2026-09-22T22:00:00.000Z",
      endsAt: "2026-09-23T02:00:00.000Z",
    });
  });
});
