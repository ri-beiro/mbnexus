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
  listSubtasks: vi.fn(),
  listTaskComments: vi.fn(),
  addTaskComment: vi.fn(),
  addTaskAssignee: vi.fn(),
  removeTaskAssignee: vi.fn(),
}));

vi.mock("@/repositories/profileRepository", () => ({
  listOrgProfiles: vi.fn().mockResolvedValue([]),
}));

import { Tasks } from "@/pages/Tasks";
import { createTask, listTasks, updateTask } from "@/repositories/taskRepository";

const mockListTasks = vi.mocked(listTasks);
const mockCreateTask = vi.mocked(createTask);
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
      <Tasks />
    </ToastProvider>,
  );
}

beforeEach(() => {
  mockListTasks.mockReset();
  mockCreateTask.mockReset();
  mockUpdateTask.mockReset();
});

describe("Tasks page", () => {
  it("lists tasks returned by the repository", async () => {
    mockListTasks.mockResolvedValue([
      makeRow({ id: "1", title: "Corrigir bug de login", status: "a_fazer" }),
      makeRow({ id: "2", title: "Revisar contrato", status: "em_andamento" }),
    ]);

    renderPage();

    expect(await screen.findByText("Corrigir bug de login")).toBeInTheDocument();
    expect(screen.getByText("Revisar contrato")).toBeInTheDocument();
  });

  it("shows an empty state when there are no tasks", async () => {
    mockListTasks.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText(/nenhuma tarefa/i)).toBeInTheDocument();
  });

  it("filters the visible tasks when a status filter is toggled", async () => {
    const user = userEvent.setup();
    mockListTasks.mockResolvedValue([
      makeRow({ id: "1", title: "Corrigir bug de login", status: "a_fazer" }),
      makeRow({ id: "2", title: "Revisar contrato", status: "concluido" }),
    ]);

    renderPage();
    await screen.findByText("Corrigir bug de login");

    await user.click(screen.getByRole("button", { name: /concluído/i }));

    expect(screen.queryByText("Corrigir bug de login")).not.toBeInTheDocument();
    expect(screen.getByText("Revisar contrato")).toBeInTheDocument();
  });

  it("creates a task from the quick-create input and shows it in the list", async () => {
    const user = userEvent.setup();
    mockListTasks.mockResolvedValueOnce([]);
    mockCreateTask.mockResolvedValue(
      makeRow({ id: "new-1", title: "Nova tarefa rápida" }) as never,
    );
    mockListTasks.mockResolvedValueOnce([makeRow({ id: "new-1", title: "Nova tarefa rápida" })]);

    renderPage();
    await screen.findByText(/nenhuma tarefa/i);

    const input = screen.getByPlaceholderText(/nova tarefa/i);
    await user.type(input, "Nova tarefa rápida");
    await user.keyboard("{Enter}");

    await waitFor(() =>
      expect(mockCreateTask).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Nova tarefa rápida", organizationId: "org-1", createdBy: "user-1" }),
      ),
    );
    expect(await screen.findByText("Nova tarefa rápida")).toBeInTheDocument();
  });

  it("changes a task's status inline and persists it", async () => {
    const user = userEvent.setup();
    mockListTasks.mockResolvedValue([makeRow({ id: "1", title: "Corrigir bug de login", status: "a_fazer" })]);
    mockUpdateTask.mockResolvedValue(undefined);

    renderPage();
    const row = (await screen.findByText("Corrigir bug de login")).closest("[data-task-row]") as HTMLElement;
    const statusSelect = within(row).getByLabelText(/status da tarefa/i);

    await user.selectOptions(statusSelect, "concluido");

    await waitFor(() => expect(mockUpdateTask).toHaveBeenCalledWith("1", { status: "concluido" }));
  });
});
