import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, ListTodo, Plus } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import { useTasksData } from "@/features/tasks/useTasksData";
import { filterTasks, type TaskFilters } from "@/features/tasks/taskLogic";
import { PRIORITY_BADGE_VARIANT, STATUS_LABELS, STATUS_ORDER } from "@/features/tasks/taskLabels";
import { TaskDetailPanel } from "@/features/tasks/TaskDetailPanel";
import { CreateTaskDialog } from "@/features/tasks/CreateTaskDialog";
import { updateTask } from "@/repositories/taskRepository";
import { useToast } from "@/components/ui/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { CountBadge } from "@/components/ui/count-badge";
import type { TaskStatus } from "@/types/database";

function StatusFilterBar({ active, onToggle }: { active: Set<TaskStatus>; onToggle: (status: TaskStatus) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {STATUS_ORDER.map((status) => (
        <Button
          key={status}
          type="button"
          size="sm"
          variant={active.has(status) ? "default" : "outline"}
          onClick={() => onToggle(status)}
        >
          {STATUS_LABELS[status]}
        </Button>
      ))}
    </div>
  );
}

export function Tasks() {
  const { profile } = useAuth();
  const { tasks, profiles, loading, error, reload } = useTasksData();
  const { toast } = useToast();

  const [statusFilter, setStatusFilter] = useState<Set<TaskStatus>>(new Set());
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filters: TaskFilters = useMemo(
    () => ({ statuses: Array.from(statusFilter), search: search || undefined }),
    [statusFilter, search],
  );

  const visibleTasks = filterTasks(tasks, filters);

  function toggleStatus(status: TaskStatus) {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  async function handleStatusChange(taskId: string, status: TaskStatus) {
    try {
      await updateTask(taskId, { status });
      await reload();
    } catch (err) {
      toast({
        title: "Não foi possível atualizar o status",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            Tarefas <CountBadge value={visibleTasks.length} />
          </h1>
          <p className="text-sm text-muted-foreground">Todas as tarefas que você pode ver, com filtros.</p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Nova tarefa
        </Button>
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

      <div className="neu-surface-sm flex flex-col gap-3 p-4">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar tarefas…"
          className="max-w-xs"
        />
        <StatusFilterBar active={statusFilter} onToggle={toggleStatus} />
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : error ? (
        <EmptyState icon={ListTodo} title="Erro ao carregar tarefas" description={error} />
      ) : visibleTasks.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="Nenhuma tarefa encontrada"
          description="Crie uma tarefa acima ou ajuste os filtros."
        />
      ) : (
        <ul className="neu-surface flex flex-col gap-2 p-4">
          {visibleTasks.map((task, index) => {
            const isExpanded = expandedId === task.id;
            return (
              <li
                key={task.id}
                data-task-row
                className="neu-sunken neu-fade-up px-3.5 py-2.5"
                style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : task.id)}
                    className="text-muted-foreground transition-colors hover:text-[var(--neu-lime-solid)]"
                    aria-label={isExpanded ? "Recolher tarefa" : "Expandir tarefa"}
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : task.id)}
                    className="min-w-40 flex-1 text-left"
                  >
                    <p className="text-sm font-medium">{task.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{task.project_name ?? "Sem projeto"}</p>
                  </button>

                  <Badge variant={PRIORITY_BADGE_VARIANT[task.priority]}>{task.priority}</Badge>

                  {task.due_date && <span className="font-mono text-xs text-muted-foreground">{task.due_date}</span>}

                  <select
                    aria-label="Status da tarefa"
                    value={task.status}
                    onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                    className="neu-select h-9 rounded-full border-0 bg-black/10 px-3 text-xs outline-none focus-visible:neu-focus dark:bg-white/5"
                  >
                    {STATUS_ORDER.map((status) => (
                      <option key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </div>

                {isExpanded && profile && (
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
          })}
        </ul>
      )}
    </div>
  );
}
