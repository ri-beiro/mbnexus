import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TaskListRow } from "@/repositories/taskRepository";
import type { ProjectListRow } from "@/repositories/projectRepository";

vi.mock("@/repositories/taskRepository", () => ({
  listTasks: vi.fn(),
  getScopeCounts: vi.fn(),
}));

vi.mock("@/repositories/projectRepository", () => ({
  listProjects: vi.fn(),
}));

import { Dashboards } from "@/pages/Dashboards";
import { getScopeCounts, listTasks } from "@/repositories/taskRepository";
import { listProjects } from "@/repositories/projectRepository";

const mockListTasks = vi.mocked(listTasks);
const mockGetScopeCounts = vi.mocked(getScopeCounts);
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

function renderPage() {
  return render(<Dashboards />);
}

beforeEach(() => {
  mockListTasks.mockReset();
  mockGetScopeCounts.mockReset();
  mockListProjects.mockReset();
});

describe("Dashboards page", () => {
  it("shows the summary stat cards from getScopeCounts", async () => {
    mockGetScopeCounts.mockResolvedValue({
      tasksOpen: 12,
      tasksOverdue: 3,
      tasksCompleted: 40,
      projectsActive: 5,
      projectsAtRisk: 1,
      projectsBlocked: 0,
    });
    mockListTasks.mockResolvedValue([]);
    mockListProjects.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText("12")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("40")).toBeInTheDocument();
  });

  it("shows the task status distribution with real counts", async () => {
    mockGetScopeCounts.mockResolvedValue({
      tasksOpen: 0,
      tasksOverdue: 0,
      tasksCompleted: 0,
      projectsActive: 0,
      projectsAtRisk: 0,
      projectsBlocked: 0,
    });
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
    mockGetScopeCounts.mockResolvedValue({
      tasksOpen: 0,
      tasksOverdue: 0,
      tasksCompleted: 0,
      projectsActive: 0,
      projectsAtRisk: 0,
      projectsBlocked: 0,
    });
    mockListTasks.mockResolvedValue([]);
    mockListProjects.mockResolvedValue([
      makeProject({ id: "p1", name: "Projeto A", status: "em_risco" }),
      makeProject({ id: "p2", name: "Projeto B", status: "em_risco" }),
    ]);

    renderPage();

    const widget = await screen.findByTestId("widget-projects-by-status");
    expect(within(widget).getByText(/em risco: 2/i)).toBeInTheDocument();
  });
});
