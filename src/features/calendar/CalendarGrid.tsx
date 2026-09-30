import { buildMonthGrid, groupItemsByDate, summarizeItemsByKind, type CalendarItem, type CalendarItemKind } from "@/features/calendar/calendarLogic";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface CalendarGridProps {
  year: number;
  month: number;
  items: CalendarItem[];
  onItemDateChange: (id: string, newDate: string) => void;
  onItemClick: (item: CalendarItem) => void;
}

const KIND_LABELS: Record<CalendarItemKind, string> = {
  tarefa: "Tarefa",
  evento: "Evento",
  reuniao: "Reunião",
  prazo: "Prazo",
};

const KIND_LABELS_PLURAL: Record<CalendarItemKind, string> = {
  tarefa: "tarefas",
  evento: "eventos",
  reuniao: "reuniões",
  prazo: "prazos",
};

const KIND_DOT_CLASS: Record<CalendarItemKind, string> = {
  tarefa: "bg-primary",
  evento: "bg-success",
  reuniao: "bg-warning",
  prazo: "bg-destructive",
};

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function kindSummaryLabel(kind: CalendarItemKind, count: number): string {
  return count === 1 ? `1 ${KIND_LABELS[kind].toLowerCase()}` : `${count} ${KIND_LABELS_PLURAL[kind]}`;
}

function CalendarDayCell({
  date,
  inCurrentMonth,
  items,
  onItemDateChange,
  onItemClick,
}: {
  date: string;
  inCurrentMonth: boolean;
  items: CalendarItem[];
  onItemDateChange: (id: string, newDate: string) => void;
  onItemClick: (item: CalendarItem) => void;
}) {
  const dayNumber = Number(date.slice(8, 10));
  const summary = summarizeItemsByKind(items);
  const summaryLabel = summary.map((s) => kindSummaryLabel(s.kind, s.count)).join(", ");

  return (
    <div
      data-testid={`calendar-day-${date}`}
      className={cn("neu-divider flex min-h-24 flex-col gap-1.5 border p-1.5", !inCurrentMonth && "text-muted-foreground")}
    >
      <span className="font-mono text-xs font-medium">{dayNumber}</span>

      {summary.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={summaryLabel}
              className="neu-sunken flex w-fit items-center gap-1 px-2 py-1 transition-transform hover:scale-105"
            >
              {summary.map((s) => (
                <span key={s.kind} className="flex items-center gap-0.5">
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", KIND_DOT_CLASS[s.kind])} aria-hidden="true" />
                  {s.count > 1 && <span className="font-mono text-[10px] text-muted-foreground">{s.count}</span>}
                </span>
              ))}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel>{summaryLabel}</DropdownMenuLabel>
            {items.map((item) => (
              <DropdownMenuItem key={item.id} onSelect={() => onItemClick(item)}>
                <span className={cn("h-2 w-2 shrink-0 rounded-full", KIND_DOT_CLASS[item.kind])} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{item.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{KIND_LABELS[item.kind]}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {items.length > 0 && (
        // One shared accessible date control per cell would be ambiguous
        // about which item it edits, so each item gets its own hidden-but-
        // reachable date input — the keyboard-usable way to reschedule an
        // item without opening the details menu.
        <div className="sr-only">
          {items.map((item) => (
            <input
              key={item.id}
              id={`date-${item.id}`}
              type="date"
              aria-label={`Alterar data de ${item.title}`}
              value={item.date}
              onChange={(e) => e.target.value && onItemDateChange(item.id, e.target.value)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CalendarGrid({ year, month, items, onItemDateChange, onItemClick }: CalendarGridProps) {
  const cells = buildMonthGrid(year, month);
  const grouped = groupItemsByDate(items);

  return (
    <div className="neu-surface grid grid-cols-7 overflow-hidden p-1 text-sm">
      {WEEKDAY_LABELS.map((label) => (
        <div
          key={label}
          className="neu-divider border-b px-1.5 py-1.5 text-center text-[10px] font-semibold uppercase tracking-[.12em] text-[var(--neu-text-label)]"
        >
          {label}
        </div>
      ))}
      {cells.map((cell) => (
        <CalendarDayCell
          key={cell.date}
          date={cell.date}
          inCurrentMonth={cell.inCurrentMonth}
          items={grouped[cell.date] ?? []}
          onItemDateChange={onItemDateChange}
          onItemClick={onItemClick}
        />
      ))}
    </div>
  );
}
