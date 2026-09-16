import { describe, expect, it } from "vitest";
import { computeProjectProgressFromTasks, filterProjects, sortProjectsByDueDate } from "@/features/projects/projectLogic";
import type { Project, TaskStatus } from "@/types/database";

function makeProject(overrides: Partial<Project> & { id: string }): Project {
  return {
    organization_id: "org-1",
    code: null,
    name: "Projeto",
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
    ...overrides,
  };
}

describe("computeProjectProgressFromTasks", () => {
  it("returns null with no tasks (caller keeps the project's own progress)", () => {
    expect(computeProjectProgressFromTasks([])).toBeNull();
  });

  it("computes the percentage of linked tasks that are concluido", () => {
    const statuses: TaskStatus[] = ["concluido", "concluido", "a_fazer", "backlog"];
    expect(computeProjectProgressFromTasks(statuses.map((status) => ({ status })))).toBe(50);
  });
});

describe("sortProjectsByDueDate", () => {
  it("sorts ascending by due date, undated projects last", () => {
    const late = makeProject({ id: "late", due_date: "2026-12-01" });
    const early = makeProject({ id: "early", due_date: "2026-10-01" });
    const undated = makeProject({ id: "undated", due_date: null });
    expect(sortProjectsByDueDate([late, undated, early]).map((p) => p.id)).toEqual(["early", "late", "undated"]);
  });
});

describe("filterProjects", () => {
  const projects: Project[] = [
    makeProject({ id: "1", name: "Implantação de BI", status: "em_andamento", priority: "alta", team_id: "t1" }),
    makeProject({ id: "2", name: "Portal do cliente", status: "planejamento", priority: "normal", team_id: "t2" }),
    makeProject({ id: "3", name: "Migração cloud", status: "em_risco", priority: "critica", team_id: "t1" }),
  ];

  it("returns everything with no filters", () => {
    expect(filterProjects(projects, {})).toHaveLength(3);
  });

  it("filters by status", () => {
    expect(filterProjects(projects, { statuses: ["em_risco"] }).map((p) => p.id)).toEqual(["3"]);
  });

  it("filters by team", () => {
    expect(filterProjects(projects, { teamId: "t1" }).map((p) => p.id)).toEqual(["1", "3"]);
  });

  it("filters by case-insensitive name search", () => {
    expect(filterProjects(projects, { search: "PORTAL" }).map((p) => p.id)).toEqual(["2"]);
  });

  it("combines filters with AND semantics", () => {
    expect(filterProjects(projects, { teamId: "t1", statuses: ["em_andamento"] }).map((p) => p.id)).toEqual(["1"]);
  });
});
