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
}

function KanbanCard({ task, onStatusChange }: { task: TaskListRow; onStatusChange: (status: TaskStatus) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });

  return (
    <div
      ref={setNodeRef}
      data-kanban-card
      style={transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined}
      className={cn(
        "cursor-grab space-y-1.5 rounded-md border bg-card p-2.5 text-sm shadow-sm active:cursor-grabbing",
        isDragging && "z-10 opacity-70 shadow-md",
      )}
      {...attributes}
      {...listeners}
    >
      <p className="font-medium leading-snug">{task.title}</p>
      <p className="truncate text-xs text-muted-foreground">{task.project_name ?? "Sem projeto"}</p>
      <div className="flex items-center justify-between gap-2">
        <Badge variant={PRIORITY_BADGE_VARIANT[task.priority]}>{task.priority}</Badge>
        {task.due_date && <span className="text-xs text-muted-foreground">{task.due_date}</span>}
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
        className="h-7 w-full rounded-md border border-input bg-background px-1.5 text-xs"
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
}: {
  status: TaskStatus;
  tasks: TaskListRow[];
  onStatusChange: (taskId: string, status: TaskStatus) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      data-testid={`kanban-column-${status}`}
      className={cn(
        "flex w-64 shrink-0 flex-col gap-2 rounded-lg border bg-muted/30 p-2.5",
        isOver && "ring-2 ring-primary/50",
      )}
    >
      <div className="flex items-center justify-between px-0.5">
        <h3 className="text-xs font-semibold uppercase text-muted-foreground">{STATUS_LABELS[status]}</h3>
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
      </div>
      <div className="flex flex-col gap-2">
        {tasks.length === 0 && (
          <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
            Sem tarefas nesta coluna.
          </p>
        )}
        {tasks.map((task) => (
          <KanbanCard key={task.id} task={task} onStatusChange={(s) => onStatusChange(task.id, s)} />
        ))}
      </div>
    </div>
  );
}

export function KanbanBoard({ tasks, onStatusChange }: KanbanBoardProps) {
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
          <KanbanColumn key={status} status={status} tasks={columns[status]} onStatusChange={onStatusChange} />
        ))}
      </div>
    </DndContext>
  );
}
