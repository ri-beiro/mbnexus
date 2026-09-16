import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GanttChart } from "@/features/gantt/GanttChart";
import type { Task, TaskDependency } from "@/types/database";

function makeTask(overrides: Partial<Task> & { id: string; title: string }): Task {
  return {
    organization_id: "org-1",
    project_id: "p1",
    phase_id: null,
    parent_task_id: null,
    team_id: null,
    description: null,
    status: "a_fazer",
    priority: "normal",
    start_date: "2026-09-05",
    due_date: "2026-09-10",
    estimate_minutes: null,
    progress: 0,
    recurrence_rule: null,
    created_by: "user-1",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("GanttChart", () => {
  it("renders one row per task", () => {
    const tasks = [
      makeTask({ id: "1", title: "Levantar requisitos" }),
      makeTask({ id: "2", title: "Desenvolver" }),
    ];
    render(<GanttChart tasks={tasks} dependencies={[]} onDateChange={vi.fn()} />);
    expect(screen.getByText("Levantar requisitos")).toBeInTheDocument();
    expect(screen.getByText("Desenvolver")).toBeInTheDocument();
  });

  it("shows an empty state when no task has a due date to anchor a timeline", () => {
    render(<GanttChart tasks={[makeTask({ id: "1", title: "Sem prazo", due_date: null })]} dependencies={[]} onDateChange={vi.fn()} />);
    expect(screen.getByText(/nenhuma tarefa com prazo/i)).toBeInTheDocument();
  });

  it("shows what a task depends on", () => {
    const tasks = [makeTask({ id: "1", title: "Base" }), makeTask({ id: "2", title: "Depende da base" })];
    const dependencies: TaskDependency[] = [{ id: "d1", task_id: "2", depends_on_task_id: "1", type: "finish_start" }];
    render(<GanttChart tasks={tasks} dependencies={dependencies} onDateChange={vi.fn()} />);

    const row = screen.getByTestId("gantt-row-2");
    expect(within(row).getByText(/depende de: base/i)).toBeInTheDocument();
  });

  it("calls onDateChange when a row's start or due date field changes", () => {
    const onDateChange = vi.fn();
    render(<GanttChart tasks={[makeTask({ id: "1", title: "Levantar requisitos" })]} dependencies={[]} onDateChange={onDateChange} />);

    const row = screen.getByTestId("gantt-row-1");
    fireEvent.change(within(row).getByLabelText(/início de levantar requisitos/i), { target: { value: "2026-09-06" } });
    fireEvent.change(within(row).getByLabelText(/fim de levantar requisitos/i), { target: { value: "2026-09-12" } });

    expect(onDateChange).toHaveBeenCalledWith("1", { startDate: "2026-09-06" });
    expect(onDateChange).toHaveBeenCalledWith("1", { dueDate: "2026-09-12" });
  });
});
