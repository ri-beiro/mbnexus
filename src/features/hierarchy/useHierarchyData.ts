import { useCallback, useEffect, useState } from "react";
import {
  listDepartments,
  listManagementUnits,
  listTeamMembers,
  listTeams,
} from "@/repositories/hierarchyRepository";
import { listOrgProfiles } from "@/repositories/profileRepository";
import type { Department, ManagementUnit, Profile, Team, TeamMember } from "@/types/database";

export interface HierarchyData {
  managementUnits: ManagementUnit[];
  departments: Department[];
  teams: Team[];
  teamMembers: TeamMember[];
  profiles: Profile[];
}

export function useHierarchyData() {
  const [data, setData] = useState<HierarchyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [managementUnits, departments, teams, teamMembers, profiles] = await Promise.all([
        listManagementUnits(),
        listDepartments(),
        listTeams(),
        listTeamMembers(),
        listOrgProfiles(),
      ]);
      setData({ managementUnits, departments, teams, teamMembers, profiles });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar a hierarquia.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, error, reload };
}
