import { useState } from "react";
import { LayoutGrid, Plus } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import { useTasksData } from "@/features/tasks/useTasksData";
import { KanbanBoard } from "@/features/tasks/KanbanBoard";
import { CreateTaskDialog } from "@/features/tasks/CreateTaskDialog";
import { TaskDetailPanel } from "@/features/tasks/TaskDetailPanel";
import { updateTask } from "@/repositories/taskRepository";
import { useToast } from "@/components/ui/toast-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { TaskStatus } from "@/types/database";

// Mesma entidade e o mesmo repositório da view de Lista (src/pages/Tasks.tsx)
// — o board não duplica dados, só oferece outra visualização deles
// (princípio fundamental do prompt mestre, seção 4).
export function Kanban() {
  const { profile } = useAuth();
  const { tasks, profiles, loading, error, reload } = useTasksData();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kanban</h1>
          <p className="text-sm text-muted-foreground">Arraste um cartão entre colunas para mudar o status.</p>
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

      <Dialog open={selectedTaskId !== null} onOpenChange={(open) => !open && setSelectedTaskId(null)}>
        <DialogContent className="max-w-2xl">
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
        <KanbanBoard tasks={tasks} onStatusChange={handleStatusChange} onCardClick={setSelectedTaskId} />
      )}
    </div>
  );
}
