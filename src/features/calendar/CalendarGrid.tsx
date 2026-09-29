import { DndContext, useDraggable, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import { buildMonthGrid, groupItemsByDate, type CalendarItem, type CalendarItemKind } from "@/features/calendar/calendarLogic";
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

const KIND_DOT_CLASS: Record<CalendarItemKind, string> = {
  tarefa: "bg-primary",
  evento: "bg-success",
  reuniao: "bg-warning",
  prazo: "bg-destructive",
};

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function CalendarItemChip({ item, onItemClick }: { item: CalendarItem; onItemClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id });

  return (
    <div
      ref={setNodeRef}
      style={transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined}
      className={cn("neu-surface-sm cursor-grab active:cursor-grabbing", isDragging && "z-10 opacity-70")}
      {...attributes}
      {...listeners}
    >
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onItemClick}
        className="w-full px-1.5 py-1 text-left text-[11px] leading-tight"
      >
        <div className="flex items-center gap-1">
          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", KIND_DOT_CLASS[item.kind])} />
          <span className="text-muted-foreground">{KIND_LABELS[item.kind]}</span>
        </div>
        <p className="truncate font-medium">{item.title}</p>
      </button>
    </div>
  );
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
  const { setNodeRef, isOver } = useDroppable({ id: date });
  const dayNumber = Number(date.slice(8, 10));

  return (
    <div
      ref={setNodeRef}
      data-testid={`calendar-day-${date}`}
      className={cn(
        "neu-divider flex min-h-24 flex-col gap-1 border p-1.5",
        !inCurrentMonth && "text-muted-foreground",
        isOver && "neu-focus",
      )}
    >
      <span className="font-mono text-xs font-medium">{dayNumber}</span>
      <div className="flex flex-col gap-1">
        {items.map((item) => (
          <CalendarItemChip key={item.id} item={item} onItemClick={() => onItemClick(item)} />
        ))}
      </div>
      {items.length > 0 && (
        // One shared accessible date control per cell would be ambiguous
        // about which item it edits, so each item gets its own hidden-but-
        // reachable date input — the tested, keyboard-usable equivalent of
        // dragging a chip to another day.
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

  function handleDragEnd(event: DragEndEvent) {
    const itemId = event.active.id as string;
    const newDate = event.over?.id as string | undefined;
    const item = items.find((i) => i.id === itemId);
    if (newDate && item && item.date !== newDate) onItemDateChange(itemId, newDate);
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="neu-surface grid grid-cols-7 overflow-hidden p-1 text-sm">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="neu-divider border-b px-1.5 py-1.5 text-center text-[10px] font-semibold uppercase tracking-[.12em] text-[var(--neu-text-label)]">
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
    </DndContext>
  );
}
