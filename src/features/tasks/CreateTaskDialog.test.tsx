import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast-provider";
import type { Profile } from "@/types/database";
import type { ProjectListRow } from "@/repositories/projectRepository";

vi.mock("@/repositories/taskRepository", () => ({
  createTask: vi.fn(),
  addTaskAssignee: vi.fn(),
}));

vi.mock("@/repositories/projectRepository", () => ({
  listProjects: vi.fn(),
}));

import { CreateTaskDialog } from "@/features/tasks/CreateTaskDialog";
import { addTaskAssignee, createTask } from "@/repositories/taskRepository";
import { listProjects } from "@/repositories/projectRepository";

const mockCreateTask = vi.mocked(createTask);
const mockAddTaskAssignee = vi.mocked(addTaskAssignee);
const mockListProjects = vi.mocked(listProjects);

const PROFILES: Profile[] = [
  {
    id: "u1",
    organization_id: "org-1",
    full_name: "João Pedro Silva",
    email: "joao@mbnexus.dev",
    job_title: null,
    avatar_url: null,
    is_active: true,
    primary_team_id: null,
    created_at: "",
    updated_at: "",
  },
  {
    id: "u2",
    organization_id: "org-1",
    full_name: "Maria Fernanda Alves",
    email: "maria@mbnexus.dev",
    job_title: null,
    avatar_url: null,
    is_active: true,
    primary_team_id: null,
    created_at: "",
    updated_at: "",
  },
];

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
    created_by: "u1",
    created_at: "",
    updated_at: "",
    team_name: null,
    memberIds: [],
    computedProgress: 0,
    ...overrides,
  };
}

function renderDialog(onOpenChange = vi.fn(), onCreated = vi.fn()) {
  return render(
    <ToastProvider>
      <CreateTaskDialog
        open
        onOpenChange={onOpenChange}
        organizationId="org-1"
        createdBy="u1"
        profiles={PROFILES}
        onCreated={onCreated}
      />
    </ToastProvider>,
  );
}

beforeEach(() => {
  mockCreateTask.mockReset();
  mockAddTaskAssignee.mockReset();
  mockListProjects.mockReset();
  mockListProjects.mockResolvedValue([makeProject({ id: "p1", name: "Projeto Alfa" })]);
});

describe("CreateTaskDialog", () => {
  it("shows the full set of fields", async () => {
    renderDialog();
    expect(await screen.findByLabelText(/^título$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/descrição/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/prioridade/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^status$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/data de início/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/prazo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^projeto$/i)).toBeInTheDocument();
  });

  it("does not submit when the title is empty", async () => {
    const user = userEvent.setup();
    renderDialog();
    await screen.findByLabelText(/^título$/i);

    await user.click(screen.getByRole("button", { name: /criar tarefa/i }));

    expect(mockCreateTask).not.toHaveBeenCalled();
  });

  it("creates a task with the minimum required field", async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    const onOpenChange = vi.fn();
    mockCreateTask.mockResolvedValue({ id: "t1" } as never);

    renderDialog(onOpenChange, onCreated);
    await user.type(await screen.findByLabelText(/^título$/i), "Levantar requisitos");
    await user.click(screen.getByRole("button", { name: /criar tarefa/i }));

    await waitFor(() =>
      expect(mockCreateTask).toHaveBeenCalledWith(
        expect.objectContaining({ organizationId: "org-1", createdBy: "u1", title: "Levantar requisitos" }),
      ),
    );
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("submits every field filled in", async () => {
    const user = userEvent.setup();
    mockCreateTask.mockResolvedValue({ id: "t1" } as never);

    renderDialog();
    await user.type(await screen.findByLabelText(/^título$/i), "Elaborar cronograma");
    await user.type(screen.getByLabelText(/descrição/i), "Detalhar etapas do projeto");
    await user.selectOptions(screen.getByLabelText(/prioridade/i), "alta");
    await user.selectOptions(screen.getByLabelText(/^status$/i), "a_fazer");
    await user.type(screen.getByLabelText(/data de início/i), "2026-10-01");
    await user.type(screen.getByLabelText(/prazo/i), "2026-10-10");
    await user.selectOptions(await screen.findByLabelText(/^projeto$/i), "p1");
    await user.click(screen.getByRole("button", { name: /criar tarefa/i }));

    await waitFor(() =>
      expect(mockCreateTask).toHaveBeenCalledWith({
        organizationId: "org-1",
        createdBy: "u1",
        title: "Elaborar cronograma",
        description: "Detalhar etapas do projeto",
        priority: "alta",
        status: "a_fazer",
        startDate: "2026-10-01",
        dueDate: "2026-10-10",
        projectId: "p1",
      }),
    );
  });

  it("adds the selected responsible after creating the task", async () => {
    const user = userEvent.setup();
    mockCreateTask.mockResolvedValue({ id: "t1" } as never);
    mockAddTaskAssignee.mockResolvedValue(undefined);

    renderDialog();
    await user.type(await screen.findByLabelText(/^título$/i), "Testar em homologação");
    await user.selectOptions(screen.getByLabelText(/adicionar responsável/i), "u2");
    await user.click(screen.getByRole("button", { name: /criar tarefa/i }));

    await waitFor(() => expect(mockAddTaskAssignee).toHaveBeenCalledWith("t1", "u2"));
  });

  it("shows a toast and keeps the dialog open when creation fails", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    mockCreateTask.mockRejectedValue(new Error("falha ao criar"));

    renderDialog(onOpenChange);
    await user.type(await screen.findByLabelText(/^título$/i), "Corrigir bugs");
    await user.click(screen.getByRole("button", { name: /criar tarefa/i }));

    expect(await screen.findByText(/não foi possível criar a tarefa/i)).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
