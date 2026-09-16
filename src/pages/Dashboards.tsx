import { useEffect, useState } from "react";
import { LayoutDashboard } from "lucide-react";
import { getScopeCounts, listTasks, type TaskListRow } from "@/repositories/taskRepository";
import { listProjects, type ProjectListRow } from "@/repositories/projectRepository";
import { countByKey } from "@/features/dashboards/dashboardLogic";
import { ChartWidget } from "@/features/dashboards/ChartWidget";
import { PRIORITY_LABELS, PRIORITY_ORDER, STATUS_LABELS, STATUS_ORDER } from "@/features/tasks/taskLabels";
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_ORDER } from "@/features/projects/projectLabels";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

interface ScopeCounts {
  tasksOpen: number;
  tasksOverdue: number;
  tasksCompleted: number;
  projectsActive: number;
  projectsAtRisk: number;
  projectsBlocked: number;
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: "warning" | "destructive" }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className={"mt-1 text-2xl font-semibold " + (tone === "destructive" ? "text-destructive" : tone === "warning" ? "text-warning" : "")}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

export function Dashboards() {
  const [counts, setCounts] = useState<ScopeCounts | null>(null);
  const [tasks, setTasks] = useState<TaskListRow[]>([]);
  const [projects, setProjects] = useState<ProjectListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getScopeCounts(), listTasks(), listProjects()])
      .then(([countsResult, taskRows, projectRows]) => {
        if (cancelled) return;
        setCounts(countsResult);
        setTasks(taskRows);
        setProjects(projectRows);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Não foi possível carregar os dashboards.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error || !counts) {
    return <EmptyState icon={LayoutDashboard} title="Erro ao carregar" description={error ?? undefined} />;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboards</h1>
        <p className="text-sm text-muted-foreground">Indicadores em tempo real do que você pode ver.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Tarefas abertas" value={counts.tasksOpen} />
        <StatCard label="Tarefas atrasadas" value={counts.tasksOverdue} tone="destructive" />
        <StatCard label="Tarefas concluídas" value={counts.tasksCompleted} />
        <StatCard label="Projetos ativos" value={counts.projectsActive} />
        <StatCard label="Projetos em risco" value={counts.projectsAtRisk} tone="warning" />
        <StatCard label="Projetos bloqueados" value={counts.projectsBlocked} tone="destructive" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ChartWidget
          title="Tarefas por status"
          testId="widget-tasks-by-status"
          data={countByKey(tasks, (t) => t.status, STATUS_ORDER, (s) => STATUS_LABELS[s])}
        />
        <ChartWidget
          title="Tarefas por prioridade"
          testId="widget-tasks-by-priority"
          data={countByKey(tasks, (t) => t.priority, PRIORITY_ORDER, (p) => PRIORITY_LABELS[p])}
        />
        <ChartWidget
          title="Projetos por status"
          testId="widget-projects-by-status"
          data={countByKey(projects, (p) => p.status, PROJECT_STATUS_ORDER, (s) => PROJECT_STATUS_LABELS[s])}
        />
      </div>
    </div>
  );
}
