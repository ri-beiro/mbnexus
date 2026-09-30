import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/useAuth";
import { getScopeCounts, listMyTasks, listTasks, type MyTask, type TaskListRow } from "@/repositories/taskRepository";
import { listProjects, type ProjectListRow } from "@/repositories/projectRepository";
import { isManagementRole } from "@/permissions/types";

export interface HomeData {
  myTasks: MyTask[];
  scopeCounts: Awaited<ReturnType<typeof getScopeCounts>> | null;
  tasks: TaskListRow[];
  projects: ProjectListRow[];
}

export function useHomeData() {
  const { profile, primaryRole } = useAuth();
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const managementView = isManagementRole(primaryRole);
        const [myTasks, scopeCounts, tasks, projects] = await Promise.all([
          listMyTasks(profile!.id),
          managementView ? getScopeCounts() : Promise.resolve(null),
          managementView ? listTasks() : Promise.resolve([]),
          managementView ? listProjects() : Promise.resolve([]),
        ]);
        if (!cancelled) setData({ myTasks, scopeCounts, tasks, projects });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Não foi possível carregar sua Home.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [profile, primaryRole]);

  return { data, loading, error };
}
