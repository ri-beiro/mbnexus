import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronRight, CircleCheck, Filter, LayoutGrid, ListTodo, Plus, Search, X } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import { useTasksData } from "@/features/tasks/useTasksData";
import {
  classifyTasksByDueDate,
  filterTasks,
  formatDueDateLabel,
  sortTasksByPriorityAndDueDate,
  splitByDueDate,
  type TaskFilters,
} from "@/features/tasks/taskLogic";
import { PRIORITY_LABELS, PRIORITY_ORDER, STATUS_LABELS, STATUS_ORDER } from "@/features/tasks/taskLabels";
import { TaskDetailPanel } from "@/features/tasks/TaskDetailPanel";
import { CreateTaskDialog } from "@/features/tasks/CreateTaskDialog";
import { updateTask } from "@/repositories/taskRepository";
import type { TaskListRow } from "@/repositories/taskRepository";
import { useToast } from "@/components/ui/toast-provider";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { CountBadge } from "@/components/ui/count-badge";
import { cn } from "@/lib/utils";
import type { Profile, TaskPriority, TaskStatus } from "@/types/database";

type QuickView = "all" | "mine" | "overdue" | "today" | "upcoming" | "inProgress" | "completed";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function profileName(profiles: Profile[], id: string): string {
  return profiles.find((p) => p.id === id)?.full_name ?? "Usuário";
}

function profileAvatarUrl(profiles: Profile[], id: string): string | null {
  return profiles.find((p) => p.id === id)?.avatar_url ?? null;
}

function AssigneeStack({ profiles, assigneeIds }: { profiles: Profile[]; assigneeIds: string[] }) {
  if (assigneeIds.length === 0) return null;
  const shown = assigneeIds.slice(0, 2);
  const extra = assigneeIds.length - shown.length;
  return (
    <div className="flex -space-x-2">
      {shown.map((id) => (
        <Avatar key={id} className="h-6 w-6 border-2 border-[var(--neu-surface-from)]">
          {profileAvatarUrl(profiles, id) && <AvatarImage src={profileAvatarUrl(profiles, id)!} alt={profileName(profiles, id)} />}
          <AvatarFallback className="text-[9px]">{profileName(profiles, id).slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
      ))}
      {extra > 0 && (
        <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--neu-surface-from)] bg-[rgba(190,249,27,0.12)] text-[9px] font-semibold text-[var(--neu-lime-solid)]">
          +{extra}
        </span>
      )}
    </div>
  );
}

function TaskRow({
  task,
  index,
  profiles,
  expanded,
  onToggleExpand,
  onStatusChange,
  onPriorityChange,
  onToggleComplete,
  profile,
  reload,
}: {
  task: TaskListRow;
  index: number;
  profiles: Profile[];
  expanded: boolean;
  onToggleExpand: () => void;
  onStatusChange: (status: TaskStatus) => void;
  onPriorityChange: (priority: TaskPriority) => void;
  onToggleComplete: () => void;
  profile: { id: string; organization_id: string };
  reload: () => void;
}) {
  const isCompleted = task.status === "concluido";
  const dueLabel = formatDueDateLabel(task.due_date, task.status, todayIso());
  const isUrgent = dueLabel?.startsWith("Atrasada") || dueLabel === "Vence hoje";

  return (
    <li
      data-task-row
      className="neu-sunken neu-fade-up px-3.5 py-2.5"
      style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
    >
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onToggleComplete}
          aria-label={isCompleted ? "Reabrir tarefa" : "Marcar como concluída"}
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
            isCompleted
              ? "border-[var(--neu-lime-solid)] bg-[var(--neu-lime-solid)] text-[var(--neu-lime-ink)]"
              : "border-[var(--neu-divider)] text-transparent hover:border-[var(--neu-lime-solid)]",
          )}
        >
          <CircleCheck className="h-4 w-4" />
        </button>

        <button type="button" onClick={onToggleExpand} className="text-muted-foreground transition-colors hover:text-[var(--neu-lime-solid)]" aria-label={expanded ? "Recolher tarefa" : "Expandir tarefa"}>
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        <button type="button" onClick={onToggleExpand} className="min-w-40 flex-1 text-left">
          <p className={cn("truncate text-sm font-medium", isCompleted && "text-muted-foreground line-through")}>{task.title}</p>
          <p className="truncate text-xs text-muted-foreground">{task.project_name ?? "Sem projeto"}</p>
        </button>

        <AssigneeStack profiles={profiles} assigneeIds={task.assigneeIds} />

        {dueLabel && (
          <span className={cn("text-xs font-medium", isUrgent ? "text-destructive" : "text-muted-foreground")}>{dueLabel}</span>
        )}

        <select
          aria-label="Prioridade da tarefa"
          value={task.priority}
          onChange={(e) => onPriorityChange(e.target.value as TaskPriority)}
          className="neu-select h-9 rounded-full border-0 bg-black/10 px-3 text-xs outline-none focus-visible:neu-focus dark:bg-white/5"
        >
          {PRIORITY_ORDER.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABELS[p]}
            </option>
          ))}
        </select>

        <select
          aria-label="Status da tarefa"
          value={task.status}
          onChange={(e) => onStatusChange(e.target.value as TaskStatus)}
          className="neu-select h-9 rounded-full border-0 bg-black/10 px-3 text-xs outline-none focus-visible:neu-focus dark:bg-white/5"
        >
          {STATUS_ORDER.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>

      {expanded && (
        <div className="mt-3">
          <TaskDetailPanel
            taskId={task.id}
            organizationId={profile.organization_id}
            currentProfileId={profile.id}
            profiles={profiles}
            assigneeIds={task.assigneeIds}
            recurrenceRule={task.recurrence_rule}
            onAssigneesChange={() => reload()}
            onRecurrenceChange={() => reload()}
          />
        </div>
      )}
    </li>
  );
}

function TaskGroup({
  title,
  tasks,
  renderRow,
  collapsible,
}: {
  title: string;
  tasks: TaskListRow[];
  renderRow: (task: TaskListRow, index: number) => React.ReactNode;
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(!collapsible);
  if (tasks.length === 0) return null;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => collapsible && setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[.12em] text-[var(--neu-text-label)]",
          collapsible && "hover:text-[var(--neu-lime-solid)]",
        )}
      >
        {collapsible && (open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />)}
        {title} ({tasks.length})
      </button>
      {open && <ul className="space-y-1.5">{tasks.map((t, i) => renderRow(t, i))}</ul>}
    </div>
  );
}

export function Tasks() {
  const { profile } = useAuth();
  const { tasks, profiles, loading, error, reload } = useTasksData();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [quickView, setQuickView] = useState<QuickView>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<Set<TaskStatus>>(new Set());
  const [priorityFilter, setPriorityFilter] = useState<Set<TaskPriority>>(new Set());
  const [projectFilter, setProjectFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const projectOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const t of tasks) {
      if (t.project_id && t.project_name) seen.set(t.project_id, t.project_name);
    }
    return Array.from(seen, ([id, name]) => ({ id, name }));
  }, [tasks]);

  const filters: TaskFilters = useMemo(
    () => ({
      statuses: statusFilter.size > 0 ? Array.from(statusFilter) : undefined,
      priorities: priorityFilter.size > 0 ? Array.from(priorityFilter) : undefined,
      projectId: projectFilter || undefined,
      search: debouncedSearch || undefined,
    }),
    [statusFilter, priorityFilter, projectFilter, debouncedSearch],
  );

  const baseFiltered = filterTasks(tasks, filters);
  const mineFiltered = profile ? baseFiltered.filter((t) => t.assigneeIds.includes(profile.id)) : [];
  const today = todayIso();
  const groups = classifyTasksByDueDate(baseFiltered, today);
  const { withDate: upcomingDated, withoutDate: noDueDate } = splitByDueDate(groups.upcoming);
  const proximas = sortTasksByPriorityAndDueDate([...groups.thisWeek, ...upcomingDated]);
  const overdue = sortTasksByPriorityAndDueDate(groups.overdue);
  const dueToday = sortTasksByPriorityAndDueDate(groups.dueToday);
  const inProgress = sortTasksByPriorityAndDueDate(baseFiltered.filter((t) => t.status === "em_andamento"));
  const semPrazo = sortTasksByPriorityAndDueDate(noDueDate);
  const completed = groups.completed;

  const activeFilterCount = statusFilter.size + priorityFilter.size + (projectFilter ? 1 : 0);

  const QUICK_VIEWS: { key: QuickView; label: string; count: number }[] = [
    { key: "all", label: "Todas", count: baseFiltered.length },
    { key: "mine", label: "Minhas tarefas", count: mineFiltered.length },
    { key: "overdue", label: "Atrasadas", count: overdue.length },
    { key: "today", label: "Hoje", count: dueToday.length },
    { key: "upcoming", label: "Próximas", count: proximas.length },
    { key: "inProgress", label: "Em andamento", count: inProgress.length },
    { key: "completed", label: "Concluídas", count: completed.length },
  ];

  function clearFilters() {
    setStatusFilter(new Set());
    setPriorityFilter(new Set());
    setProjectFilter("");
    setSearch("");
  }

  function toggleStatus(status: TaskStatus) {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  function togglePriority(priority: TaskPriority) {
    setPriorityFilter((prev) => {
      const next = new Set(prev);
      if (next.has(priority)) next.delete(priority);
      else next.add(priority);
      return next;
    });
  }

  async function handleStatusChange(taskId: string, status: TaskStatus) {
    try {
      await updateTask(taskId, { status });
      await reload();
    } catch (err) {
      toast({ title: "Não foi possível atualizar o status", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    }
  }

  async function handlePriorityChange(taskId: string, priority: TaskPriority) {
    try {
      await updateTask(taskId, { priority });
      await reload();
    } catch (err) {
      toast({ title: "Não foi possível atualizar a prioridade", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    }
  }

  async function handleToggleComplete(task: TaskListRow) {
    const next: TaskStatus = task.status === "concluido" ? "a_fazer" : "concluido";
    await handleStatusChange(task.id, next);
  }

  function renderRow(task: TaskListRow, index: number) {
    if (!profile) return null;
    return (
      <TaskRow
        key={task.id}
        task={task}
        index={index}
        profiles={profiles}
        expanded={expandedId === task.id}
        onToggleExpand={() => setExpandedId(expandedId === task.id ? null : task.id)}
        onStatusChange={(status) => handleStatusChange(task.id, status)}
        onPriorityChange={(priority) => handlePriorityChange(task.id, priority)}
        onToggleComplete={() => handleToggleComplete(task)}
        profile={profile}
        reload={reload}
      />
    );
  }

  const currentGroups: { title: string; tasks: TaskListRow[]; collapsible?: boolean }[] =
    quickView === "all"
      ? [
          { title: "Atrasadas", tasks: overdue },
          { title: "Hoje", tasks: dueToday },
          { title: "Próximas", tasks: proximas },
          { title: "Sem prazo", tasks: semPrazo },
          { title: "Concluídas", tasks: completed, collapsible: true },
        ]
      : quickView === "mine"
        ? [{ title: "Minhas tarefas", tasks: sortTasksByPriorityAndDueDate(mineFiltered) }]
        : quickView === "overdue"
          ? [{ title: "Atrasadas", tasks: overdue }]
          : quickView === "today"
            ? [{ title: "Hoje", tasks: dueToday }]
            : quickView === "upcoming"
              ? [{ title: "Próximas", tasks: proximas }]
              : quickView === "inProgress"
                ? [{ title: "Em andamento", tasks: inProgress }]
                : [{ title: "Concluídas", tasks: completed }];

  const hasAnyResult = currentGroups.some((g) => g.tasks.length > 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            Tarefas <CountBadge value={baseFiltered.length} />
          </h1>
          <p className="text-sm text-muted-foreground">Organize prioridades, acompanhe prazos e mantenha sua equipe em movimento.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => navigate("/kanban")}>
            <LayoutGrid className="h-4 w-4" /> Kanban
          </Button>
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Nova tarefa
          </Button>
        </div>
      </div>

      {profile && (
        <CreateTaskDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          organizationId={profile.organization_id}
          createdBy={profile.id}
          profiles={profiles}
          onCreated={reload}
        />
      )}

      <nav aria-label="Visualizações rápidas" className="neu-surface-sm flex flex-wrap gap-1.5 p-2">
        {QUICK_VIEWS.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => setQuickView(v.key)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200",
              quickView === v.key
                ? "bg-[rgba(190,249,27,0.14)] text-[var(--neu-lime-solid)]"
                : "text-muted-foreground hover:bg-[rgba(190,249,27,0.08)] hover:text-[var(--neu-lime-solid)]",
            )}
          >
            {v.label}
            <span className="font-mono text-[10px] opacity-70">{v.count}</span>
          </button>
        ))}
      </nav>

      <div className="neu-surface-sm flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="neu-sunken flex min-w-48 flex-1 items-center gap-2 px-3.5 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título ou descrição…"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
          <Button type="button" variant={filtersOpen ? "default" : "outline"} size="sm" onClick={() => setFiltersOpen((v) => !v)}>
            <Filter className="h-3.5 w-3.5" /> Filtros {activeFilterCount > 0 && <CountBadge value={activeFilterCount} className="ml-0.5 h-4 min-w-4 px-1" />}
          </Button>
          {(activeFilterCount > 0 || search) && (
            <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-3.5 w-3.5" /> Limpar filtros
            </Button>
          )}
        </div>

        {filtersOpen && (
          <div className="neu-divider space-y-3 border-t pt-3">
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-[.1em] text-[var(--neu-text-label)]">Status</p>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_ORDER.map((status) => (
                  <Button key={status} type="button" size="sm" variant={statusFilter.has(status) ? "default" : "outline"} onClick={() => toggleStatus(status)}>
                    {STATUS_LABELS[status]}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-[.1em] text-[var(--neu-text-label)]">Prioridade</p>
              <div className="flex flex-wrap gap-1.5">
                {PRIORITY_ORDER.map((p) => (
                  <Button key={p} type="button" size="sm" variant={priorityFilter.has(p) ? "default" : "outline"} onClick={() => togglePriority(p)}>
                    {PRIORITY_LABELS[p]}
                  </Button>
                ))}
              </div>
            </div>
            {projectOptions.length > 0 && (
              <div className="space-y-1.5">
                <label htmlFor="tasks-project-filter" className="text-[10px] font-semibold uppercase tracking-[.1em] text-[var(--neu-text-label)]">
                  Projeto
                </label>
                <select
                  id="tasks-project-filter"
                  value={projectFilter}
                  onChange={(e) => setProjectFilter(e.target.value)}
                  className="neu-divider neu-select h-9 w-full max-w-xs rounded-full border bg-transparent px-3 text-xs outline-none focus-visible:neu-focus"
                >
                  <option value="">Todos os projetos</option>
                  {projectOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : error ? (
        <EmptyState icon={ListTodo} title="Não foi possível carregar as tarefas" description={error} />
      ) : !profile ? null : !hasAnyResult ? (
        activeFilterCount > 0 || search ? (
          <EmptyState
            icon={ListTodo}
            title="Nenhuma tarefa corresponde à sua busca ou aos filtros selecionados."
            action={
              <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
                Limpar filtros
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={ListTodo}
            title="Comece organizando suas atividades com sua primeira tarefa."
            action={
              <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" /> Criar tarefa
              </Button>
            }
          />
        )
      ) : (
        <div className="neu-surface flex flex-col gap-4 p-4">
          {currentGroups.map((g) => (
            <TaskGroup key={`${quickView}-${g.title}`} title={g.title} tasks={g.tasks} renderRow={renderRow} collapsible={g.collapsible} />
          ))}
        </div>
      )}
    </div>
  );
}
