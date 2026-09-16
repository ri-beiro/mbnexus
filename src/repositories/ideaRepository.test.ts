import { beforeEach, describe, expect, it, vi } from "vitest";
import { createChainableMock } from "@/test/supabaseMock";

vi.mock("@/lib/supabase", () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from "@/lib/supabase";
import {
  addIdeaComment,
  convertIdeaToProject,
  createIdea,
  listIdeaComments,
  listIdeas,
  updateIdea,
} from "@/repositories/ideaRepository";
import type { Idea } from "@/types/database";

const from = vi.mocked(supabase.from);

beforeEach(() => {
  from.mockReset();
});

describe("listIdeas", () => {
  it("lists ideas ordered by creation date", async () => {
    const rows = [{ id: "i1", title: "Automatizar relatório" }];
    const mock = createChainableMock({ data: rows, error: null });
    from.mockReturnValue(mock as never);

    const result = await listIdeas();

    expect(from).toHaveBeenCalledWith("ideas");
    expect(mock.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(result).toEqual(rows);
  });
});

describe("createIdea", () => {
  it("inserts an idea authored by the given profile", async () => {
    const row = { id: "i1", title: "Automatizar relatório" };
    const mock = createChainableMock({ data: row, error: null });
    from.mockReturnValue(mock as never);

    const result = await createIdea({
      organizationId: "org-1",
      authorId: "user-1",
      title: "Automatizar relatório",
      problem: "Processo manual demorado",
    });

    expect(from).toHaveBeenCalledWith("ideas");
    expect(mock.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        organization_id: "org-1",
        author_id: "user-1",
        title: "Automatizar relatório",
        problem: "Processo manual demorado",
        status: "ideia",
      }),
    );
    expect(result).toEqual(row);
  });
});

describe("updateIdea", () => {
  it("updates only the given idea by id", async () => {
    const mock = createChainableMock({ data: null, error: null });
    from.mockReturnValue(mock as never);

    await updateIdea("i1", { status: "em_analise" });

    expect(from).toHaveBeenCalledWith("ideas");
    expect(mock.update).toHaveBeenCalledWith({ status: "em_analise" });
    expect(mock.eq).toHaveBeenCalledWith("id", "i1");
  });
});

describe("listIdeaComments / addIdeaComment", () => {
  it("lists comments for an idea ordered oldest first", async () => {
    const rows = [{ id: "c1", body: "Ótima ideia" }];
    const mock = createChainableMock({ data: rows, error: null });
    from.mockReturnValue(mock as never);

    const result = await listIdeaComments("i1");

    expect(from).toHaveBeenCalledWith("idea_comments");
    expect(mock.eq).toHaveBeenCalledWith("idea_id", "i1");
    expect(mock.order).toHaveBeenCalledWith("created_at", { ascending: true });
    expect(result).toEqual(rows);
  });

  it("adds a comment authored by the given profile", async () => {
    const row = { id: "c1", body: "Concordo" };
    const mock = createChainableMock({ data: row, error: null });
    from.mockReturnValue(mock as never);

    const result = await addIdeaComment("i1", "user-1", "Concordo");

    expect(mock.insert).toHaveBeenCalledWith({ idea_id: "i1", author_id: "user-1", body: "Concordo" });
    expect(result).toEqual(row);
  });
});

describe("convertIdeaToProject", () => {
  it("creates a project from the idea's fields and links it back to the idea", async () => {
    const idea: Idea = {
      id: "i1",
      organization_id: "org-1",
      author_id: "user-1",
      title: "Automatizar relatório",
      problem: "Processo manual",
      proposal: "Criar script",
      expected_benefit: "Economiza 5h/semana",
      area_department_id: "dept-1",
      responsible_profile_id: "user-2",
      impact: "alto",
      effort: "medio",
      priority: "alta",
      status: "aprovada",
      converted_project_id: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    };

    const projectMock = createChainableMock({ data: { id: "p1", name: "Automatizar relatório" }, error: null });
    const updateMock = createChainableMock({ data: null, error: null });
    from.mockImplementation((table: string) => (table === "projects" ? projectMock : updateMock) as never);

    const result = await convertIdeaToProject(idea, "user-1");

    expect(from).toHaveBeenCalledWith("projects");
    expect(projectMock.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        organization_id: "org-1",
        name: "Automatizar relatório",
        description: "Processo manual",
        department_id: "dept-1",
        owner_profile_id: "user-2",
        priority: "alta",
        created_by: "user-1",
      }),
    );

    expect(from).toHaveBeenCalledWith("ideas");
    expect(updateMock.update).toHaveBeenCalledWith({ converted_project_id: "p1", status: "planejada" });
    expect(updateMock.eq).toHaveBeenCalledWith("id", "i1");

    expect(result).toEqual({ id: "p1", name: "Automatizar relatório" });
  });
});
