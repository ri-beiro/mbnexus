import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TaskListRow, MyTask } from "@/repositories/taskRepository";
import type { ProjectListRow } from "@/repositories/projectRepository";

const mockUseAuth = vi.fn();
vi.mock("@/features/auth/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/repositories/taskRepository", () => ({
  listMyTasks: vi.fn(),
  getScopeCounts: vi.fn(),
  listTasks: vi.fn(),
}));

vi.mock("@/repositories/projectRepository", () => ({
  listProjects: vi.fn(),
}));

import { Home } from "@/pages/Home";
import { getScopeCounts, listMyTasks, listTasks } from "@/repositories/taskRepository";
import { listProjects } from "@/repositories/projectRepository";

const mockListMyTasks = vi.mocked(listMyTasks);
const mockGetScopeCounts = vi.mocked(getScopeCounts);
const mockListTasks = vi.mocked(listTasks);
const mockListProjects = vi.mocked(listProjects);

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

function makeMyTask(overrides: Partial<MyTask> & { id: string; title: string }): MyTask {
  return makeTask(overrides) as MyTask;
}

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

const SCOPE_COUNTS = {
  tasksOpen: 12,
  tasksOverdue: 3,
  tasksCompleted: 40,
  projectsActive: 5,
  projectsAtRisk: 1,
  projectsBlocked: 0,
};

function setManagementProfile() {
  mockUseAuth.mockReturnValue({
    profile: { id: "user-1", organization_id: "org-1", full_name: "Ana Gestora" },
    primaryRole: "gerente",
  });
}

function setContributorProfile() {
  mockUseAuth.mockReturnValue({
    profile: { id: "user-1", organization_id: "org-1", full_name: "Ana Colaboradora" },
    primaryRole: "colaborador",
  });
}

function renderPage() {
  return render(<Home />);
}

beforeEach(() => {
  mockUseAuth.mockReset();
  mockListMyTasks.mockReset();
  mockGetScopeCounts.mockReset();
  mockListTasks.mockReset();
  mockListProjects.mockReset();
  mockListMyTasks.mockResolvedValue([]);
});

describe("Home page", () => {
  it("greets the signed-in person by their first name", async () => {
    setContributorProfile();
    renderPage();
    expect(await screen.findByRole("heading", { name: /ana/i })).toBeInTheDocument();
  });

  it("does not show the visão geral panel for a non-management role", async () => {
    setContributorProfile();
    renderPage();
    await screen.findByText(/tudo em dia/i);
    expect(screen.queryByText(/visão geral/i)).not.toBeInTheDocument();
  });

  it("shows the summary stat cards from getScopeCounts for a management role", async () => {
    setManagementProfile();
    mockGetScopeCounts.mockResolvedValue(SCOPE_COUNTS);
    mockListTasks.mockResolvedValue([]);
    mockListProjects.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText("12")).toBeInTheDocument();
    expect(await screen.findByText("3")).toBeInTheDocument();
    expect(await screen.findByText("40")).toBeInTheDocument();
  });

  it("shows the task status distribution with real counts", async () => {
    setManagementProfile();
    mockGetScopeCounts.mockResolvedValue(SCOPE_COUNTS);
    mockListTasks.mockResolvedValue([
      makeTask({ id: "1", title: "A", status: "a_fazer" }),
      makeTask({ id: "2", title: "B", status: "a_fazer" }),
      makeTask({ id: "3", title: "C", status: "concluido" }),
    ]);
    mockListProjects.mockResolvedValue([]);

    renderPage();

    const statusWidget = await screen.findByTestId("widget-tasks-by-status");
    expect(within(statusWidget).getByText(/a fazer: 2/i)).toBeInTheDocument();
    expect(within(statusWidget).getByText(/concluído: 1/i)).toBeInTheDocument();
  });

  it("shows the project status distribution with real counts", async () => {
    setManagementProfile();
    mockGetScopeCounts.mockResolvedValue(SCOPE_COUNTS);
    mockListTasks.mockResolvedValue([]);
    mockListProjects.mockResolvedValue([
      makeProject({ id: "p1", name: "Projeto A", status: "em_risco" }),
      makeProject({ id: "p2", name: "Projeto B", status: "em_risco" }),
    ]);

    renderPage();

    const widget = await screen.findByTestId("widget-projects-by-status");
    expect(within(widget).getByText(/em risco: 2/i)).toBeInTheDocument();
  });

  it("lists the signed-in person's own tasks grouped by due date", async () => {
    setContributorProfile();
    mockListMyTasks.mockResolvedValue([makeMyTask({ id: "1", title: "Revisar contrato", due_date: null })]);

    renderPage();

    expect(await screen.findByText("Revisar contrato")).toBeInTheDocument();
  });
});
