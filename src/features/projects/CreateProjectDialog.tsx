import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { createProject } from "@/repositories/projectRepository";
import { listTeams } from "@/repositories/hierarchyRepository";
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_ORDER } from "@/features/projects/projectLabels";
import { useToast } from "@/components/ui/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ProjectStatus, TaskPriority, Team } from "@/types/database";

const PRIORITY_OPTIONS: TaskPriority[] = ["baixa", "normal", "alta", "urgente", "critica"];

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  createdBy: string;
  onCreated?: () => void;
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  organizationId,
  createdBy,
  onCreated,
}: CreateProjectDialogProps) {
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("normal");
  const [status, setStatus] = useState<ProjectStatus>("planejamento");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [teamId, setTeamId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    listTeams()
      .then(setTeams)
      .catch(() => setTeams([]));
  }, [open]);

  function resetForm() {
    setName("");
    setDescription("");
    setPriority("normal");
    setStatus("planejamento");
    setStartDate("");
    setDueDate("");
    setTeamId("");
  }

  async function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      await createProject({
        organizationId,
        createdBy,
        name: trimmed,
        ...(description.trim() ? { description: description.trim() } : {}),
        priority,
        status,
        ...(startDate ? { startDate } : {}),
        ...(dueDate ? { dueDate } : {}),
        ...(teamId ? { teamId } : {}),
      });

      resetForm();
      onCreated?.();
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Não foi possível criar o projeto",
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
          <DialogTitle>Novo projeto</DialogTitle>
          <DialogDescription>Preencha os detalhes agora ou complete depois no detalhe do projeto.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="cp-name">Nome</Label>
            <Input
              id="cp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do projeto"
              disabled={submitting}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cp-description">Descrição</Label>
            <textarea
              id="cp-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={submitting}
              className="neu-sunken w-full border-0 bg-transparent px-3.5 py-2 text-sm outline-none focus-visible:neu-focus"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cp-priority">Prioridade</Label>
              <select
                id="cp-priority"
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
              <Label htmlFor="cp-status">Status</Label>
              <select
                id="cp-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                disabled={submitting}
                className="neu-sunken neu-select h-10 w-full border-0 bg-transparent px-3.5 text-sm outline-none focus-visible:neu-focus"
              >
                {PROJECT_STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {PROJECT_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cp-start">Data de início</Label>
              <Input
                id="cp-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cp-due">Prazo</Label>
              <Input
                id="cp-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cp-team">Equipe</Label>
            <select
              id="cp-team"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              disabled={submitting}
              className="neu-sunken neu-select h-10 w-full border-0 bg-transparent px-3.5 text-sm outline-none focus-visible:neu-focus"
            >
              <option value="">Sem equipe</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting || !name.trim()}>
            <Plus className="h-4 w-4" /> Criar projeto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
