import { DndContext, useDraggable, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import { buildMonthGrid, groupItemsByDate, type CalendarItem, type CalendarItemKind } from "@/features/calendar/calendarLogic";
import { cn } from "@/lib/utils";

interface CalendarGridProps {
  year: number;
  month: number;
  items: CalendarItem[];
  onItemDateChange: (id: string, newDate: string) => void;
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

function CalendarItemChip({ item }: { item: CalendarItem }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id });

  return (
    <div
      ref={setNodeRef}
      style={transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined}
      className={cn(
        "cursor-grab rounded border bg-card px-1.5 py-1 text-[11px] leading-tight shadow-sm active:cursor-grabbing",
        isDragging && "z-10 opacity-70 shadow-md",
      )}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center gap-1">
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", KIND_DOT_CLASS[item.kind])} />
        <span className="text-muted-foreground">{KIND_LABELS[item.kind]}</span>
      </div>
      <p className="truncate font-medium">{item.title}</p>
    </div>
  );
}

function CalendarDayCell({
  date,
  inCurrentMonth,
  items,
  onItemDateChange,
}: {
  date: string;
  inCurrentMonth: boolean;
  items: CalendarItem[];
  onItemDateChange: (id: string, newDate: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: date });
  const dayNumber = Number(date.slice(8, 10));

  return (
    <div
      ref={setNodeRef}
      data-testid={`calendar-day-${date}`}
      className={cn(
        "flex min-h-24 flex-col gap-1 border p-1.5",
        !inCurrentMonth && "bg-muted/30 text-muted-foreground",
        isOver && "ring-2 ring-primary/50",
      )}
    >
      <span className="text-xs font-medium">{dayNumber}</span>
      <div className="flex flex-col gap-1">
        {items.map((item) => (
          <CalendarItemChip key={item.id} item={item} />
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

export function CalendarGrid({ year, month, items, onItemDateChange }: CalendarGridProps) {
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
      <div className="grid grid-cols-7 border-l border-t text-sm">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="border-b border-r bg-muted/40 px-1.5 py-1 text-xs font-medium text-muted-foreground">
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
          />
        ))}
      </div>
    </DndContext>
  );
}
