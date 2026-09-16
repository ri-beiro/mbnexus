import { describe, expect, it } from "vitest";
import { computePersonReport, toCsv } from "@/features/reports/reportLogic";
import type { Task } from "@/types/database";

function makeTask(overrides: Partial<Task> & { id: string }): Task {
  return {
    organization_id: "org-1",
    project_id: null,
    phase_id: null,
    parent_task_id: null,
    team_id: null,
    title: "Tarefa",
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
    ...overrides,
  };
}

describe("computePersonReport", () => {
  const REFERENCE = "2026-09-15";

  it("returns all zeros for someone with no tasks", () => {
    const report = computePersonReport("u1", [], REFERENCE);
    expect(report).toEqual({
      profileId: "u1",
      totalTasks: 0,
      completedTasks: 0,
      overdueTasks: 0,
      completionRatePercent: 0,
      onTimeRatePercent: null,
    });
  });

  it("counts total, completed and currently-overdue tasks", () => {
    const tasks = [
      makeTask({ id: "1", status: "concluido" }),
      makeTask({ id: "2", status: "a_fazer", due_date: "2026-09-10" }), // overdue
      makeTask({ id: "3", status: "a_fazer", due_date: "2026-09-20" }), // not yet due
    ];
    const report = computePersonReport("u1", tasks, REFERENCE);
    expect(report.totalTasks).toBe(3);
    expect(report.completedTasks).toBe(1);
    expect(report.overdueTasks).toBe(1);
    expect(report.completionRatePercent).toBe(33);
  });

  it("computes on-time rate among completed tasks that had a due date", () => {
    const tasks = [
      makeTask({ id: "1", status: "concluido", due_date: "2026-09-10", updated_at: "2026-09-09T00:00:00.000Z" }), // on time
      makeTask({ id: "2", status: "concluido", due_date: "2026-09-10", updated_at: "2026-09-12T00:00:00.000Z" }), // late
      makeTask({ id: "3", status: "concluido", due_date: null }), // no due date: excluded from the rate
    ];
    const report = computePersonReport("u1", tasks, REFERENCE);
    expect(report.onTimeRatePercent).toBe(50);
  });
});

describe("toCsv", () => {
  const headers = [
    { key: "name", label: "Nome" },
    { key: "count", label: "Total" },
  ];

  it("produces a header row and one row per record", () => {
    const csv = toCsv([{ name: "Ana", count: 3 }, { name: "Bruno", count: 5 }], headers);
    expect(csv).toBe("Nome,Total\r\nAna,3\r\nBruno,5");
  });

  it("quotes and escapes values containing commas or quotes", () => {
    const csv = toCsv([{ name: 'Ana "A." Silva, Jr.', count: 1 }], headers);
    expect(csv).toBe('Nome,Total\r\n"Ana ""A."" Silva, Jr.",1');
  });

  it("returns just the header row for an empty list", () => {
    expect(toCsv([], headers)).toBe("Nome,Total");
  });
});
