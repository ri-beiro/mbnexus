import { useEffect, useState } from "react";
import { Trash2, Zap } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import {
  createAutomation,
  deleteAutomation,
  listAutomations,
  updateAutomation,
} from "@/repositories/automationRepository";
import { useToast } from "@/components/ui/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import type { Automation } from "@/types/database";

const TRIGGER_LABELS: Record<string, string> = {
  "task.due_soon": "Tarefa com prazo próximo",
  "task.overdue": "Tarefa atrasada",
  "subtasks.completed": "Todas as subtarefas concluídas",
};

const TRIGGER_OPTIONS = Object.keys(TRIGGER_LABELS);

export function AutomationsPanel() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [triggerEvent, setTriggerEvent] = useState(TRIGGER_OPTIONS[0]);
  const [creating, setCreating] = useState(false);

  async function reload() {
    try {
      setAutomations(await listAutomations());
    } catch (err) {
      toast({
        title: "Não foi possível carregar as automações",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    }
  }

  useEffect(() => {
    setLoading(true);
    reload().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed || !profile) return;
    setCreating(true);
    try {
      await createAutomation({
        organizationId: profile.organization_id,
        name: trimmed,
        triggerEvent,
        createdBy: profile.id,
      });
      setName("");
      await reload();
    } catch (err) {
      toast({
        title: "Não foi possível criar a automação",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleActive(automation: Automation) {
    try {
      await updateAutomation(automation.id, { isActive: !automation.is_active });
      await reload();
    } catch (err) {
      toast({
        title: "Não foi possível atualizar a automação",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    }
  }

  async function handleDelete(automation: Automation) {
    try {
      await deleteAutomation(automation.id);
      await reload();
    } catch (err) {
      toast({
        title: "Não foi possível excluir a automação",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome da automação…"
          disabled={creating}
          className="max-w-xs"
        />
        <select
          aria-label="Gatilho"
          value={triggerEvent}
          onChange={(e) => setTriggerEvent(e.target.value)}
          disabled={creating}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          {TRIGGER_OPTIONS.map((event) => (
            <option key={event} value={event}>
              {TRIGGER_LABELS[event]}
            </option>
          ))}
        </select>
        <Button type="button" onClick={handleCreate} disabled={creating || !name.trim()}>
          <Zap className="h-4 w-4" /> Criar automação
        </Button>
      </div>

      {automations.length === 0 ? (
        <EmptyState icon={Zap} title="Nenhuma automação configurada" description="Crie a primeira automação acima." />
      ) : (
        <ul className="space-y-1.5">
          {automations.map((automation) => (
            <li
              key={automation.id}
              data-testid={`automation-row-${automation.id}`}
              className="flex flex-wrap items-center gap-3 rounded-md border px-3 py-2"
            >
              <div className="min-w-40 flex-1">
                <p className="text-sm font-medium">{automation.name}</p>
                <p className="text-xs text-muted-foreground">{TRIGGER_LABELS[automation.trigger_event] ?? automation.trigger_event}</p>
              </div>
              <Badge variant={automation.is_active ? "success" : "secondary"}>
                {automation.is_active ? "Ativa" : "Inativa"}
              </Badge>
              <Button type="button" size="sm" variant="outline" onClick={() => handleToggleActive(automation)}>
                {automation.is_active ? "Desativar" : "Ativar"}
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={`Excluir ${automation.name}`}
                onClick={() => handleDelete(automation)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
