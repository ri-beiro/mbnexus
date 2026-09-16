import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast-provider";
import type { TaskListRow } from "@/repositories/taskRepository";
import type { ProjectListRow } from "@/repositories/projectRepository";

vi.mock("@/features/auth/useAuth", () => ({
  useAuth: () => ({
    profile: { id: "user-1", organization_id: "org-1", full_name: "Ana Teste" },
    hasPermission: () => true,
  }),
}));

vi.mock("@/repositories/taskRepository", () => ({
  listTasks: vi.fn(),
  updateTask: vi.fn(),
  listTaskDependencies: vi.fn(),
}));

vi.mock("@/repositories/projectRepository", () => ({
  listProjects: vi.fn(),
}));

import { Gantt } from "@/pages/Gantt";
import { listTaskDependencies, listTasks, updateTask } from "@/repositories/taskRepository";
import { listProjects } from "@/repositories/projectRepository";

const mockListTasks = vi.mocked(listTasks);
const mockUpdateTask = vi.mocked(updateTask);
const mockListTaskDependencies = vi.mocked(listTaskDependencies);
const mockListProjects = vi.mocked(listProjects);

function makeProject(overrides: Partial<ProjectListRow> & { id: string; name: string }): ProjectListRow {
  return {
    organization_id: "org-1",
    code: null,
    description: null,
    owner_profile_id: null,
    management_unit_id: null,
    department_id: null,
    team_id: null,
    status: "em_andamento",
    priority: "normal",
    start_date: null,
    due_date: null,
    progress: 0,
    budget: null,
    template_of: null,
    created_by: "user-1",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    team_name: null,
    memberIds: [],
    computedProgress: 0,
    ...overrides,
  };
}

function makeTask(overrides: Partial<TaskListRow> & { id: string; title: string }): TaskListRow {
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
    project_name: "Projeto 1",
    assigneeIds: [],
    ...overrides,
  };
}

function renderPage() {
  return render(
    <ToastProvider>
      <Gantt />
    </ToastProvider>,
  );
}

beforeEach(() => {
  mockListTasks.mockReset();
  mockUpdateTask.mockReset();
  mockListTaskDependencies.mockReset();
  mockListProjects.mockReset();
});

describe("Gantt page", () => {
  it("shows only the selected project's tasks", async () => {
    mockListProjects.mockResolvedValue([makeProject({ id: "p1", name: "Projeto 1" }), makeProject({ id: "p2", name: "Projeto 2" })]);
    mockListTasks.mockResolvedValue([
      makeTask({ id: "t1", title: "Tarefa do projeto 1", project_id: "p1" }),
      makeTask({ id: "t2", title: "Tarefa do projeto 2", project_id: "p2" }),
    ]);
    mockListTaskDependencies.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText("Tarefa do projeto 1")).toBeInTheDocument();
    expect(screen.queryByText("Tarefa do projeto 2")).not.toBeInTheDocument();
  });

  it("switches the visible tasks when a different project is selected", async () => {
    const user = userEvent.setup();
    mockListProjects.mockResolvedValue([makeProject({ id: "p1", name: "Projeto 1" }), makeProject({ id: "p2", name: "Projeto 2" })]);
    mockListTasks.mockResolvedValue([
      makeTask({ id: "t1", title: "Tarefa do projeto 1", project_id: "p1" }),
      makeTask({ id: "t2", title: "Tarefa do projeto 2", project_id: "p2" }),
    ]);
    mockListTaskDependencies.mockResolvedValue([]);

    renderPage();
    await screen.findByText("Tarefa do projeto 1");

    await user.selectOptions(screen.getByLabelText(/^projeto$/i), "p2");

    expect(await screen.findByText("Tarefa do projeto 2")).toBeInTheDocument();
    expect(screen.queryByText("Tarefa do projeto 1")).not.toBeInTheDocument();
  });

  it("persists a date change made through a row's accessible date field", async () => {
    mockListProjects.mockResolvedValue([makeProject({ id: "p1", name: "Projeto 1" })]);
    mockListTasks.mockResolvedValue([makeTask({ id: "t1", title: "Tarefa do projeto 1" })]);
    mockListTaskDependencies.mockResolvedValue([]);
    mockUpdateTask.mockResolvedValue(undefined);

    renderPage();
    const row = await screen.findByTestId("gantt-row-t1");
    const dueInput = within(row).getByLabelText(/fim de tarefa do projeto 1/i);

    fireEvent.change(dueInput, { target: { value: "2026-09-15" } });

    await waitFor(() => expect(mockUpdateTask).toHaveBeenCalledWith("t1", { dueDate: "2026-09-15" }));
  });
});
