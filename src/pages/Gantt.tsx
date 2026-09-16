import { useEffect, useMemo, useState } from "react";
import { GanttChartSquare } from "lucide-react";
import { GanttChart } from "@/features/gantt/GanttChart";
import { listTaskDependencies, listTasks, updateTask, type TaskListRow } from "@/repositories/taskRepository";
import { listProjects, type ProjectListRow } from "@/repositories/projectRepository";
import { useToast } from "@/components/ui/toast-provider";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import type { TaskDependency } from "@/types/database";

export function Gantt() {
  const { toast } = useToast();
  const [projects, setProjects] = useState<ProjectListRow[]>([]);
  const [tasks, setTasks] = useState<TaskListRow[]>([]);
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([listProjects(), listTasks()])
      .then(([projectRows, taskRows]) => {
        if (cancelled) return;
        setProjects(projectRows);
        setTasks(taskRows);
        setSelectedProjectId((current) => current ?? projectRows[0]?.id ?? null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Não foi possível carregar o Gantt.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const projectTasks = useMemo(
    () => tasks.filter((t) => t.project_id === selectedProjectId),
    [tasks, selectedProjectId],
  );

  useEffect(() => {
    if (projectTasks.length === 0) {
      setDependencies([]);
      return;
    }
    listTaskDependencies(projectTasks.map((t) => t.id))
      .then(setDependencies)
      .catch(() => setDependencies([]));
  }, [projectTasks]);

  async function handleDateChange(taskId: string, patch: { startDate?: string; dueDate?: string }) {
    try {
      await updateTask(taskId, patch);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...toTaskPatch(patch) } : t)));
    } catch (err) {
      toast({
        title: "Não foi possível mover a tarefa",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Gantt</h1>
        <p className="text-sm text-muted-foreground">Linha do tempo das tarefas de um projeto.</p>
      </div>

      <div className="max-w-xs space-y-1.5">
        <Label htmlFor="gantt-project">Projeto</Label>
        <select
          id="gantt-project"
          value={selectedProjectId ?? ""}
          onChange={(e) => setSelectedProjectId(e.target.value || null)}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <Skeleton className="h-64" />
      ) : error ? (
        <EmptyState icon={GanttChartSquare} title="Erro ao carregar" description={error} />
      ) : projects.length === 0 ? (
        <EmptyState icon={GanttChartSquare} title="Nenhum projeto encontrado" description="Crie um projeto para ver seu Gantt." />
      ) : (
        <GanttChart tasks={projectTasks} dependencies={dependencies} onDateChange={handleDateChange} />
      )}
    </div>
  );
}

function toTaskPatch(patch: { startDate?: string; dueDate?: string }) {
  const result: { start_date?: string; due_date?: string } = {};
  if (patch.startDate) result.start_date = patch.startDate;
  if (patch.dueDate) result.due_date = patch.dueDate;
  return result;
}
