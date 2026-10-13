import { describe, expect, it } from "vitest";
import { resolveProfileOrgContext } from "@/features/profile/orgContext";
import type { Department, ManagementUnit, Team } from "@/types/database";

function makeUnit(overrides: Partial<ManagementUnit> & { id: string; name: string }): ManagementUnit {
  return {
    organization_id: "org-1",
    description: null,
    manager_profile_id: null,
    is_active: true,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

function makeDept(overrides: Partial<Department> & { id: string; name: string; management_unit_id: string }): Department {
  return {
    organization_id: "org-1",
    description: null,
    coordinator_profile_id: null,
    is_active: true,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

function makeTeam(overrides: Partial<Team> & { id: string; name: string; department_id: string }): Team {
  return {
    organization_id: "org-1",
    description: null,
    leader_profile_id: null,
    is_active: true,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

const managementUnits = [makeUnit({ id: "mu-1", name: "CD Food Town", manager_profile_id: "manager-1" })];
const departments = [
  makeDept({ id: "dept-1", name: "Transportes", management_unit_id: "mu-1", coordinator_profile_id: "coord-1" }),
];
const teams = [makeTeam({ id: "team-1", name: "Equipe ADM", department_id: "dept-1", leader_profile_id: "leader-1" })];

const snapshot = { teams, departments, managementUnits };

describe("resolveProfileOrgContext", () => {
  it("resolves the CD and reports-to (team leader) for a regular team member", () => {
    const ctx = resolveProfileOrgContext({ id: "member-1", primary_team_id: "team-1" }, snapshot);
    expect(ctx).toEqual({ cdName: "CD Food Town", setorName: "Transportes", reportsToProfileId: "leader-1" });
  });

  it("has the team leader report to the department coordinator instead of themselves", () => {
    const ctx = resolveProfileOrgContext({ id: "leader-1", primary_team_id: "team-1" }, snapshot);
    expect(ctx).toEqual({ cdName: "CD Food Town", setorName: "Transportes", reportsToProfileId: "coord-1" });
  });

  it("has a department coordinator (no team) report to the management unit manager", () => {
    const ctx = resolveProfileOrgContext({ id: "coord-1", primary_team_id: null }, snapshot);
    expect(ctx).toEqual({ cdName: "CD Food Town", setorName: "Transportes", reportsToProfileId: "manager-1" });
  });

  it("has the management unit manager report to no one", () => {
    const ctx = resolveProfileOrgContext({ id: "manager-1", primary_team_id: null }, snapshot);
    expect(ctx).toEqual({ cdName: "CD Food Town", setorName: null, reportsToProfileId: null });
  });

  it("returns nulls for a profile with no team and no hierarchy role", () => {
    const ctx = resolveProfileOrgContext({ id: "nobody", primary_team_id: null }, snapshot);
    expect(ctx).toEqual({ cdName: null, setorName: null, reportsToProfileId: null });
  });
});
