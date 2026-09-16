import { beforeEach, describe, expect, it, vi } from "vitest";
import { createChainableMock } from "@/test/supabaseMock";

vi.mock("@/lib/supabase", () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from "@/lib/supabase";
import {
  addProjectMember,
  createProject,
  createProjectPhase,
  deleteProject,
  listProjectPhases,
  listProjects,
  removeProjectMember,
  updateProject,
} from "@/repositories/projectRepository";

const from = vi.mocked(supabase.from);

beforeEach(() => {
  from.mockReset();
});

describe("createProject", () => {
  it("inserts a row into projects and returns it", async () => {
    const row = { id: "p1", name: "Projeto novo" };
    const mock = createChainableMock({ data: row, error: null });
    from.mockReturnValue(mock as never);

    const result = await createProject({ organizationId: "org-1", name: "Projeto novo", createdBy: "user-1" });

    expect(from).toHaveBeenCalledWith("projects");
    expect(mock.insert).toHaveBeenCalledWith(
      expect.objectContaining({ organization_id: "org-1", name: "Projeto novo", created_by: "user-1", status: "planejamento" }),
    );
    expect(result).toEqual(row);
  });

  it("throws when the insert fails", async () => {
    const mock = createChainableMock({ data: null, error: { message: "duplicate key" } });
    from.mockReturnValue(mock as never);

    await expect(createProject({ organizationId: "org-1", name: "x", createdBy: "user-1" })).rejects.toThrow(
      "duplicate key",
    );
  });
});

describe("updateProject", () => {
  it("updates only the given project by id", async () => {
    const mock = createChainableMock({ data: null, error: null });
    from.mockReturnValue(mock as never);

    await updateProject("p1", { status: "em_risco", progress: 40 });

    expect(from).toHaveBeenCalledWith("projects");
    expect(mock.update).toHaveBeenCalledWith({ status: "em_risco", progress: 40 });
    expect(mock.eq).toHaveBeenCalledWith("id", "p1");
  });
});

describe("deleteProject", () => {
  it("deletes the project by id", async () => {
    const mock = createChainableMock({ data: null, error: null });
    from.mockReturnValue(mock as never);

    await deleteProject("p1");

    expect(mock.delete).toHaveBeenCalled();
    expect(mock.eq).toHaveBeenCalledWith("id", "p1");
  });
});

describe("addProjectMember / removeProjectMember", () => {
  it("inserts a project_members row", async () => {
    const mock = createChainableMock({ data: null, error: null });
    from.mockReturnValue(mock as never);

    await addProjectMember("p1", "u1");

    expect(from).toHaveBeenCalledWith("project_members");
    expect(mock.insert).toHaveBeenCalledWith({ project_id: "p1", profile_id: "u1" });
  });

  it("deletes the matching project_members row", async () => {
    const mock = createChainableMock({ data: null, error: null });
    from.mockReturnValue(mock as never);

    await removeProjectMember("p1", "u1");

    expect(mock.delete).toHaveBeenCalled();
    expect(mock.eq).toHaveBeenCalledWith("project_id", "p1");
    expect(mock.eq).toHaveBeenCalledWith("profile_id", "u1");
  });
});

describe("listProjectPhases / createProjectPhase", () => {
  it("lists phases ordered by position", async () => {
    const rows = [{ id: "ph1", name: "Planejamento" }];
    const mock = createChainableMock({ data: rows, error: null });
    from.mockReturnValue(mock as never);

    const result = await listProjectPhases("p1");

    expect(mock.eq).toHaveBeenCalledWith("project_id", "p1");
    expect(mock.order).toHaveBeenCalledWith("position", { ascending: true });
    expect(result).toEqual(rows);
  });

  it("creates a phase for the given project", async () => {
    const row = { id: "ph2", name: "Testes", project_id: "p1" };
    const mock = createChainableMock({ data: row, error: null });
    from.mockReturnValue(mock as never);

    const result = await createProjectPhase("p1", "Testes");

    expect(mock.insert).toHaveBeenCalledWith({ project_id: "p1", name: "Testes" });
    expect(result).toEqual(row);
  });
});

describe("listProjects", () => {
  it("flattens team name, member ids and task progress for each project", async () => {
    const rows = [
      {
        id: "p1",
        name: "Projeto 1",
        due_date: "2026-09-20",
        teams: { name: "Equipe Dev" },
        project_members: [{ profile_id: "u1" }, { profile_id: "u2" }],
        tasks: [{ status: "concluido" }, { status: "a_fazer" }],
      },
    ];
    const mock = createChainableMock({ data: rows, error: null });
    from.mockReturnValue(mock as never);

    const result = await listProjects();

    expect(from).toHaveBeenCalledWith("projects");
    expect(result).toEqual([
      expect.objectContaining({
        id: "p1",
        team_name: "Equipe Dev",
        memberIds: ["u1", "u2"],
        computedProgress: 50,
      }),
    ]);
  });

  it("falls back to the stored progress when a project has no linked tasks", async () => {
    const rows = [
      {
        id: "p2",
        name: "Projeto 2",
        progress: 20,
        teams: null,
        project_members: [],
        tasks: [],
      },
    ];
    const mock = createChainableMock({ data: rows, error: null });
    from.mockReturnValue(mock as never);

    const result = await listProjects();

    expect(result[0]).toEqual(expect.objectContaining({ team_name: null, memberIds: [], computedProgress: 20 }));
  });
});
