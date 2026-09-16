import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import { useCalendarData } from "@/features/calendar/useCalendarData";
import { buildCalendarItems, shiftEventToDate } from "@/features/calendar/calendarLogic";
import { CalendarGrid } from "@/features/calendar/CalendarGrid";
import { updateTask } from "@/repositories/taskRepository";
import { createEvent, updateEvent } from "@/repositories/eventRepository";
import { useToast } from "@/components/ui/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

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
  const [creating, setCreating] = useState(false);

  const items = useMemo(() => buildCalendarItems(tasks, events), [tasks, events]);

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
      await createEvent({ organizationId: profile.organization_id, title, createdBy: profile.id, startsAt, endsAt });
      setQuickTitle("");
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

      <div className="flex items-center gap-2 rounded-lg border p-3">
        <Input
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleQuickCreate();
          }}
          placeholder="Novo evento… pressione Enter para criar hoje"
          disabled={creating}
        />
        <Button type="button" onClick={handleQuickCreate} disabled={creating || !quickTitle.trim()}>
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-96" />
      ) : error ? (
        <EmptyState icon={CalendarDays} title="Erro ao carregar o calendário" description={error} />
      ) : (
        <CalendarGrid year={year} month={month} items={items} onItemDateChange={handleItemDateChange} />
      )}
    </div>
  );
}
