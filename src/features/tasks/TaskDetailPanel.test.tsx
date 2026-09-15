import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast-provider";
import type { Profile, Task, TaskComment } from "@/types/database";

vi.mock("@/repositories/taskRepository", () => ({
  listSubtasks: vi.fn(),
  createSubtask: vi.fn(),
  listTaskComments: vi.fn(),
  addTaskComment: vi.fn(),
  addTaskAssignee: vi.fn(),
  removeTaskAssignee: vi.fn(),
}));

import { TaskDetailPanel } from "@/features/tasks/TaskDetailPanel";
import {
  addTaskAssignee,
  addTaskComment,
  createSubtask,
  listSubtasks,
  listTaskComments,
  removeTaskAssignee,
} from "@/repositories/taskRepository";

const mockListSubtasks = vi.mocked(listSubtasks);
const mockCreateSubtask = vi.mocked(createSubtask);
const mockListTaskComments = vi.mocked(listTaskComments);
const mockAddTaskComment = vi.mocked(addTaskComment);
const mockAddTaskAssignee = vi.mocked(addTaskAssignee);
const mockRemoveTaskAssignee = vi.mocked(removeTaskAssignee);

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

function makeSubtask(overrides: Partial<Task> & { id: string; title: string }): Task {
  return {
    organization_id: "org-1",
    project_id: null,
    phase_id: null,
    parent_task_id: "t1",
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
    ...overrides,
  };
}

function makeComment(overrides: Partial<TaskComment> & { id: string; body: string }): TaskComment {
  return {
    task_id: "t1",
    author_id: "u1",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    edited: false,
    ...overrides,
  };
}

function renderPanel(assigneeIds: string[] = []) {
  return render(
    <ToastProvider>
      <TaskDetailPanel
        taskId="t1"
        organizationId="org-1"
        currentProfileId="user-1"
        profiles={PROFILES}
        assigneeIds={assigneeIds}
      />
    </ToastProvider>,
  );
}

beforeEach(() => {
  mockListSubtasks.mockReset();
  mockCreateSubtask.mockReset();
  mockListTaskComments.mockReset();
  mockAddTaskComment.mockReset();
  mockAddTaskAssignee.mockReset();
  mockRemoveTaskAssignee.mockReset();
});

describe("TaskDetailPanel", () => {
  it("lists subtasks and comments once loaded", async () => {
    mockListSubtasks.mockResolvedValue([makeSubtask({ id: "s1", title: "Levantar requisitos" })]);
    mockListTaskComments.mockResolvedValue([makeComment({ id: "c1", body: "Primeiro comentário" })]);

    renderPanel();

    expect(await screen.findByText("Levantar requisitos")).toBeInTheDocument();
    expect(await screen.findByText("Primeiro comentário")).toBeInTheDocument();
  });

  it("shows the assignees' names from the profile list", async () => {
    mockListSubtasks.mockResolvedValue([]);
    mockListTaskComments.mockResolvedValue([]);

    renderPanel(["u1"]);

    expect(await screen.findByText("João Pedro Silva")).toBeInTheDocument();
  });

  it("adds a comment and shows it immediately", async () => {
    const user = userEvent.setup();
    mockListSubtasks.mockResolvedValue([]);
    mockListTaskComments.mockResolvedValue([]);
    mockAddTaskComment.mockResolvedValue(makeComment({ id: "c2", body: "Novo comentário" }));

    renderPanel();
    await waitFor(() => expect(mockListTaskComments).toHaveBeenCalled());

    await user.type(screen.getByPlaceholderText(/adicionar comentário/i), "Novo comentário");
    await user.click(screen.getByRole("button", { name: /comentar/i }));

    await waitFor(() => expect(mockAddTaskComment).toHaveBeenCalledWith("t1", "user-1", "Novo comentário"));
    expect(await screen.findByText("Novo comentário")).toBeInTheDocument();
  });

  it("adds a subtask and shows it immediately", async () => {
    const user = userEvent.setup();
    mockListSubtasks.mockResolvedValue([]);
    mockListTaskComments.mockResolvedValue([]);
    mockCreateSubtask.mockResolvedValue(makeSubtask({ id: "s2", title: "Nova subtarefa" }));

    renderPanel();
    await waitFor(() => expect(mockListSubtasks).toHaveBeenCalled());

    await user.type(screen.getByPlaceholderText(/nova subtarefa/i), "Nova subtarefa");
    await user.keyboard("{Enter}");

    await waitFor(() =>
      expect(mockCreateSubtask).toHaveBeenCalledWith(
        expect.objectContaining({ parentTaskId: "t1", title: "Nova subtarefa", organizationId: "org-1" }),
      ),
    );
    expect(await screen.findByText("Nova subtarefa")).toBeInTheDocument();
  });

  it("shows an empty hint when there are no subtasks or comments yet", async () => {
    mockListSubtasks.mockResolvedValue([]);
    mockListTaskComments.mockResolvedValue([]);

    renderPanel();

    expect(await screen.findByText(/nenhuma subtarefa/i)).toBeInTheDocument();
    expect(await screen.findByText(/nenhum comentário/i)).toBeInTheDocument();
  });

  it("adds a new assignee from the picker and shows them right away", async () => {
    const user = userEvent.setup();
    mockListSubtasks.mockResolvedValue([]);
    mockListTaskComments.mockResolvedValue([]);
    mockAddTaskAssignee.mockResolvedValue(undefined);

    renderPanel(["u1"]);
    await screen.findByText("João Pedro Silva");

    await user.selectOptions(screen.getByLabelText(/adicionar responsável/i), "u2");

    await waitFor(() => expect(mockAddTaskAssignee).toHaveBeenCalledWith("t1", "u2"));
    expect(await screen.findByText("Maria Fernanda Alves")).toBeInTheDocument();
  });

  it("removes an assignee when its remove button is clicked", async () => {
    const user = userEvent.setup();
    mockListSubtasks.mockResolvedValue([]);
    mockListTaskComments.mockResolvedValue([]);
    mockRemoveTaskAssignee.mockResolvedValue(undefined);

    renderPanel(["u1"]);
    await screen.findByText("João Pedro Silva");

    await user.click(screen.getByRole("button", { name: /remover João Pedro Silva/i }));

    await waitFor(() => expect(mockRemoveTaskAssignee).toHaveBeenCalledWith("t1", "u1"));
    expect(screen.queryByRole("button", { name: /remover João Pedro Silva/i })).not.toBeInTheDocument();
  });
});
