import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
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

vi.mock("@/repositories/projectRepository", () => ({
  listProjects: vi.fn().mockResolvedValue([]),
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
    board_position: null,
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
    <MemoryRouter>
      <ToastProvider>
        <Tasks />
      </ToastProvider>
    </MemoryRouter>,
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
    expect(await screen.findByText(/comece organizando/i)).toBeInTheDocument();
  });

  it("filters the visible tasks when a quick view is selected", async () => {
    const user = userEvent.setup();
    mockListTasks.mockResolvedValue([
      makeRow({ id: "1", title: "Corrigir bug de login", status: "a_fazer" }),
      makeRow({ id: "2", title: "Revisar contrato", status: "concluido" }),
    ]);

    renderPage();
    await screen.findByText("Corrigir bug de login");

    const quickViews = screen.getByRole("navigation", { name: /visualizações rápidas/i });
    await user.click(within(quickViews).getByRole("button", { name: /^concluídas/i }));

    expect(screen.queryByText("Corrigir bug de login")).not.toBeInTheDocument();
    expect(screen.getByText("Revisar contrato")).toBeInTheDocument();
  });

  it("creates a task through the creation dialog and shows it in the list", async () => {
    const user = userEvent.setup();
    mockListTasks.mockResolvedValueOnce([]);
    mockCreateTask.mockResolvedValue(makeRow({ id: "new-1", title: "Nova tarefa rápida" }) as never);
    mockListTasks.mockResolvedValueOnce([makeRow({ id: "new-1", title: "Nova tarefa rápida" })]);

    renderPage();
    await screen.findByText(/comece organizando/i);

    await user.click(screen.getByRole("button", { name: /nova tarefa/i }));
    await user.type(await screen.findByLabelText(/^título$/i), "Nova tarefa rápida");
    await user.click(screen.getByRole("button", { name: /criar tarefa/i }));

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

  it("completes a task with the quick-complete button", async () => {
    const user = userEvent.setup();
    mockListTasks.mockResolvedValue([makeRow({ id: "1", title: "Corrigir bug de login", status: "a_fazer" })]);
    mockUpdateTask.mockResolvedValue(undefined);

    renderPage();
    const row = (await screen.findByText("Corrigir bug de login")).closest("[data-task-row]") as HTMLElement;
    await user.click(within(row).getByRole("button", { name: /marcar como concluída/i }));

    await waitFor(() => expect(mockUpdateTask).toHaveBeenCalledWith("1", { status: "concluido" }));
  });

  it("reopens a completed task with the quick-complete button", async () => {
    const user = userEvent.setup();
    mockListTasks.mockResolvedValue([makeRow({ id: "1", title: "Revisar contrato", status: "concluido" })]);
    mockUpdateTask.mockResolvedValue(undefined);

    renderPage();
    const quickViews = await screen.findByRole("navigation", { name: /visualizações rápidas/i });
    await user.click(within(quickViews).getByRole("button", { name: /^concluídas/i }));
    const row = (await screen.findByText("Revisar contrato")).closest("[data-task-row]") as HTMLElement;
    await user.click(within(row).getByRole("button", { name: /reabrir tarefa/i }));

    await waitFor(() => expect(mockUpdateTask).toHaveBeenCalledWith("1", { status: "a_fazer" }));
  });

  it("changes a task's priority inline and persists it", async () => {
    const user = userEvent.setup();
    mockListTasks.mockResolvedValue([makeRow({ id: "1", title: "Corrigir bug de login", priority: "normal" })]);
    mockUpdateTask.mockResolvedValue(undefined);

    renderPage();
    const row = (await screen.findByText("Corrigir bug de login")).closest("[data-task-row]") as HTMLElement;
    await user.selectOptions(within(row).getByLabelText(/prioridade da tarefa/i), "urgente");

    await waitFor(() => expect(mockUpdateTask).toHaveBeenCalledWith("1", { priority: "urgente" }));
  });

  it("shows an overdue label for a past-due, unfinished task", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-15T12:00:00Z"));
    try {
      mockListTasks.mockResolvedValue([makeRow({ id: "1", title: "Corrigir bug de login", due_date: "2026-09-13" })]);
      renderPage();
      expect(await screen.findByText("Atrasada há 2 dias")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows a 'no match' empty state (with a clear-filters action) when filters exclude everything", async () => {
    const user = userEvent.setup();
    mockListTasks.mockResolvedValue([makeRow({ id: "1", title: "Corrigir bug de login" })]);

    renderPage();
    await screen.findByText("Corrigir bug de login");
    await user.type(screen.getByPlaceholderText(/buscar por título ou descrição/i), "não existe nenhuma tarefa assim");

    expect(await screen.findByText(/nenhuma tarefa corresponde/i)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /limpar filtros/i }).length).toBeGreaterThan(0);
  });

  it("searches by description as well as title", async () => {
    mockListTasks.mockResolvedValue([
      makeRow({ id: "1", title: "Sem relação aparente", description: "fechar o relatório financeiro" }),
      makeRow({ id: "2", title: "Outra tarefa", description: "nada a ver" }),
    ]);

    renderPage();
    await screen.findByText("Sem relação aparente");

    await userEvent.setup().type(screen.getByPlaceholderText(/buscar por título ou descrição/i), "financeiro");

    await waitFor(() => expect(screen.queryByText("Outra tarefa")).not.toBeInTheDocument());
    expect(screen.getByText("Sem relação aparente")).toBeInTheDocument();
  });
});
