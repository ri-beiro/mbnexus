import { AlertTriangle, CheckCircle2, FolderKanban, LayoutDashboard, ListTodo, ShieldAlert } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import { useHomeData } from "@/features/home/useHomeData";
import { isManagementRole } from "@/permissions/types";
import { classifyTasksByDueDate } from "@/features/tasks/taskLogic";
import { PRIORITY_BADGE_VARIANT, PRIORITY_LABELS, PRIORITY_ORDER, STATUS_LABELS, STATUS_ORDER } from "@/features/tasks/taskLabels";
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_ORDER } from "@/features/projects/projectLabels";
import { countByKey } from "@/features/dashboards/dashboardLogic";
import { ChartWidget } from "@/features/dashboards/ChartWidget";
import { useCountUp } from "@/lib/useCountUp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import type { MyTask } from "@/repositories/taskRepository";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function todayLabel(): string {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).format(new Date());
}

function HeroStat({ label, value, tone }: { label: string; value: number; tone?: "warning" | "destructive" }) {
  const animated = useCountUp(value);
  return (
    <div className="flex flex-col gap-1 px-4 py-2 first:pl-0 last:pr-0">
      <span className="text-[10px] font-semibold uppercase tracking-[.12em] text-[var(--neu-text-label)]">{label}</span>
      <span
        className={
          "font-mono text-xl font-bold tabular-nums " +
          (tone === "destructive" ? "text-destructive" : tone === "warning" ? "text-warning" : "text-[var(--neu-lime-solid)]")
        }
      >
        {String(animated).padStart(2, "0")}
      </span>
    </div>
  );
}

function TaskRow({ task, index }: { task: MyTask; index: number }) {
  return (
    <li
      className="neu-sunken neu-fade-up flex items-center justify-between gap-3 px-3.5 py-2.5"
      style={{ animationDelay: `${Math.min(index, 10) * 35}ms` }}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{task.title}</p>
        <p className="truncate text-xs text-muted-foreground">{task.project_name ?? "Sem projeto"}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {task.due_date && <span className="font-mono text-xs text-muted-foreground">{task.due_date}</span>}
        <Badge variant={PRIORITY_BADGE_VARIANT[task.priority]}>{task.priority}</Badge>
      </div>
    </li>
  );
}

function TaskGroup({ title, tasks }: { title: string; tasks: MyTask[] }) {
  if (tasks.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-[10px] font-semibold uppercase tracking-[.12em] text-[var(--neu-text-label)]">
        {title} ({tasks.length})
      </h3>
      <ul className="space-y-1.5">
        {tasks.map((t, i) => (
          <TaskRow key={t.id} task={t} index={i} />
        ))}
      </ul>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: "warning" | "destructive" }) {
  const animated = useCountUp(value);
  return (
    <div className="neu-sunken p-4 transition-transform duration-200 hover:scale-[1.02]">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={
          "mt-1 font-mono text-2xl font-semibold tabular-nums " +
          (tone === "destructive" ? "text-destructive" : tone === "warning" ? "text-warning" : "")
        }
      >
        {animated}
      </p>
    </div>
  );
}

export function Home() {
  const { profile, primaryRole } = useAuth();
  const { data, loading, error } = useHomeData();

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
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

  const groups = classifyTasksByDueDate(data?.myTasks ?? [], new Date().toISOString().slice(0, 10));
  const firstName = profile?.full_name.split(" ")[0] ?? "";

  return (
    <div className="space-y-6">
      <section className="neu-surface neu-grid-bg neu-fade-up overflow-hidden p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="neu-radar h-16 w-16 shrink-0">
              <div className="neu-radar-sweep" />
              <div className="neu-radar-core neu-surface-sm flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold text-[var(--neu-lime-solid)]">
                {profile ? initials(profile.full_name) : null}
              </div>
            </div>
            <div>
              <span className="neu-sunken inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[.12em] text-[var(--neu-text-label)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--neu-lime-solid)]" /> {todayLabel()}
              </span>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">
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
          </div>

          <div className="neu-sunken flex divide-x divide-[var(--neu-divider)] px-2 py-1">
            <HeroStat label="Atrasadas" value={groups.overdue.length} tone="destructive" />
            <HeroStat label="Hoje" value={groups.dueToday.length} />
            <HeroStat label="Semana" value={groups.thisWeek.length} />
            <HeroStat label="Concluídas" value={groups.completed.length} />
          </div>
        </div>
      </section>

      {isManagementRole(primaryRole) && data?.scopeCounts && (
        <section className="neu-surface neu-fade-up space-y-5 p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <LayoutDashboard className="h-4 w-4 text-[var(--neu-lime-solid)]" /> Visão geral
          </h2>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Tarefas abertas" value={data.scopeCounts.tasksOpen} />
            <StatCard label="Tarefas atrasadas" value={data.scopeCounts.tasksOverdue} tone="destructive" />
            <StatCard label="Tarefas concluídas" value={data.scopeCounts.tasksCompleted} />
            <StatCard label="Projetos ativos" value={data.scopeCounts.projectsActive} />
            <StatCard label="Projetos em risco" value={data.scopeCounts.projectsAtRisk} tone="warning" />
            <StatCard label="Projetos bloqueados" value={data.scopeCounts.projectsBlocked} tone="destructive" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ChartWidget
              title="Tarefas por status"
              testId="widget-tasks-by-status"
              data={countByKey(data.tasks, (t) => t.status, STATUS_ORDER, (s) => STATUS_LABELS[s])}
            />
            <ChartWidget
              title="Tarefas por prioridade"
              testId="widget-tasks-by-priority"
              data={countByKey(data.tasks, (t) => t.priority, PRIORITY_ORDER, (p) => PRIORITY_LABELS[p])}
            />
            <ChartWidget
              title="Projetos por status"
              testId="widget-projects-by-status"
              data={countByKey(data.projects, (p) => p.status, PROJECT_STATUS_ORDER, (s) => PROJECT_STATUS_LABELS[s])}
            />
          </div>
        </section>
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
