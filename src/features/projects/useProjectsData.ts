import { useCallback, useEffect, useState } from "react";
import { listProjects, type ProjectListRow } from "@/repositories/projectRepository";
import { listOrgProfiles } from "@/repositories/profileRepository";
import { listTeams } from "@/repositories/hierarchyRepository";
import type { Profile, Team } from "@/types/database";

export function useProjectsData() {
  const [projects, setProjects] = useState<ProjectListRow[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [projectRows, profileRows, teamRows] = await Promise.all([listProjects(), listOrgProfiles(), listTeams()]);
      setProjects(projectRows);
      setProfiles(profileRows);
      setTeams(teamRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar os projetos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { projects, profiles, teams, loading, error, reload };
}
