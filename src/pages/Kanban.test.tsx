import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast-provider";
import type { TaskListRow } from "@/repositories/taskRepository";

vi.mock("@/features/auth/useAuth", () => ({
  useAuth: () => ({
    profile: { id: "user-1", organization_id: "org-1", full_name: "Ana Teste" },
    hasPermission: () => true,
  }),
}));

vi.mock("@/repositories/taskRepository", () => ({
  listTasks: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
}));

vi.mock("@/repositories/profileRepository", () => ({
  listOrgProfiles: vi.fn().mockResolvedValue([]),
}));

import { Kanban } from "@/pages/Kanban";
import { listTasks, updateTask } from "@/repositories/taskRepository";

const mockListTasks = vi.mocked(listTasks);
const mockUpdateTask = vi.mocked(updateTask);

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

function renderPage() {
  return render(
    <ToastProvider>
      <Kanban />
    </ToastProvider>,
  );
}

beforeEach(() => {
  mockListTasks.mockReset();
  mockUpdateTask.mockReset();
});

describe("Kanban page", () => {
  it("renders the board with tasks in their status column", async () => {
    mockListTasks.mockResolvedValue([makeRow({ id: "1", title: "Corrigir bug", status: "em_andamento" })]);

    renderPage();

    const column = await screen.findByTestId("kanban-column-em_andamento");
    expect(within(column).getByText("Corrigir bug")).toBeInTheDocument();
  });

  it("persists a status change made via a card's status select", async () => {
    const user = userEvent.setup();
    mockListTasks.mockResolvedValue([makeRow({ id: "1", title: "Corrigir bug", status: "a_fazer" })]);
    mockUpdateTask.mockResolvedValue(undefined);

    renderPage();
    const card = (await screen.findByText("Corrigir bug")).closest("[data-kanban-card]") as HTMLElement;
    const select = within(card).getByLabelText(/status da tarefa/i);

    await user.selectOptions(select, "concluido");

    await waitFor(() => expect(mockUpdateTask).toHaveBeenCalledWith("1", { status: "concluido" }));
  });
});
