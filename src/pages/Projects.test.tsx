import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast-provider";
import type { ProjectListRow } from "@/repositories/projectRepository";

vi.mock("@/features/auth/useAuth", () => ({
  useAuth: () => ({
    profile: { id: "user-1", organization_id: "org-1", full_name: "Ana Teste" },
    hasPermission: () => true,
  }),
}));

vi.mock("@/repositories/projectRepository", () => ({
  listProjects: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  listProjectPhases: vi.fn(),
  createProjectPhase: vi.fn(),
  addProjectMember: vi.fn(),
  removeProjectMember: vi.fn(),
}));

vi.mock("@/repositories/profileRepository", () => ({
  listOrgProfiles: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/repositories/hierarchyRepository", () => ({
  listTeams: vi.fn().mockResolvedValue([]),
}));

import { Projects } from "@/pages/Projects";
import { createProject, listProjects, updateProject } from "@/repositories/projectRepository";

const mockListProjects = vi.mocked(listProjects);
const mockCreateProject = vi.mocked(createProject);
const mockUpdateProject = vi.mocked(updateProject);

function makeRow(overrides: Partial<ProjectListRow> & { id: string; name: string }): ProjectListRow {
  return {
    organization_id: "org-1",
    code: null,
    description: null,
    owner_profile_id: null,
    management_unit_id: null,
    department_id: null,
    team_id: null,
    status: "planejamento",
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
  return render(
    <ToastProvider>
      <Projects />
    </ToastProvider>,
  );
}

beforeEach(() => {
  mockListProjects.mockReset();
  mockCreateProject.mockReset();
  mockUpdateProject.mockReset();
});

describe("Projects page", () => {
  it("lists projects returned by the repository", async () => {
    mockListProjects.mockResolvedValue([
      makeRow({ id: "1", name: "Implantação de BI", status: "em_andamento" }),
      makeRow({ id: "2", name: "Portal do cliente", status: "planejamento" }),
    ]);

    renderPage();

    expect(await screen.findByText("Implantação de BI")).toBeInTheDocument();
    expect(screen.getByText("Portal do cliente")).toBeInTheDocument();
  });

  it("shows an empty state when there are no projects", async () => {
    mockListProjects.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText(/nenhum projeto/i)).toBeInTheDocument();
  });

  it("filters the visible projects when a status filter is toggled", async () => {
    const user = userEvent.setup();
    mockListProjects.mockResolvedValue([
      makeRow({ id: "1", name: "Implantação de BI", status: "em_andamento" }),
      makeRow({ id: "2", name: "Migração cloud", status: "em_risco" }),
    ]);

    renderPage();
    await screen.findByText("Implantação de BI");

    await user.click(screen.getByRole("button", { name: /^em risco$/i }));

    expect(screen.queryByText("Implantação de BI")).not.toBeInTheDocument();
    expect(screen.getByText("Migração cloud")).toBeInTheDocument();
  });

  it("creates a project from the quick-create input", async () => {
    const user = userEvent.setup();
    mockListProjects.mockResolvedValueOnce([]);
    mockCreateProject.mockResolvedValue(makeRow({ id: "new-1", name: "Novo projeto" }) as never);
    mockListProjects.mockResolvedValueOnce([makeRow({ id: "new-1", name: "Novo projeto" })]);

    renderPage();
    await screen.findByText(/nenhum projeto/i);

    const input = screen.getByPlaceholderText(/novo projeto/i);
    await user.type(input, "Novo projeto");
    await user.keyboard("{Enter}");

    await waitFor(() =>
      expect(mockCreateProject).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Novo projeto", organizationId: "org-1", createdBy: "user-1" }),
      ),
    );
    expect(await screen.findByText("Novo projeto")).toBeInTheDocument();
  });

  it("changes a project's status inline and persists it", async () => {
    const user = userEvent.setup();
    mockListProjects.mockResolvedValue([makeRow({ id: "1", name: "Implantação de BI", status: "planejamento" })]);
    mockUpdateProject.mockResolvedValue(undefined);

    renderPage();
    const row = (await screen.findByText("Implantação de BI")).closest("[data-project-row]") as HTMLElement;
    const statusSelect = within(row).getByLabelText(/status do projeto/i);

    await user.selectOptions(statusSelect, "em_andamento");

    await waitFor(() => expect(mockUpdateProject).toHaveBeenCalledWith("1", { status: "em_andamento" }));
  });
});
