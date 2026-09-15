import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/useAuth";
import { getScopeCounts, listMyTasks, type MyTask } from "@/repositories/taskRepository";
import { isManagementRole } from "@/permissions/types";

export interface HomeData {
  myTasks: MyTask[];
  scopeCounts: Awaited<ReturnType<typeof getScopeCounts>> | null;
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
        const [myTasks, scopeCounts] = await Promise.all([
          listMyTasks(profile!.id),
          isManagementRole(primaryRole) ? getScopeCounts() : Promise.resolve(null),
        ]);
        if (!cancelled) setData({ myTasks, scopeCounts });
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
