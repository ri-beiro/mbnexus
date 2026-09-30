import { Info } from "lucide-react";
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import { groupTasksByStatus } from "@/features/tasks/kanbanLogic";
import { PRIORITY_BADGE_VARIANT, STATUS_LABELS, STATUS_ORDER } from "@/features/tasks/taskLabels";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TaskListRow } from "@/repositories/taskRepository";
import type { TaskStatus } from "@/types/database";

interface KanbanBoardProps {
  tasks: TaskListRow[];
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onCardClick: (taskId: string) => void;
}

function KanbanCard({
  task,
  index,
  onStatusChange,
  onCardClick,
}: {
  task: TaskListRow;
  index: number;
  onStatusChange: (status: TaskStatus) => void;
  onCardClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });

  return (
    <div
      ref={setNodeRef}
      data-kanban-card
      style={{
        ...(transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined),
        animationDelay: `${Math.min(index, 8) * 45}ms`,
      }}
      className={cn(
        "neu-surface-sm neu-surface-hover neu-fade-up cursor-grab space-y-1.5 p-3 text-sm active:cursor-grabbing",
        isDragging && "z-10 opacity-70",
      )}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-1.5">
        <p className="font-medium leading-snug">{task.title}</p>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onCardClick}
          aria-label={`Ver detalhes de ${task.title}`}
          className="shrink-0 text-muted-foreground hover:text-[var(--neu-lime-solid)]"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="truncate text-xs text-muted-foreground">{task.project_name ?? "Sem projeto"}</p>
      <div className="flex items-center justify-between gap-2">
        <Badge variant={PRIORITY_BADGE_VARIANT[task.priority]}>{task.priority}</Badge>
        {task.due_date && <span className="font-mono text-xs text-muted-foreground">{task.due_date}</span>}
      </div>
      {/* Keyboard/screen-reader-accessible alternative to dragging — also
          what the automated tests exercise, since simulating real pointer
          drag physics in jsdom isn't meaningful; dragging itself is a
          manual/visual check. */}
      <select
        aria-label="Status da tarefa"
        value={task.status}
        onPointerDown={(e) => e.stopPropagation()}
        onChange={(e) => onStatusChange(e.target.value as TaskStatus)}
        className="neu-select h-8 w-full rounded-full border-0 bg-black/10 px-2.5 text-xs outline-none focus-visible:neu-focus dark:bg-white/5"
      >
        {STATUS_ORDER.map((status) => (
          <option key={status} value={status}>
            {STATUS_LABELS[status]}
          </option>
        ))}
      </select>
    </div>
  );
}

function KanbanColumn({
  status,
  tasks,
  onStatusChange,
  onCardClick,
}: {
  status: TaskStatus;
  tasks: TaskListRow[];
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onCardClick: (taskId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      data-testid={`kanban-column-${status}`}
      className={cn("neu-sunken flex w-64 shrink-0 flex-col gap-2 p-3", isOver && "neu-focus")}
    >
      <div className="flex items-center justify-between px-0.5">
        <h3 className="text-[10px] font-semibold uppercase tracking-[.12em] text-[var(--neu-text-label)]">{STATUS_LABELS[status]}</h3>
        <span className="font-mono text-xs text-muted-foreground">{tasks.length}</span>
      </div>
      <div className="flex flex-col gap-2">
        {tasks.length === 0 && (
          <p className="neu-divider rounded-xl border border-dashed p-3 text-center text-xs text-muted-foreground">
            Sem tarefas nesta coluna.
          </p>
        )}
        {tasks.map((task, index) => (
          <KanbanCard
            key={task.id}
            task={task}
            index={index}
            onStatusChange={(s) => onStatusChange(task.id, s)}
            onCardClick={() => onCardClick(task.id)}
          />
        ))}
      </div>
    </div>
  );
}

export function KanbanBoard({ tasks, onStatusChange, onCardClick }: KanbanBoardProps) {
  const columns = groupTasksByStatus(tasks);

  function handleDragEnd(event: DragEndEvent) {
    const taskId = event.active.id as string;
    const newStatus = event.over?.id as TaskStatus | undefined;
    if (!newStatus) return;
    const task = tasks.find((t) => t.id === taskId);
    if (task && task.status !== newStatus) onStatusChange(taskId, newStatus);
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {STATUS_ORDER.map((status) => (
          <KanbanColumn key={status} status={status} tasks={columns[status]} onStatusChange={onStatusChange} onCardClick={onCardClick} />
        ))}
      </div>
    </DndContext>
  );
}
