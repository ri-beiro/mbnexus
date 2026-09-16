import { useCallback, useEffect, useState } from "react";
import { listTasks, type TaskListRow } from "@/repositories/taskRepository";
import { listEvents } from "@/repositories/eventRepository";
import type { Event } from "@/types/database";

export function useCalendarData() {
  const [tasks, setTasks] = useState<TaskListRow[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [taskRows, eventRows] = await Promise.all([listTasks(), listEvents()]);
      setTasks(taskRows);
      setEvents(eventRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar o calendário.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { tasks, events, loading, error, reload };
}
