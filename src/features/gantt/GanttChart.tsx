import { buildTimelineDays, computeBarStyle, resolveTimelineRange } from "@/features/gantt/ganttLogic";
import { EmptyState } from "@/components/ui/empty-state";
import { GanttChartSquare } from "lucide-react";
import type { Task, TaskDependency } from "@/types/database";

const DAY_WIDTH = 28;

interface GanttChartProps {
  tasks: Task[];
  dependencies: TaskDependency[];
  onDateChange: (taskId: string, patch: { startDate?: string; dueDate?: string }) => void;
}

function dependencyLabel(task: Task, tasks: Task[], dependencies: TaskDependency[]): string | null {
  const deps = dependencies.filter((d) => d.task_id === task.id);
  if (deps.length === 0) return null;
  const names = deps
    .map((d) => tasks.find((t) => t.id === d.depends_on_task_id)?.title)
    .filter((title): title is string => Boolean(title));
  return names.length > 0 ? `Depende de: ${names.join(", ")}` : null;
}

export function GanttChart({ tasks, dependencies, onDateChange }: GanttChartProps) {
  const range = resolveTimelineRange(tasks);

  if (!range) {
    return (
      <EmptyState
        icon={GanttChartSquare}
        title="Nenhuma tarefa com prazo definido"
        description="O Gantt precisa de pelo menos uma tarefa com prazo para desenhar a linha do tempo."
      />
    );
  }

  const days = buildTimelineDays(range.start, range.end);
  const timelineWidth = days.length * DAY_WIDTH;

  return (
    <div className="overflow-x-auto rounded-lg border">
      <div style={{ minWidth: timelineWidth + 220 }}>
        <div className="flex border-b bg-muted/40 text-xs text-muted-foreground">
          <div className="w-56 shrink-0 border-r px-2 py-1.5">Tarefa</div>
          <div className="flex">
            {days.map((day) => (
              <div key={day} style={{ width: DAY_WIDTH }} className="shrink-0 border-r px-1 py-1.5 text-center">
                {day.slice(8, 10)}
              </div>
            ))}
          </div>
        </div>

        {tasks
          .filter((t) => t.due_date !== null)
          .map((task) => {
            const bar = computeBarStyle(task, range.start, DAY_WIDTH);
            const dependencyText = dependencyLabel(task, tasks, dependencies);
            return (
              <div key={task.id} data-testid={`gantt-row-${task.id}`} className="flex items-center border-b">
                <div className="w-56 shrink-0 border-r px-2 py-2">
                  <p className="truncate text-sm font-medium">{task.title}</p>
                  {dependencyText && <p className="truncate text-xs text-muted-foreground">{dependencyText}</p>}
                  <div className="mt-1 flex gap-2">
                    <label className="sr-only" htmlFor={`start-${task.id}`}>{`Início de ${task.title}`}</label>
                    <input
                      id={`start-${task.id}`}
                      type="date"
                      aria-label={`Início de ${task.title}`}
                      value={task.start_date ?? ""}
                      onChange={(e) => e.target.value && onDateChange(task.id, { startDate: e.target.value })}
                      className="h-6 w-28 rounded border border-input bg-background px-1 text-[10px]"
                    />
                    <label className="sr-only" htmlFor={`due-${task.id}`}>{`Fim de ${task.title}`}</label>
                    <input
                      id={`due-${task.id}`}
                      type="date"
                      aria-label={`Fim de ${task.title}`}
                      value={task.due_date ?? ""}
                      onChange={(e) => e.target.value && onDateChange(task.id, { dueDate: e.target.value })}
                      className="h-6 w-28 rounded border border-input bg-background px-1 text-[10px]"
                    />
                  </div>
                </div>
                <div className="relative py-3" style={{ width: timelineWidth, height: 40 }}>
                  {bar && (
                    <div
                      className="absolute top-1/2 h-4 -translate-y-1/2 overflow-hidden rounded bg-primary/20"
                      style={{ left: bar.leftPx, width: bar.widthPx }}
                    >
                      <div className="h-full bg-primary" style={{ width: `${task.progress}%` }} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
