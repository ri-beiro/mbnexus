import { describe, expect, it } from "vitest";
import { filterIdeas, IDEA_STATUS_ORDER, nextIdeaStatus } from "@/features/ideas/ideaLogic";
import type { Idea } from "@/types/database";

function makeIdea(overrides: Partial<Idea> & { id: string; title: string }): Idea {
  return {
    organization_id: "org-1",
    author_id: "user-1",
    problem: null,
    proposal: null,
    expected_benefit: null,
    area_department_id: null,
    responsible_profile_id: null,
    impact: null,
    effort: null,
    priority: "normal",
    status: "ideia",
    converted_project_id: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("nextIdeaStatus", () => {
  it("advances through every stage of the pipeline in order", () => {
    expect(nextIdeaStatus("ideia")).toBe("em_analise");
    expect(nextIdeaStatus("em_analise")).toBe("aprovada");
    expect(nextIdeaStatus("aprovada")).toBe("planejada");
    expect(nextIdeaStatus("planejada")).toBe("em_execucao");
    expect(nextIdeaStatus("em_execucao")).toBe("implantada");
    expect(nextIdeaStatus("implantada")).toBe("resultados");
  });

  it("returns null once at the final stage", () => {
    expect(nextIdeaStatus("resultados")).toBeNull();
  });

  it("covers every status in IDEA_STATUS_ORDER exactly once", () => {
    expect(IDEA_STATUS_ORDER).toHaveLength(7);
    expect(new Set(IDEA_STATUS_ORDER).size).toBe(7);
  });
});

describe("filterIdeas", () => {
  const ideas = [
    makeIdea({ id: "1", title: "Automatizar relatório", status: "ideia" }),
    makeIdea({ id: "2", title: "Novo processo de onboarding", status: "em_analise" }),
    makeIdea({ id: "3", title: "Dashboard financeiro", status: "aprovada" }),
  ];

  it("returns everything with no filters", () => {
    expect(filterIdeas(ideas, {})).toHaveLength(3);
  });

  it("filters by status", () => {
    expect(filterIdeas(ideas, { statuses: ["em_analise"] }).map((i) => i.id)).toEqual(["2"]);
  });

  it("filters by case-insensitive title search", () => {
    expect(filterIdeas(ideas, { search: "dashboard" }).map((i) => i.id)).toEqual(["3"]);
  });
});
