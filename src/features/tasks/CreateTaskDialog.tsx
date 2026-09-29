import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { addTaskAssignee, createTask } from "@/repositories/taskRepository";
import { listProjects, type ProjectListRow } from "@/repositories/projectRepository";
import { STATUS_LABELS, STATUS_ORDER } from "@/features/tasks/taskLabels";
import { useToast } from "@/components/ui/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Profile, TaskPriority, TaskStatus } from "@/types/database";

const PRIORITY_OPTIONS: TaskPriority[] = ["baixa", "normal", "alta", "urgente", "critica"];

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  createdBy: string;
  profiles: Profile[];
  defaultProjectId?: string | null;
  onCreated?: () => void;
}

function profileName(profiles: Profile[], id: string): string {
  return profiles.find((p) => p.id === id)?.full_name ?? "Usuário";
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  organizationId,
  createdBy,
  profiles,
  defaultProjectId = null,
  onCreated,
}: CreateTaskDialogProps) {
  const { toast } = useToast();
  const [projects, setProjects] = useState<ProjectListRow[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("normal");
  const [status, setStatus] = useState<TaskStatus>("backlog");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    listProjects()
      .then(setProjects)
      .catch(() => setProjects([]));
  }, [open]);

  function resetForm() {
    setTitle("");
    setDescription("");
    setPriority("normal");
    setStatus("backlog");
    setStartDate("");
    setDueDate("");
    setProjectId(defaultProjectId ?? "");
    setAssigneeIds([]);
  }

  async function handleSubmit() {
    const trimmed = title.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      const task = await createTask({
        organizationId,
        createdBy,
        title: trimmed,
        ...(description.trim() ? { description: description.trim() } : {}),
        priority,
        status,
        ...(startDate ? { startDate } : {}),
        ...(dueDate ? { dueDate } : {}),
        ...(projectId ? { projectId } : {}),
      });

      for (const profileId of assigneeIds) {
        await addTaskAssignee(task.id, profileId);
      }

      resetForm();
      onCreated?.();
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Não foi possível criar a tarefa",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Nova tarefa</DialogTitle>
          <DialogDescription>Preencha os detalhes agora ou complete depois no detalhe da tarefa.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="ct-title">Título</Label>
            <Input
              id="ct-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="O que precisa ser feito?"
              disabled={submitting}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ct-description">Descrição</Label>
            <textarea
              id="ct-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={submitting}
              className="neu-sunken w-full border-0 bg-transparent px-3.5 py-2 text-sm outline-none focus-visible:neu-focus"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="ct-priority">Prioridade</Label>
              <select
                id="ct-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                disabled={submitting}
                className="neu-sunken neu-select h-10 w-full border-0 bg-transparent px-3.5 text-sm outline-none focus-visible:neu-focus"
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ct-status">Status</Label>
              <select
                id="ct-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                disabled={submitting}
                className="neu-sunken neu-select h-10 w-full border-0 bg-transparent px-3.5 text-sm outline-none focus-visible:neu-focus"
              >
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="ct-start">Data de início</Label>
              <Input
                id="ct-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ct-due">Prazo</Label>
              <Input
                id="ct-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ct-project">Projeto</Label>
            <select
              id="ct-project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              disabled={submitting}
              className="neu-sunken neu-select h-10 w-full border-0 bg-transparent px-3.5 text-sm outline-none focus-visible:neu-focus"
            >
              <option value="">Sem projeto</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>Responsáveis</Label>
            {assigneeIds.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {assigneeIds.map((id) => (
                  <div key={id} className="neu-divider flex items-center gap-1.5 rounded-full border py-0.5 pl-0.5 pr-1.5 text-xs">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[10px]">
                        {profileName(profiles, id).slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {profileName(profiles, id)}
                    <button
                      type="button"
                      onClick={() => setAssigneeIds((prev) => prev.filter((x) => x !== id))}
                      aria-label={`Remover ${profileName(profiles, id)}`}
                      className="text-muted-foreground hover:text-[var(--neu-lime-solid)]"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <select
              aria-label="Adicionar responsável"
              value=""
              disabled={submitting}
              onChange={(e) => e.target.value && setAssigneeIds((prev) => [...prev, e.target.value])}
              className="neu-sunken neu-select h-10 w-full border-0 bg-transparent px-3.5 text-sm outline-none focus-visible:neu-focus"
            >
              <option value="" disabled>
                Adicionar responsável…
              </option>
              {profiles
                .filter((p) => !assigneeIds.includes(p.id))
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting || !title.trim()}>
            <Plus className="h-4 w-4" /> Criar tarefa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
