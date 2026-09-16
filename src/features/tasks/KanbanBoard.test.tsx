import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { KanbanBoard } from "@/features/tasks/KanbanBoard";
import { STATUS_LABELS } from "@/features/tasks/taskLabels";
import type { TaskListRow } from "@/repositories/taskRepository";

function makeRow(overrides: Partial<TaskListRow> & { id: string; title: string }): TaskListRow {
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

describe("KanbanBoard", () => {
  it("renders a column for every status, with its label", () => {
    render(<KanbanBoard tasks={[]} onStatusChange={vi.fn()} />);
    for (const label of Object.values(STATUS_LABELS)) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("places each task's card under its own status column", () => {
    const tasks = [
      makeRow({ id: "1", title: "Corrigir bug", status: "a_fazer" }),
      makeRow({ id: "2", title: "Revisar contrato", status: "em_andamento" }),
    ];
    render(<KanbanBoard tasks={tasks} onStatusChange={vi.fn()} />);

    const aFazerColumn = screen.getByTestId("kanban-column-a_fazer");
    const emAndamentoColumn = screen.getByTestId("kanban-column-em_andamento");
    expect(within(aFazerColumn).getByText("Corrigir bug")).toBeInTheDocument();
    expect(within(emAndamentoColumn).getByText("Revisar contrato")).toBeInTheDocument();
  });

  it("shows an empty-column hint when a column has no cards", () => {
    render(<KanbanBoard tasks={[]} onStatusChange={vi.fn()} />);
    const backlogColumn = screen.getByTestId("kanban-column-backlog");
    expect(within(backlogColumn).getByText(/sem tarefas/i)).toBeInTheDocument();
  });

  it("calls onStatusChange when a card's accessible status select is changed", async () => {
    const user = userEvent.setup();
    const onStatusChange = vi.fn();
    const tasks = [makeRow({ id: "1", title: "Corrigir bug", status: "a_fazer" })];
    render(<KanbanBoard tasks={tasks} onStatusChange={onStatusChange} />);

    const card = screen.getByText("Corrigir bug").closest("[data-kanban-card]") as HTMLElement;
    const select = within(card).getByLabelText(/status da tarefa/i);

    await user.selectOptions(select, "concluido");

    expect(onStatusChange).toHaveBeenCalledWith("1", "concluido");
  });
});
