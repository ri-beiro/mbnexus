import { useState } from "react";
import { LayoutGrid, Plus } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import { useTasksData } from "@/features/tasks/useTasksData";
import { KanbanBoard } from "@/features/tasks/KanbanBoard";
import { createTask, updateTask } from "@/repositories/taskRepository";
import { useToast } from "@/components/ui/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import type { TaskStatus } from "@/types/database";

// Mesma entidade e o mesmo repositório da view de Lista (src/pages/Tasks.tsx)
// — o board não duplica dados, só oferece outra visualização deles
// (princípio fundamental do prompt mestre, seção 4).
export function Kanban() {
  const { profile } = useAuth();
  const { tasks, loading, error, reload } = useTasksData();
  const { toast } = useToast();

  const [quickTitle, setQuickTitle] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleQuickCreate() {
    const title = quickTitle.trim();
    if (!title || !profile) return;
    setCreating(true);
    try {
      await createTask({ organizationId: profile.organization_id, title, createdBy: profile.id });
      setQuickTitle("");
      await reload();
    } catch (err) {
      toast({
        title: "Não foi possível criar a tarefa",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  }

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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Kanban</h1>
        <p className="text-sm text-muted-foreground">Arraste um cartão entre colunas para mudar o status.</p>
      </div>

      <div className="flex items-center gap-2 rounded-lg border p-3">
        <Input
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleQuickCreate();
          }}
          placeholder="Nova tarefa… pressione Enter para criar"
          disabled={creating}
        />
        <Button type="button" onClick={handleQuickCreate} disabled={creating || !quickTitle.trim()}>
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </div>

      {loading ? (
        <div className="flex gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-64" />
          ))}
        </div>
      ) : error ? (
        <EmptyState icon={LayoutGrid} title="Erro ao carregar o board" description={error} />
      ) : (
        <KanbanBoard tasks={tasks} onStatusChange={handleStatusChange} />
      )}
    </div>
  );
}
