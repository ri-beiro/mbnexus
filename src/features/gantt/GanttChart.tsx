import { useState } from "react";
import { buildMonthSpans, buildTimelineDays, computeBarStyle, resolveTimelineRange } from "@/features/gantt/ganttLogic";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
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
  const monthSpans = buildMonthSpans(days);
  const timelineWidth = days.length * DAY_WIDTH;
  const selectedDependencyText = selectedTask ? dependencyLabel(selectedTask, tasks, dependencies) : null;

  return (
    <div className="neu-surface overflow-x-auto p-2">
      <div style={{ minWidth: timelineWidth + 220 }}>
        <div className="neu-divider flex border-b text-xs text-muted-foreground">
          <div className="w-56 shrink-0" />
          <div className="flex">
            {monthSpans.map((span, i) => (
              <div
                key={`${span.label}-${i}`}
                style={{ width: span.dayCount * DAY_WIDTH }}
                className="neu-divider shrink-0 border-r py-1.5 text-center text-[11px] font-semibold capitalize tracking-wide text-foreground"
              >
                {span.label}
              </div>
            ))}
          </div>
        </div>
        <div className="neu-divider flex border-b text-xs text-muted-foreground">
          <div className="neu-divider w-56 shrink-0 border-r px-2 py-1.5">Tarefa</div>
          <div className="flex">
            {days.map((day) => (
              <div key={day} style={{ width: DAY_WIDTH }} className="neu-divider shrink-0 border-r px-1 py-1.5 text-center font-mono">
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
              <div key={task.id} data-testid={`gantt-row-${task.id}`} className="neu-divider flex items-center border-b">
                <div className="w-56 shrink-0 px-2 py-2">
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
                      className="neu-sunken h-6 w-28 border-0 px-1 font-mono text-[10px] outline-none focus-visible:neu-focus"
                    />
                    <label className="sr-only" htmlFor={`due-${task.id}`}>{`Fim de ${task.title}`}</label>
                    <input
                      id={`due-${task.id}`}
                      type="date"
                      aria-label={`Fim de ${task.title}`}
                      value={task.due_date ?? ""}
                      onChange={(e) => e.target.value && onDateChange(task.id, { dueDate: e.target.value })}
                      className="neu-sunken h-6 w-28 border-0 px-1 font-mono text-[10px] outline-none focus-visible:neu-focus"
                    />
                  </div>
                </div>
                <div className="relative py-3" style={{ width: timelineWidth, height: 40 }}>
                  {bar && (
                    <button
                      type="button"
                      onClick={() => setSelectedTask(task)}
                      aria-label={`Ver detalhes de ${task.title}`}
                      className="neu-sunken absolute top-1/2 h-4 -translate-y-1/2 overflow-hidden rounded-full p-0.5 transition-transform hover:scale-[1.02]"
                      style={{ left: bar.leftPx, width: bar.widthPx }}
                    >
                      <div className="h-full rounded-full bg-[var(--neu-lime-solid)]" style={{ width: `${task.progress}%` }} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      <Dialog open={selectedTask !== null} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="max-w-sm">
          {selectedTask && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedTask.title}</DialogTitle>
                <DialogDescription>
                  {selectedTask.start_date ?? "Sem início"} → {selectedTask.due_date ?? "Sem prazo"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className="font-mono">{selectedTask.progress}%</span>
                </div>
                {selectedTask.description && <p className="text-muted-foreground">{selectedTask.description}</p>}
                {selectedDependencyText && <p className="text-xs text-muted-foreground">{selectedDependencyText}</p>}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
