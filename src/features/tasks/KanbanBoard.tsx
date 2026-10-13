import { useState } from "react";
import { FileText, Info, Plus } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { computeBoardPosition, groupTasksByStatus, sortTasksByBoardPosition } from "@/features/tasks/kanbanLogic";
import { formatDueDateLabel } from "@/features/tasks/taskLogic";
import { PRIORITY_ACCENT_COLOR, PRIORITY_LABELS, STATUS_LABELS, STATUS_ORDER } from "@/features/tasks/taskLabels";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { TaskListRow } from "@/repositories/taskRepository";
import type { Profile, TaskStatus } from "@/types/database";

interface KanbanBoardProps {
  tasks: TaskListRow[];
  profiles: Profile[];
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onMove: (taskId: string, status: TaskStatus, boardPosition: number) => void;
  onCardClick: (taskId: string) => void;
  onAddCard: (status: TaskStatus) => void;
}

function profileName(profiles: Profile[], id: string): string {
  return profiles.find((p) => p.id === id)?.full_name ?? "Usuário";
}

function profileAvatarUrl(profiles: Profile[], id: string): string | null {
  return profiles.find((p) => p.id === id)?.avatar_url ?? null;
}

function CardAssignees({ profiles, assigneeIds }: { profiles: Profile[]; assigneeIds: string[] }) {
  if (assigneeIds.length === 0) return null;
  const shown = assigneeIds.slice(0, 3);
  const extra = assigneeIds.length - shown.length;
  return (
    <div className="flex -space-x-2">
      {shown.map((id) => (
        <Avatar key={id} className="h-6 w-6 border-2 border-[var(--neu-surface-from)]">
          {profileAvatarUrl(profiles, id) && <AvatarImage src={profileAvatarUrl(profiles, id)!} alt={profileName(profiles, id)} />}
          <AvatarFallback className="text-[9px]">{profileName(profiles, id).slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
      ))}
      {extra > 0 && (
        <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--neu-surface-from)] bg-[rgba(190,249,27,0.12)] text-[9px] font-semibold text-[var(--neu-lime-solid)]">
          +{extra}
        </span>
      )}
    </div>
  );
}

const FLAGGED_PRIORITIES = new Set(["alta", "urgente", "critica"]);

/** The card face shared by the sortable card and its DragOverlay clone.
 * Title leads and carries the most weight; priority only earns its own
 * line when it's actually worth flagging (alta/urgente/crítica) instead of
 * a loud filled pill on every card — the card's top accent bar already
 * carries priority at a glance without taking up content space. */
function CardFace({ task, profiles }: { task: TaskListRow; profiles: Profile[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const dueLabel = formatDueDateLabel(task.due_date, task.status, today);
  const isOverdueOrToday = task.due_date !== null && task.status !== "concluido" && task.due_date <= today;
  const accent = PRIORITY_ACCENT_COLOR[task.priority];
  const showPriority = FLAGGED_PRIORITIES.has(task.priority);

  return (
    <div className="space-y-1.5">
      {showPriority && (
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[.06em]" style={{ color: accent }}>
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
          {PRIORITY_LABELS[task.priority]}
        </div>
      )}

      <p className="text-[13.5px] font-semibold leading-snug text-foreground">{task.title}</p>

      {task.project_name && <p className="truncate text-[11px] text-muted-foreground">{task.project_name}</p>}

      <div className="flex items-center justify-between gap-2 pt-0.5">
        <div className="flex min-w-0 items-center gap-2.5 text-[11px]">
          {dueLabel && (
            <span
              className={cn(
                "flex items-center gap-1 font-medium",
                isOverdueOrToday ? "text-[var(--neu-error-text)]" : "text-muted-foreground",
              )}
            >
              {dueLabel}
            </span>
          )}
          {task.description && (
            <span title="Tem descrição" className="text-muted-foreground">
              <FileText className="h-3 w-3" />
            </span>
          )}
        </div>
        <CardAssignees profiles={profiles} assigneeIds={task.assigneeIds} />
      </div>
    </div>
  );
}

function KanbanCard({
  task,
  index,
  profiles,
  onStatusChange,
  onCardClick,
}: {
  task: TaskListRow;
  index: number;
  profiles: Profile[];
  onStatusChange: (status: TaskStatus) => void;
  onCardClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  return (
    <div
      ref={setNodeRef}
      data-kanban-card
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        animationDelay: `${Math.min(index, 8) * 45}ms`,
        borderTopColor: PRIORITY_ACCENT_COLOR[task.priority],
      }}
      className={cn(
        "kanban-card neu-fade-up cursor-grab border-t-[3px] p-3 text-sm active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-1.5">
        <div className="min-w-0 flex-1">
          <CardFace task={task} profiles={profiles} />
        </div>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onCardClick}
          aria-label={`Ver detalhes de ${task.title}`}
          className="shrink-0 rounded-full p-0.5 text-muted-foreground transition-colors hover:text-[var(--neu-lime-solid)]"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
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
        className="neu-select mt-2.5 h-7 w-full rounded-full border-0 bg-black/15 px-2.5 text-[11px] text-muted-foreground outline-none focus-visible:neu-focus dark:bg-white/10"
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
  profiles,
  onStatusChange,
  onCardClick,
  onAddCard,
}: {
  status: TaskStatus;
  tasks: TaskListRow[];
  profiles: Profile[];
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onCardClick: (taskId: string) => void;
  onAddCard: (status: TaskStatus) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      data-testid={`kanban-column-${status}`}
      className={cn(
        "kanban-column flex w-[280px] shrink-0 flex-col gap-2 p-2.5 transition-shadow",
        isOver && "ring-2 ring-[rgba(190,249,27,0.5)] ring-inset",
      )}
    >
      <div className="flex items-center justify-between px-1.5 pb-1 pt-1">
        <h3 className="text-[11px] font-bold uppercase tracking-[.1em] text-[var(--neu-text-secondary)]">{STATUS_LABELS[status]}</h3>
        <div className="flex items-center gap-1.5">
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-black/15 px-1.5 font-mono text-[10px] text-muted-foreground dark:bg-white/10">
            {tasks.length}
          </span>
          <button
            type="button"
            onClick={() => onAddCard(status)}
            aria-label={`Adicionar tarefa em ${STATUS_LABELS[status]}`}
            className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-[var(--neu-lime-solid)]"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex max-h-[calc(100vh-20rem)] flex-col gap-2 overflow-y-auto px-0.5 py-0.5">
          {tasks.length === 0 && (
            <p className="rounded-xl border border-dashed border-[var(--kanban-card-border)] p-3 text-center text-xs text-muted-foreground">
              Sem tarefas nesta coluna.
            </p>
          )}
          {tasks.map((task, index) => (
            <KanbanCard
              key={task.id}
              task={task}
              index={index}
              profiles={profiles}
              onStatusChange={(s) => onStatusChange(task.id, s)}
              onCardClick={() => onCardClick(task.id)}
            />
          ))}
        </div>
      </SortableContext>

      <button
        type="button"
        onClick={() => onAddCard(status)}
        className="flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-[rgba(190,249,27,0.08)] hover:text-[var(--neu-lime-solid)]"
      >
        <Plus className="h-3.5 w-3.5" /> Adicionar cartão
      </button>
    </div>
  );
}

export function KanbanBoard({ tasks, profiles, onStatusChange, onMove, onCardClick, onAddCard }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const grouped = groupTasksByStatus(tasks);
  const columns = Object.fromEntries(
    STATUS_ORDER.map((status) => [status, sortTasksByBoardPosition(grouped[status])]),
  ) as Record<TaskStatus, TaskListRow[]>;

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) ?? null : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const dragged = tasks.find((t) => t.id === active.id);
    if (!dragged) return;

    const overIsColumn = (STATUS_ORDER as string[]).includes(over.id as string);
    const destStatus = overIsColumn ? (over.id as TaskStatus) : tasks.find((t) => t.id === over.id)?.status ?? dragged.status;

    const destColumn = columns[destStatus].filter((t) => t.id !== dragged.id);
    const overIndex = overIsColumn ? destColumn.length : destColumn.findIndex((t) => t.id === over.id);
    const insertAt = overIndex === -1 ? destColumn.length : overIndex;

    const before = insertAt > 0 ? destColumn[insertAt - 1].board_position : null;
    const after = insertAt < destColumn.length ? destColumn[insertAt].board_position : null;
    const newPosition = computeBoardPosition(before, after);

    if (destStatus === dragged.status && newPosition === dragged.board_position) return;
    onMove(dragged.id, destStatus, newPosition);
  }

  return (
    <DndContext collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {STATUS_ORDER.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={columns[status]}
            profiles={profiles}
            onStatusChange={onStatusChange}
            onCardClick={onCardClick}
            onAddCard={onAddCard}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask && (
          <div
            className="kanban-card w-[280px] rotate-[1.5deg] border-t-[3px] p-3 text-sm"
            style={{ borderTopColor: PRIORITY_ACCENT_COLOR[activeTask.priority] }}
          >
            <CardFace task={activeTask} profiles={profiles} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
