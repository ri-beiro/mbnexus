import type { Department, ManagementUnit, Team } from "@/types/database";
import { listDepartments, listManagementUnits, listTeams } from "@/repositories/hierarchyRepository";

export interface OrgHierarchySnapshot {
  teams: Team[];
  departments: Department[];
  managementUnits: ManagementUnit[];
}

export interface ProfileOrgContext {
  cdName: string | null;
  setorName: string | null;
  reportsToProfileId: string | null;
}

/** Walks team leader -> department coordinator -> management unit manager,
 * skipping a link that points back at the profile itself (a team leader
 * doesn't report to themselves, they report to their department's
 * coordinator). The management unit's name doubles as the "CD". */
export function resolveProfileOrgContext(
  profile: { id: string; primary_team_id: string | null },
  snapshot: OrgHierarchySnapshot,
): ProfileOrgContext {
  const team = snapshot.teams.find((t) => t.id === profile.primary_team_id);
  if (team) {
    const department = snapshot.departments.find((d) => d.id === team.department_id);
    const managementUnit = department
      ? snapshot.managementUnits.find((m) => m.id === department.management_unit_id)
      : undefined;

    let reportsToProfileId: string | null = null;
    if (team.leader_profile_id && team.leader_profile_id !== profile.id) {
      reportsToProfileId = team.leader_profile_id;
    } else if (department?.coordinator_profile_id && department.coordinator_profile_id !== profile.id) {
      reportsToProfileId = department.coordinator_profile_id;
    } else if (managementUnit?.manager_profile_id && managementUnit.manager_profile_id !== profile.id) {
      reportsToProfileId = managementUnit.manager_profile_id;
    }

    return { cdName: managementUnit?.name ?? null, setorName: department?.name ?? null, reportsToProfileId };
  }

  const managedUnit = snapshot.managementUnits.find((m) => m.manager_profile_id === profile.id);
  if (managedUnit) return { cdName: managedUnit.name, setorName: null, reportsToProfileId: null };

  const coordinatedDept = snapshot.departments.find((d) => d.coordinator_profile_id === profile.id);
  if (coordinatedDept) {
    const managementUnit = snapshot.managementUnits.find((m) => m.id === coordinatedDept.management_unit_id);
    const reportsToProfileId =
      managementUnit?.manager_profile_id && managementUnit.manager_profile_id !== profile.id
        ? managementUnit.manager_profile_id
        : null;
    return { cdName: managementUnit?.name ?? null, setorName: coordinatedDept.name, reportsToProfileId };
  }

  return { cdName: null, setorName: null, reportsToProfileId: null };
}

let cachedSnapshot: Promise<OrgHierarchySnapshot> | null = null;

/** Fetched once and reused by every ProfileHoverCard instance for the rest
 * of the session — the org chart barely changes mid-session and this keeps
 * hovering an avatar from re-querying three tables every time. */
export function fetchOrgHierarchySnapshot(): Promise<OrgHierarchySnapshot> {
  if (!cachedSnapshot) {
    cachedSnapshot = Promise.all([listTeams(), listDepartments(), listManagementUnits()]).then(
      ([teams, departments, managementUnits]) => ({ teams, departments, managementUnits }),
    );
  }
  return cachedSnapshot;
}

export function resetOrgHierarchySnapshotCache(): void {
  cachedSnapshot = null;
}
