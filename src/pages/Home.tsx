import { AlertTriangle, CheckCircle2, FolderKanban, ListTodo, ShieldAlert } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import { useHomeData } from "@/features/home/useHomeData";
import { isManagementRole } from "@/permissions/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import type { MyTask } from "@/repositories/taskRepository";
import type { TaskPriority } from "@/types/database";

const PRIORITY_VARIANT: Record<TaskPriority, "secondary" | "default" | "warning" | "destructive"> = {
  baixa: "secondary",
  normal: "secondary",
  alta: "default",
  urgente: "warning",
  critica: "destructive",
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function classifyTasks(tasks: MyTask[]) {
  const today = new Date().toISOString().slice(0, 10);
  const in7Days = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const completed = tasks.filter((t) => t.status === "concluido");
  const pending = tasks.filter((t) => t.status !== "concluido");
  const overdue = pending.filter((t) => t.due_date && t.due_date < today);
  const dueToday = pending.filter((t) => t.due_date === today);
  const thisWeek = pending.filter((t) => t.due_date && t.due_date > today && t.due_date <= in7Days);
  const upcoming = pending.filter((t) => !t.due_date || t.due_date > in7Days);

  return { overdue, dueToday, thisWeek, upcoming, completed };
}

function TaskRow({ task }: { task: MyTask }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{task.title}</p>
        <p className="truncate text-xs text-muted-foreground">{task.project_name ?? "Sem projeto"}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {task.due_date && <span className="text-xs text-muted-foreground">{task.due_date}</span>}
        <Badge variant={PRIORITY_VARIANT[task.priority]}>{task.priority}</Badge>
      </div>
    </li>
  );
}

function TaskGroup({ title, tasks }: { title: string; tasks: MyTask[] }) {
  if (tasks.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase text-muted-foreground">
        {title} ({tasks.length})
      </h3>
      <ul className="space-y-1.5">
        {tasks.map((t) => (
          <TaskRow key={t.id} task={t} />
        ))}
      </ul>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: "warning" | "destructive" }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p
          className={
            "mt-1 text-2xl font-semibold " +
            (tone === "destructive" ? "text-destructive" : tone === "warning" ? "text-warning" : "")
          }
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

export function Home() {
  const { profile, primaryRole } = useAuth();
  const { data, loading, error } = useHomeData();

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Não foi possível carregar sua Home"
        description={error}
        className="mt-10"
      />
    );
  }

  const groups = classifyTasks(data?.myTasks ?? []);
  const firstName = profile?.full_name.split(" ")[0] ?? "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting()}, {firstName}
        </h1>
        {groups.overdue.length > 0 ? (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" /> Você possui {groups.overdue.length} tarefa(s) atrasada(s).
          </p>
        ) : (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" /> Tudo em dia.
          </p>
        )}
      </div>

      {isManagementRole(primaryRole) && data?.scopeCounts && (
        <div>
          <h2 className="mb-2 text-sm font-semibold">Resumo da minha estrutura</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Tarefas abertas" value={data.scopeCounts.tasksOpen} />
            <StatCard label="Tarefas atrasadas" value={data.scopeCounts.tasksOverdue} tone="destructive" />
            <StatCard label="Tarefas concluídas" value={data.scopeCounts.tasksCompleted} />
            <StatCard label="Projetos ativos" value={data.scopeCounts.projectsActive} />
            <StatCard label="Projetos em risco" value={data.scopeCounts.projectsAtRisk} tone="warning" />
            <StatCard label="Projetos bloqueados" value={data.scopeCounts.projectsBlocked} tone="destructive" />
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListTodo className="h-4 w-4" /> Minhas tarefas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {(data?.myTasks.length ?? 0) === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title="Nenhuma tarefa atribuída a você ainda"
              description="Quando você for adicionado a uma tarefa, ela aparecerá aqui."
            />
          ) : (
            <>
              <TaskGroup title="Atrasadas" tasks={groups.overdue} />
              <TaskGroup title="Hoje" tasks={groups.dueToday} />
              <TaskGroup title="Esta semana" tasks={groups.thisWeek} />
              <TaskGroup title="Próximas" tasks={groups.upcoming} />
              <TaskGroup title="Concluídas" tasks={groups.completed} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
