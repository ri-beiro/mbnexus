import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast-provider";
import type { Team } from "@/types/database";

vi.mock("@/repositories/projectRepository", () => ({
  createProject: vi.fn(),
}));

vi.mock("@/repositories/hierarchyRepository", () => ({
  listTeams: vi.fn(),
}));

import { CreateProjectDialog } from "@/features/projects/CreateProjectDialog";
import { createProject } from "@/repositories/projectRepository";
import { listTeams } from "@/repositories/hierarchyRepository";

const mockCreateProject = vi.mocked(createProject);
const mockListTeams = vi.mocked(listTeams);

function makeTeam(overrides: Partial<Team> & { id: string; name: string }): Team {
  return {
    organization_id: "org-1",
    department_id: "dept-1",
    description: null,
    leader_profile_id: null,
    is_active: true,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

function renderDialog(onOpenChange = vi.fn(), onCreated = vi.fn()) {
  return render(
    <ToastProvider>
      <CreateProjectDialog
        open
        onOpenChange={onOpenChange}
        organizationId="org-1"
        createdBy="u1"
        onCreated={onCreated}
      />
    </ToastProvider>,
  );
}

beforeEach(() => {
  mockCreateProject.mockReset();
  mockListTeams.mockReset();
  mockListTeams.mockResolvedValue([makeTeam({ id: "team-1", name: "Equipe Dev" })]);
});

describe("CreateProjectDialog", () => {
  it("shows the full set of fields", async () => {
    renderDialog();
    expect(await screen.findByLabelText(/^nome$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/descrição/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/prioridade/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^status$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/data de início/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/prazo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^equipe$/i)).toBeInTheDocument();
  });

  it("does not submit when the name is empty", async () => {
    const user = userEvent.setup();
    renderDialog();
    await screen.findByLabelText(/^nome$/i);
    await user.click(screen.getByRole("button", { name: /criar projeto/i }));
    expect(mockCreateProject).not.toHaveBeenCalled();
  });

  it("creates a project with the minimum required field", async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    const onOpenChange = vi.fn();
    mockCreateProject.mockResolvedValue({ id: "p1" } as never);

    renderDialog(onOpenChange, onCreated);
    await user.type(await screen.findByLabelText(/^nome$/i), "Novo projeto");
    await user.click(screen.getByRole("button", { name: /criar projeto/i }));

    await waitFor(() =>
      expect(mockCreateProject).toHaveBeenCalledWith(
        expect.objectContaining({ organizationId: "org-1", createdBy: "u1", name: "Novo projeto" }),
      ),
    );
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("submits every field filled in", async () => {
    const user = userEvent.setup();
    mockCreateProject.mockResolvedValue({ id: "p1" } as never);

    renderDialog();
    await user.type(await screen.findByLabelText(/^nome$/i), "Migração Cloud");
    await user.type(screen.getByLabelText(/descrição/i), "Migrar infraestrutura");
    await user.selectOptions(screen.getByLabelText(/prioridade/i), "alta");
    await user.selectOptions(screen.getByLabelText(/^status$/i), "em_andamento");
    await user.type(screen.getByLabelText(/data de início/i), "2026-10-01");
    await user.type(screen.getByLabelText(/prazo/i), "2026-12-01");
    await user.selectOptions(await screen.findByLabelText(/^equipe$/i), "team-1");
    await user.click(screen.getByRole("button", { name: /criar projeto/i }));

    await waitFor(() =>
      expect(mockCreateProject).toHaveBeenCalledWith({
        organizationId: "org-1",
        createdBy: "u1",
        name: "Migração Cloud",
        description: "Migrar infraestrutura",
        priority: "alta",
        status: "em_andamento",
        startDate: "2026-10-01",
        dueDate: "2026-12-01",
        teamId: "team-1",
      }),
    );
  });

  it("shows a toast and keeps the dialog open when creation fails", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    mockCreateProject.mockRejectedValue(new Error("falha ao criar"));

    renderDialog(onOpenChange);
    await user.type(await screen.findByLabelText(/^nome$/i), "Projeto X");
    await user.click(screen.getByRole("button", { name: /criar projeto/i }));

    expect(await screen.findByText(/não foi possível criar o projeto/i)).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
