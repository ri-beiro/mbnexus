import { beforeEach, describe, expect, it, vi } from "vitest";
import { createChainableMock } from "@/test/supabaseMock";

vi.mock("@/lib/supabase", () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from "@/lib/supabase";
import {
  addTaskAssignee,
  addTaskComment,
  createSubtask,
  createTask,
  createTaskDependency,
  deleteTask,
  deleteTaskDependency,
  listSubtasks,
  listTaskComments,
  listTaskDependencies,
  listTasks,
  removeTaskAssignee,
  updateTask,
} from "@/repositories/taskRepository";

const from = vi.mocked(supabase.from);

beforeEach(() => {
  from.mockReset();
});

describe("createTask", () => {
  it("inserts a row into tasks and returns it", async () => {
    const row = { id: "t1", title: "Nova tarefa" };
    const mock = createChainableMock({ data: row, error: null });
    from.mockReturnValue(mock as never);

    const result = await createTask({
      organizationId: "org-1",
      title: "Nova tarefa",
      createdBy: "user-1",
    });

    expect(from).toHaveBeenCalledWith("tasks");
    expect(mock.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        organization_id: "org-1",
        title: "Nova tarefa",
        created_by: "user-1",
        status: "backlog",
        priority: "normal",
      }),
    );
    expect(result).toEqual(row);
  });

  it("throws when the insert fails", async () => {
    const mock = createChainableMock({ data: null, error: { message: "violates check constraint" } });
    from.mockReturnValue(mock as never);

    await expect(createTask({ organizationId: "org-1", title: "x", createdBy: "user-1" })).rejects.toThrow(
      "violates check constraint",
    );
  });
});

describe("updateTask", () => {
  it("updates only the given task by id", async () => {
    const mock = createChainableMock({ data: null, error: null });
    from.mockReturnValue(mock as never);

    await updateTask("t1", { status: "em_andamento", priority: "alta" });

    expect(from).toHaveBeenCalledWith("tasks");
    expect(mock.update).toHaveBeenCalledWith({ status: "em_andamento", priority: "alta" });
    expect(mock.eq).toHaveBeenCalledWith("id", "t1");
  });
});

describe("deleteTask", () => {
  it("deletes the task by id", async () => {
    const mock = createChainableMock({ data: null, error: null });
    from.mockReturnValue(mock as never);

    await deleteTask("t1");

    expect(mock.delete).toHaveBeenCalled();
    expect(mock.eq).toHaveBeenCalledWith("id", "t1");
  });
});

describe("addTaskAssignee / removeTaskAssignee", () => {
  it("inserts a task_assignees row", async () => {
    const mock = createChainableMock({ data: null, error: null });
    from.mockReturnValue(mock as never);

    await addTaskAssignee("t1", "u1");

    expect(from).toHaveBeenCalledWith("task_assignees");
    expect(mock.insert).toHaveBeenCalledWith({ task_id: "t1", profile_id: "u1" });
  });

  it("deletes the matching task_assignees row", async () => {
    const mock = createChainableMock({ data: null, error: null });
    from.mockReturnValue(mock as never);

    await removeTaskAssignee("t1", "u1");

    expect(mock.delete).toHaveBeenCalled();
    expect(mock.eq).toHaveBeenCalledWith("task_id", "t1");
    expect(mock.eq).toHaveBeenCalledWith("profile_id", "u1");
  });
});

describe("listTaskComments / addTaskComment", () => {
  it("lists comments ordered oldest first", async () => {
    const rows = [{ id: "c1", body: "primeiro" }];
    const mock = createChainableMock({ data: rows, error: null });
    from.mockReturnValue(mock as never);

    const result = await listTaskComments("t1");

    expect(from).toHaveBeenCalledWith("task_comments");
    expect(mock.eq).toHaveBeenCalledWith("task_id", "t1");
    expect(mock.order).toHaveBeenCalledWith("created_at", { ascending: true });
    expect(result).toEqual(rows);
  });

  it("inserts a comment authored by the given profile", async () => {
    const row = { id: "c2", body: "novo comentário" };
    const mock = createChainableMock({ data: row, error: null });
    from.mockReturnValue(mock as never);

    const result = await addTaskComment("t1", "u1", "novo comentário");

    expect(mock.insert).toHaveBeenCalledWith({ task_id: "t1", author_id: "u1", body: "novo comentário" });
    expect(result).toEqual(row);
  });
});

describe("listSubtasks / createSubtask", () => {
  it("lists tasks whose parent_task_id matches", async () => {
    const rows = [{ id: "s1", title: "Sub 1" }];
    const mock = createChainableMock({ data: rows, error: null });
    from.mockReturnValue(mock as never);

    const result = await listSubtasks("t1");

    expect(mock.eq).toHaveBeenCalledWith("parent_task_id", "t1");
    expect(result).toEqual(rows);
  });

  it("creates a task with parent_task_id set to the parent", async () => {
    const row = { id: "s2", title: "Sub 2", parent_task_id: "t1" };
    const mock = createChainableMock({ data: row, error: null });
    from.mockReturnValue(mock as never);

    const result = await createSubtask({
      parentTaskId: "t1",
      organizationId: "org-1",
      title: "Sub 2",
      createdBy: "user-1",
    });

    expect(mock.insert).toHaveBeenCalledWith(expect.objectContaining({ parent_task_id: "t1", title: "Sub 2" }));
    expect(result).toEqual(row);
  });
});

describe("listTasks", () => {
  it("flattens assignees and project name for each task", async () => {
    const rows = [
      {
        id: "t1",
        title: "Tarefa 1",
        due_date: "2026-09-20",
        projects: { name: "Projeto A" },
        task_assignees: [{ profile_id: "u1" }, { profile_id: "u2" }],
      },
      {
        id: "t2",
        title: "Tarefa 2",
        due_date: null,
        projects: null,
        task_assignees: [],
      },
    ];
    const mock = createChainableMock({ data: rows, error: null });
    from.mockReturnValue(mock as never);

    const result = await listTasks();

    expect(from).toHaveBeenCalledWith("tasks");
    expect(result).toEqual([
      expect.objectContaining({ id: "t1", project_name: "Projeto A", assigneeIds: ["u1", "u2"] }),
      expect.objectContaining({ id: "t2", project_name: null, assigneeIds: [] }),
    ]);
  });

  it("only lists top-level tasks (subtasks are fetched separately via listSubtasks)", async () => {
    const mock = createChainableMock({ data: [], error: null });
    from.mockReturnValue(mock as never);

    await listTasks();

    expect(mock.is).toHaveBeenCalledWith("parent_task_id", null);
  });
});

describe("listTaskDependencies / createTaskDependency / deleteTaskDependency", () => {
  it("lists dependencies whose task_id is in the given set", async () => {
    const rows = [{ id: "d1", task_id: "t2", depends_on_task_id: "t1", type: "finish_start" }];
    const mock = createChainableMock({ data: rows, error: null });
    from.mockReturnValue(mock as never);

    const result = await listTaskDependencies(["t1", "t2"]);

    expect(from).toHaveBeenCalledWith("task_dependencies");
    expect(mock.in).toHaveBeenCalledWith("task_id", ["t1", "t2"]);
    expect(result).toEqual(rows);
  });

  it("creates a finish_start dependency by default", async () => {
    const row = { id: "d1", task_id: "t2", depends_on_task_id: "t1", type: "finish_start" };
    const mock = createChainableMock({ data: row, error: null });
    from.mockReturnValue(mock as never);

    const result = await createTaskDependency("t2", "t1");

    expect(mock.insert).toHaveBeenCalledWith({ task_id: "t2", depends_on_task_id: "t1", type: "finish_start" });
    expect(result).toEqual(row);
  });

  it("deletes a dependency by id", async () => {
    const mock = createChainableMock({ data: null, error: null });
    from.mockReturnValue(mock as never);

    await deleteTaskDependency("d1");

    expect(from).toHaveBeenCalledWith("task_dependencies");
    expect(mock.delete).toHaveBeenCalled();
    expect(mock.eq).toHaveBeenCalledWith("id", "d1");
  });
});
