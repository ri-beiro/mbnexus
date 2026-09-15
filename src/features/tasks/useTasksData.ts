import { useCallback, useEffect, useState } from "react";
import { listTasks, type TaskListRow } from "@/repositories/taskRepository";
import { listOrgProfiles } from "@/repositories/profileRepository";
import type { Profile } from "@/types/database";

export function useTasksData() {
  const [tasks, setTasks] = useState<TaskListRow[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [taskRows, profileRows] = await Promise.all([listTasks(), listOrgProfiles()]);
      setTasks(taskRows);
      setProfiles(profileRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar as tarefas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { tasks, profiles, loading, error, reload };
}
