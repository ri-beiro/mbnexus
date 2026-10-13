import { useMemo, useState } from "react";
import { LayoutGrid, Plus, Search, X } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import { useTasksData } from "@/features/tasks/useTasksData";
import { KanbanBoard } from "@/features/tasks/KanbanBoard";
import { CreateTaskDialog } from "@/features/tasks/CreateTaskDialog";
import { TaskDetailPanel } from "@/features/tasks/TaskDetailPanel";
import { filterTasks } from "@/features/tasks/taskLogic";
import { PRIORITY_LABELS, PRIORITY_ORDER } from "@/features/tasks/taskLabels";
import { updateTask } from "@/repositories/taskRepository";
import { useToast } from "@/components/ui/toast-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CountBadge } from "@/components/ui/count-badge";
import { cn } from "@/lib/utils";
import type { TaskPriority, TaskStatus } from "@/types/database";

// Mesma entidade e o mesmo repositório da view de Lista (src/pages/Tasks.tsx)
// — o board não duplica dados, só oferece outra visualização deles
// (princípio fundamental do prompt mestre, seção 4).
export function Kanban() {
  const { profile } = useAuth();
  const { tasks, profiles, loading, error, reload } = useTasksData();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [createStatus, setCreateStatus] = useState<TaskStatus>("backlog");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [priority, setPriority] = useState<TaskPriority | "">("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [mineOnly, setMineOnly] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const projectOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const t of tasks) {
      if (t.project_id && t.project_name && !seen.has(t.project_id)) seen.set(t.project_id, t.project_name);
    }
    return [...seen.entries()];
  }, [tasks]);

  const hasActiveFilters = Boolean(search || assigneeId || projectId || priority || overdueOnly || mineOnly);

  const filteredTasks = useMemo(() => {
    let result = filterTasks(tasks, {
      search,
      assigneeId: assigneeId || undefined,
      projectId: projectId || undefined,
      priorities: priority ? [priority] : undefined,
    });
    if (mineOnly && profile) result = result.filter((t) => t.assigneeIds.includes(profile.id));
    if (overdueOnly) result = result.filter((t) => t.status !== "concluido" && t.due_date !== null && t.due_date < today);
    return result;
  }, [tasks, search, assigneeId, projectId, priority, mineOnly, overdueOnly, profile, today]);

  function clearFilters() {
    setSearch("");
    setAssigneeId("");
    setProjectId("");
    setPriority("");
    setOverdueOnly(false);
    setMineOnly(false);
  }

  function handleAddCard(status: TaskStatus) {
    setCreateStatus(status);
    setCreateOpen(true);
  }

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;

  async function handleStatusChange(taskId: string, status: TaskStatus) {
    try {
      await updateTask(taskId, { status });
      await reload();
    } catch (err) {
      toast({
        title: "Não foi possível mover a tarefa",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    }
  }

  async function handleMove(taskId: string, status: TaskStatus, boardPosition: number) {
    try {
      await updateTask(taskId, { status, boardPosition });
      await reload();
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            Kanban <CountBadge value={filteredTasks.length} />
          </h1>
          <p className="text-sm text-muted-foreground">Arraste um cartão entre colunas para mudar o status.</p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setCreateStatus("backlog");
            setCreateOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Nova tarefa
        </Button>
      </div>

      <div className="neu-sunken flex flex-wrap items-center gap-2 rounded-2xl p-2.5">
        <div className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título ou descrição…"
            className="neu-select h-9 w-full rounded-full border-0 bg-black/10 pl-8 pr-3 text-xs outline-none focus-visible:neu-focus dark:bg-white/5"
          />
        </div>

        <select
          aria-label="Filtrar por responsável"
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
          className="neu-select h-9 rounded-full border-0 bg-black/10 px-3 text-xs outline-none focus-visible:neu-focus dark:bg-white/5"
        >
          <option value="">Responsável</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name}
            </option>
          ))}
        </select>

        <select
          aria-label="Filtrar por projeto"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="neu-select h-9 rounded-full border-0 bg-black/10 px-3 text-xs outline-none focus-visible:neu-focus dark:bg-white/5"
        >
          <option value="">Projeto</option>
          {projectOptions.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>

        <select
          aria-label="Filtrar por prioridade"
          value={priority}
          onChange={(e) => setPriority(e.target.value as TaskPriority | "")}
          className="neu-select h-9 rounded-full border-0 bg-black/10 px-3 text-xs outline-none focus-visible:neu-focus dark:bg-white/5"
        >
          <option value="">Prioridade</option>
          {PRIORITY_ORDER.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABELS[p]}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setMineOnly((v) => !v)}
          className={cn(
            "h-9 rounded-full px-3 text-xs font-medium transition-colors",
            mineOnly ? "bg-[rgba(190,249,27,0.18)] text-[var(--neu-lime-solid)]" : "text-muted-foreground hover:text-foreground",
          )}
        >
          Minhas tarefas
        </button>

        <button
          type="button"
          onClick={() => setOverdueOnly((v) => !v)}
          className={cn(
            "h-9 rounded-full px-3 text-xs font-medium transition-colors",
            overdueOnly ? "bg-[rgba(190,249,27,0.18)] text-[var(--neu-lime-solid)]" : "text-muted-foreground hover:text-foreground",
          )}
        >
          Atrasadas
        </button>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="flex h-9 items-center gap-1 rounded-full px-3 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" /> Limpar filtros
          </button>
        )}
      </div>

      {profile && (
        <CreateTaskDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          organizationId={profile.organization_id}
          createdBy={profile.id}
          profiles={profiles}
          defaultStatus={createStatus}
          onCreated={reload}
        />
      )}

      <Dialog open={selectedTaskId !== null} onOpenChange={(open) => !open && setSelectedTaskId(null)}>
        <DialogContent variant="right-sheet">
          {selectedTask && profile && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedTask.title}</DialogTitle>
              </DialogHeader>
              <TaskDetailPanel
                taskId={selectedTask.id}
                organizationId={profile.organization_id}
                currentProfileId={profile.id}
                profiles={profiles}
                assigneeIds={selectedTask.assigneeIds}
                recurrenceRule={selectedTask.recurrence_rule}
                onAssigneesChange={() => reload()}
                onRecurrenceChange={() => reload()}
              />
            </>
          )}
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="flex gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-64" />
          ))}
        </div>
      ) : error ? (
        <EmptyState icon={LayoutGrid} title="Erro ao carregar o board" description={error} />
      ) : (
        <KanbanBoard
          tasks={filteredTasks}
          profiles={profiles}
          onStatusChange={handleStatusChange}
          onMove={handleMove}
          onCardClick={setSelectedTaskId}
          onAddCard={handleAddCard}
        />
      )}
    </div>
  );
}
