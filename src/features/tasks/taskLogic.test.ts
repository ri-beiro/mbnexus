import { describe, expect, it } from "vitest";
import {
  classifyTasksByDueDate,
  computeParentProgressFromSubtasks,
  filterTasks,
  formatDueDateLabel,
  sortTasksByDueDate,
  sortTasksByPriorityAndDueDate,
  splitByDueDate,
  type FilterableTask,
} from "@/features/tasks/taskLogic";
import type { Task, TaskStatus } from "@/types/database";

const REFERENCE_DATE = "2026-09-15"; // a Tuesday

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

describe("classifyTasksByDueDate", () => {
  it("returns all empty groups for an empty list", () => {
    const groups = classifyTasksByDueDate([], REFERENCE_DATE);
    expect(groups).toEqual({ overdue: [], dueToday: [], thisWeek: [], upcoming: [], completed: [] });
  });

  it("puts a task due before today (still open) in overdue", () => {
    const task = makeTask({ id: "1", due_date: "2026-09-10", status: "em_andamento" });
    const groups = classifyTasksByDueDate([task], REFERENCE_DATE);
    expect(groups.overdue).toEqual([task]);
  });

  it("puts a task due exactly today in dueToday, not overdue", () => {
    const task = makeTask({ id: "1", due_date: REFERENCE_DATE, status: "a_fazer" });
    const groups = classifyTasksByDueDate([task], REFERENCE_DATE);
    expect(groups.dueToday).toEqual([task]);
    expect(groups.overdue).toEqual([]);
  });

  it("puts a task due within the next 7 days in thisWeek", () => {
    const task = makeTask({ id: "1", due_date: "2026-09-20", status: "a_fazer" }); // +5 days
    const groups = classifyTasksByDueDate([task], REFERENCE_DATE);
    expect(groups.thisWeek).toEqual([task]);
  });

  it("treats the 7-day boundary as inclusive (this week, not upcoming)", () => {
    const task = makeTask({ id: "1", due_date: "2026-09-22", status: "a_fazer" }); // exactly +7 days
    const groups = classifyTasksByDueDate([task], REFERENCE_DATE);
    expect(groups.thisWeek).toEqual([task]);
    expect(groups.upcoming).toEqual([]);
  });

  it("puts a task due beyond 7 days in upcoming", () => {
    const task = makeTask({ id: "1", due_date: "2026-09-23", status: "a_fazer" }); // +8 days
    const groups = classifyTasksByDueDate([task], REFERENCE_DATE);
    expect(groups.upcoming).toEqual([task]);
  });

  it("puts a task with no due date in upcoming rather than dropping it", () => {
    const task = makeTask({ id: "1", due_date: null, status: "backlog" });
    const groups = classifyTasksByDueDate([task], REFERENCE_DATE);
    expect(groups.upcoming).toEqual([task]);
  });

  it("puts completed tasks in completed regardless of due date, even if overdue", () => {
    const task = makeTask({ id: "1", due_date: "2026-01-01", status: "concluido" });
    const groups = classifyTasksByDueDate([task], REFERENCE_DATE);
    expect(groups.completed).toEqual([task]);
    expect(groups.overdue).toEqual([]);
  });
});

describe("computeParentProgressFromSubtasks", () => {
  it("returns null when there are no subtasks (caller keeps the task's own progress)", () => {
    expect(computeParentProgressFromSubtasks([])).toBeNull();
  });

  it("computes the percentage of subtasks that are concluido", () => {
    const statuses: TaskStatus[] = ["concluido", "concluido", "concluido", "a_fazer"];
    expect(computeParentProgressFromSubtasks(statuses.map((status) => ({ status })))).toBe(75);
  });

  it("returns 100 when every subtask is concluido", () => {
    expect(computeParentProgressFromSubtasks([{ status: "concluido" }, { status: "concluido" }])).toBe(100);
  });

  it("returns 0 when no subtask is concluido", () => {
    expect(computeParentProgressFromSubtasks([{ status: "backlog" }, { status: "em_andamento" }])).toBe(0);
  });

  it("rounds to the nearest whole percentage", () => {
    // 1 of 3 done = 33.33...%
    const statuses: TaskStatus[] = ["concluido", "a_fazer", "a_fazer"];
    expect(computeParentProgressFromSubtasks(statuses.map((status) => ({ status })))).toBe(33);
  });
});

describe("sortTasksByDueDate", () => {
  it("sorts ascending by due date", () => {
    const late = makeTask({ id: "late", due_date: "2026-09-20" });
    const early = makeTask({ id: "early", due_date: "2026-09-10" });
    expect(sortTasksByDueDate([late, early])).toEqual([early, late]);
  });

  it("places tasks with no due date after every dated task", () => {
    const dated = makeTask({ id: "dated", due_date: "2026-09-10" });
    const noDate = makeTask({ id: "no-date", due_date: null });
    expect(sortTasksByDueDate([noDate, dated])).toEqual([dated, noDate]);
  });

  it("does not mutate the input array", () => {
    const input = [makeTask({ id: "b", due_date: "2026-09-20" }), makeTask({ id: "a", due_date: "2026-09-10" })];
    const original = [...input];
    sortTasksByDueDate(input);
    expect(input).toEqual(original);
  });
});

describe("filterTasks", () => {
  const tasks: FilterableTask[] = [
    { ...makeTask({ id: "1", title: "Corrigir bug de login", status: "a_fazer", priority: "alta", project_id: "p1" }), assigneeIds: ["u1"] },
    { ...makeTask({ id: "2", title: "Revisar contrato", status: "em_andamento", priority: "normal", project_id: "p2" }), assigneeIds: ["u2"] },
    { ...makeTask({ id: "3", title: "Preparar apresentação", status: "concluido", priority: "critica", project_id: "p1" }), assigneeIds: ["u1", "u2"] },
  ];

  it("returns every task when no filters are set", () => {
    expect(filterTasks(tasks, {})).toHaveLength(3);
  });

  it("filters by one or more statuses", () => {
    const result = filterTasks(tasks, { statuses: ["a_fazer", "em_andamento"] });
    expect(result.map((t) => t.id)).toEqual(["1", "2"]);
  });

  it("filters by project", () => {
    const result = filterTasks(tasks, { projectId: "p1" });
    expect(result.map((t) => t.id)).toEqual(["1", "3"]);
  });

  it("filters by assignee", () => {
    const result = filterTasks(tasks, { assigneeId: "u2" });
    expect(result.map((t) => t.id)).toEqual(["2", "3"]);
  });

  it("filters by case-insensitive title search", () => {
    const result = filterTasks(tasks, { search: "CONTRATO" });
    expect(result.map((t) => t.id)).toEqual(["2"]);
  });

  it("combines multiple filters with AND semantics", () => {
    const result = filterTasks(tasks, { projectId: "p1", assigneeId: "u2" });
    expect(result.map((t) => t.id)).toEqual(["3"]);
  });

  it("also matches the search term against the description", () => {
    const withDescription: FilterableTask[] = [
      { ...makeTask({ id: "4", title: "Sem relação", description: "fechar o relatório financeiro" }), assigneeIds: [] },
    ];
    const result = filterTasks(withDescription, { search: "financeiro" });
    expect(result.map((t) => t.id)).toEqual(["4"]);
  });
});

describe("sortTasksByPriorityAndDueDate", () => {
  it("sorts urgent/critical priorities before low/normal ones", () => {
    const low = makeTask({ id: "low", priority: "baixa", due_date: "2026-09-16" });
    const critical = makeTask({ id: "critical", priority: "critica", due_date: "2026-09-20" });
    expect(sortTasksByPriorityAndDueDate([low, critical]).map((t) => t.id)).toEqual(["critical", "low"]);
  });

  it("breaks ties within the same priority by soonest due date", () => {
    const later = makeTask({ id: "later", priority: "alta", due_date: "2026-09-20" });
    const sooner = makeTask({ id: "sooner", priority: "alta", due_date: "2026-09-16" });
    expect(sortTasksByPriorityAndDueDate([later, sooner]).map((t) => t.id)).toEqual(["sooner", "later"]);
  });

  it("puts tasks with no due date after dated tasks of the same priority", () => {
    const noDate = makeTask({ id: "no-date", priority: "normal", due_date: null });
    const dated = makeTask({ id: "dated", priority: "normal", due_date: "2026-09-16" });
    expect(sortTasksByPriorityAndDueDate([noDate, dated]).map((t) => t.id)).toEqual(["dated", "no-date"]);
  });

  it("does not mutate the input array", () => {
    const input = [makeTask({ id: "a", priority: "baixa" }), makeTask({ id: "b", priority: "critica" })];
    const original = [...input];
    sortTasksByPriorityAndDueDate(input);
    expect(input).toEqual(original);
  });
});

describe("splitByDueDate", () => {
  it("separates tasks with a due date from tasks without one, preserving order", () => {
    const dated = makeTask({ id: "dated", due_date: "2026-10-01" });
    const undated = makeTask({ id: "undated", due_date: null });
    const result = splitByDueDate([dated, undated]);
    expect(result.withDate).toEqual([dated]);
    expect(result.withoutDate).toEqual([undated]);
  });
});

describe("formatDueDateLabel", () => {
  it("returns null when there is no due date", () => {
    expect(formatDueDateLabel(null, "a_fazer", REFERENCE_DATE)).toBeNull();
  });

  it("returns null for a completed task, even if its due date is in the past", () => {
    expect(formatDueDateLabel("2026-01-01", "concluido", REFERENCE_DATE)).toBeNull();
  });

  it("reports how many days overdue a task is", () => {
    expect(formatDueDateLabel("2026-09-13", "a_fazer", REFERENCE_DATE)).toBe("Atrasada há 2 dias");
  });

  it("uses singular for exactly one day overdue", () => {
    expect(formatDueDateLabel("2026-09-14", "a_fazer", REFERENCE_DATE)).toBe("Atrasada há 1 dia");
  });

  it("reports a task due today", () => {
    expect(formatDueDateLabel(REFERENCE_DATE, "a_fazer", REFERENCE_DATE)).toBe("Vence hoje");
  });

  it("reports a task due tomorrow", () => {
    expect(formatDueDateLabel("2026-09-16", "a_fazer", REFERENCE_DATE)).toBe("Vence amanhã");
  });

  it("reports a task due further in the future", () => {
    expect(formatDueDateLabel("2026-09-20", "a_fazer", REFERENCE_DATE)).toBe("Vence em 5 dias");
  });
});
