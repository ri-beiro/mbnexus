import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import { useCalendarData } from "@/features/calendar/useCalendarData";
import { buildCalendarItems, shiftEventToDate, type CalendarItem } from "@/features/calendar/calendarLogic";
import { CalendarGrid } from "@/features/calendar/CalendarGrid";
import { STATUS_LABELS } from "@/features/tasks/taskLabels";
import { updateTask } from "@/repositories/taskRepository";
import { createEvent, createTeamsMeeting, updateEvent } from "@/repositories/eventRepository";
import { useToast } from "@/components/ui/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { EventType } from "@/types/database";

const KIND_LABELS: Record<CalendarItem["kind"], string> = {
  tarefa: "Tarefa",
  evento: "Evento",
  reuniao: "Reunião",
  prazo: "Prazo",
};

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  event: "Evento",
  meeting: "Reunião",
  deadline: "Prazo",
};

const MONTH_LABELS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function Calendar() {
  const { profile } = useAuth();
  const { tasks, events, loading, error, reload } = useCalendarData();
  const { toast } = useToast();

  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [quickTitle, setQuickTitle] = useState("");
  const [quickType, setQuickType] = useState<EventType>("event");
  const [createTeamsLink, setCreateTeamsLink] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CalendarItem | null>(null);

  const items = useMemo(() => buildCalendarItems(tasks, events), [tasks, events]);
  const selectedTask = selectedItem?.kind === "tarefa" ? tasks.find((t) => t.id === selectedItem.id) : undefined;
  const selectedEvent = selectedItem && selectedItem.kind !== "tarefa" ? events.find((e) => e.id === selectedItem.id) : undefined;

  function goToMonth(delta: number) {
    const next = new Date(Date.UTC(year, month + delta, 1));
    setYear(next.getUTCFullYear());
    setMonth(next.getUTCMonth());
  }

  async function handleQuickCreate() {
    const title = quickTitle.trim();
    if (!title || !profile) return;
    setCreating(true);
    try {
      const now = new Date();
      const startsAt = now.toISOString();
      const endsAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
      const created = await createEvent({
        organizationId: profile.organization_id,
        title,
        createdBy: profile.id,
        startsAt,
        endsAt,
        type: quickType,
      });
      setQuickTitle("");

      if (quickType === "meeting" && createTeamsLink) {
        try {
          const updated = await createTeamsMeeting(created.id);
          toast({
            title: "Reunião do Teams criada",
            description: updated.teams_join_url ?? undefined,
            variant: "success",
          });
        } catch (err) {
          toast({
            title: "Evento criado, mas não foi possível gerar o link do Teams",
            description: err instanceof Error ? err.message : undefined,
            variant: "destructive",
          });
        }
      }

      await reload();
    } catch (err) {
      toast({
        title: "Não foi possível criar o evento",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  }

  async function handleItemDateChange(id: string, newDate: string) {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    try {
      if (item.kind === "tarefa") {
        await updateTask(id, { dueDate: newDate });
      } else {
        const event = events.find((e) => e.id === id);
        if (!event) return;
        const { startsAt, endsAt } = shiftEventToDate(event, newDate);
        await updateEvent(id, { startsAt, endsAt });
      }
      await reload();
    } catch (err) {
      toast({
        title: "Não foi possível mover para essa data",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendário</h1>
          <p className="text-sm text-muted-foreground">Tarefas, eventos, reuniões e prazos em um só lugar.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="icon" onClick={() => goToMonth(-1)} aria-label="Mês anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="w-40 text-center text-sm font-medium">
            {MONTH_LABELS[month]} {year}
          </span>
          <Button type="button" variant="outline" size="icon" onClick={() => goToMonth(1)} aria-label="Próximo mês">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="neu-surface-sm flex flex-wrap items-center gap-2 p-3">
        <Input
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleQuickCreate();
          }}
          placeholder="Novo evento… pressione Enter para criar hoje"
          disabled={creating}
          className="min-w-48 flex-1"
        />
        <select
          aria-label="Tipo"
          value={quickType}
          onChange={(e) => setQuickType(e.target.value as EventType)}
          disabled={creating}
          className="neu-sunken neu-select h-9 border-0 px-3 text-sm outline-none focus-visible:neu-focus"
        >
          {(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map((type) => (
            <option key={type} value={type}>
              {EVENT_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
        {quickType === "meeting" && (
          <div className="flex items-center gap-1.5">
            <input
              id="create-teams-link"
              type="checkbox"
              checked={createTeamsLink}
              onChange={(e) => setCreateTeamsLink(e.target.checked)}
              disabled={creating}
              className="h-4 w-4"
            />
            <Label htmlFor="create-teams-link" className="text-xs font-normal">
              Criar link do Teams
            </Label>
          </div>
        )}
        <Button type="button" onClick={handleQuickCreate} disabled={creating || !quickTitle.trim()}>
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </div>

      <Dialog open={selectedItem !== null} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-sm">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedItem.title}</DialogTitle>
                <DialogDescription>
                  {KIND_LABELS[selectedItem.kind]} · {selectedItem.date}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                {selectedTask && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <span>{STATUS_LABELS[selectedTask.status]}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-mono">{selectedTask.progress}%</span>
                    </div>
                    {selectedTask.description && <p className="text-muted-foreground">{selectedTask.description}</p>}
                  </>
                )}
                {selectedEvent && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Início</span>
                      <span className="font-mono">{new Date(selectedEvent.starts_at).toLocaleString("pt-BR")}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Fim</span>
                      <span className="font-mono">{new Date(selectedEvent.ends_at).toLocaleString("pt-BR")}</span>
                    </div>
                    {selectedEvent.location && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Local</span>
                        <span>{selectedEvent.location}</span>
                      </div>
                    )}
                    {selectedEvent.teams_join_url && (
                      <a
                        href={selectedEvent.teams_join_url}
                        target="_blank"
                        rel="noreferrer"
                        className="block text-[var(--neu-lime-solid)] underline"
                      >
                        Entrar na reunião do Teams
                      </a>
                    )}
                    {selectedEvent.description && <p className="text-muted-foreground">{selectedEvent.description}</p>}
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {loading ? (
        <Skeleton className="h-96" />
      ) : error ? (
        <EmptyState icon={CalendarDays} title="Erro ao carregar o calendário" description={error} />
      ) : (
        <CalendarGrid year={year} month={month} items={items} onItemDateChange={handleItemDateChange} onItemClick={setSelectedItem} />
      )}
    </div>
  );
}
