import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { KanbanBoard } from "@/features/kanban/KanbanBoard";
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
    board_position: null,
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
    render(<KanbanBoard tasks={[]} profiles={[]} onStatusChange={vi.fn()} onCardClick={vi.fn()} onAddCard={vi.fn()} onMove={vi.fn()} />);
    for (const label of Object.values(STATUS_LABELS)) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("places each task's card under its own status column", () => {
    const tasks = [
      makeRow({ id: "1", title: "Corrigir bug", status: "a_fazer" }),
      makeRow({ id: "2", title: "Revisar contrato", status: "em_andamento" }),
    ];
    render(<KanbanBoard tasks={tasks} profiles={[]} onStatusChange={vi.fn()} onCardClick={vi.fn()} onAddCard={vi.fn()} onMove={vi.fn()} />);

    const aFazerColumn = screen.getByTestId("kanban-column-a_fazer");
    const emAndamentoColumn = screen.getByTestId("kanban-column-em_andamento");
    expect(within(aFazerColumn).getByText("Corrigir bug")).toBeInTheDocument();
    expect(within(emAndamentoColumn).getByText("Revisar contrato")).toBeInTheDocument();
  });

  it("shows an empty-column hint when a column has no cards", () => {
    render(<KanbanBoard tasks={[]} profiles={[]} onStatusChange={vi.fn()} onCardClick={vi.fn()} onAddCard={vi.fn()} onMove={vi.fn()} />);
    const backlogColumn = screen.getByTestId("kanban-column-backlog");
    expect(within(backlogColumn).getByText(/sem tarefas/i)).toBeInTheDocument();
  });

  it("calls onStatusChange when a card's accessible status select is changed", async () => {
    const user = userEvent.setup();
    const onStatusChange = vi.fn();
    const tasks = [makeRow({ id: "1", title: "Corrigir bug", status: "a_fazer" })];
    render(<KanbanBoard tasks={tasks} profiles={[]} onStatusChange={onStatusChange} onCardClick={vi.fn()} onAddCard={vi.fn()} onMove={vi.fn()} />);

    const card = screen.getByText("Corrigir bug").closest("[data-kanban-card]") as HTMLElement;
    const select = within(card).getByLabelText(/status da tarefa/i);

    await user.selectOptions(select, "concluido");

    expect(onStatusChange).toHaveBeenCalledWith("1", "concluido");
  });

  it("calls onCardClick with the task id when the card itself is clicked", async () => {
    const user = userEvent.setup();
    const onCardClick = vi.fn();
    const tasks = [makeRow({ id: "1", title: "Corrigir bug", status: "a_fazer" })];
    render(<KanbanBoard tasks={tasks} profiles={[]} onStatusChange={vi.fn()} onCardClick={onCardClick} onAddCard={vi.fn()} onMove={vi.fn()} />);

    const card = screen.getByText("Corrigir bug").closest("[data-kanban-card]") as HTMLElement;
    await user.click(card);

    expect(onCardClick).toHaveBeenCalledWith("1");
  });

  it("does not call onCardClick when the status select itself is clicked", async () => {
    const user = userEvent.setup();
    const onCardClick = vi.fn();
    const tasks = [makeRow({ id: "1", title: "Corrigir bug", status: "a_fazer" })];
    render(<KanbanBoard tasks={tasks} profiles={[]} onStatusChange={vi.fn()} onCardClick={onCardClick} onAddCard={vi.fn()} onMove={vi.fn()} />);

    const card = screen.getByText("Corrigir bug").closest("[data-kanban-card]") as HTMLElement;
    const select = within(card).getByLabelText(/status da tarefa/i);
    await user.click(select);

    expect(onCardClick).not.toHaveBeenCalled();
  });

  it("calls onAddCard with the column's status when its add-card button is clicked", async () => {
    const user = userEvent.setup();
    const onAddCard = vi.fn();
    render(<KanbanBoard tasks={[]} profiles={[]} onStatusChange={vi.fn()} onCardClick={vi.fn()} onAddCard={onAddCard} onMove={vi.fn()} />);

    const column = screen.getByTestId("kanban-column-em_andamento");
    await user.click(within(column).getByRole("button", { name: /adicionar cartão/i }));

    expect(onAddCard).toHaveBeenCalledWith("em_andamento");
  });
});
