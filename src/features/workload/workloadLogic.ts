import type { Task } from "@/types/database";

/** Assumed effort for a task with no estimate, so every open task still
 * counts toward workload instead of vanishing from the calculation. */
export const DEFAULT_ESTIMATE_MINUTES = 120;

/** A 40h work week, in minutes — the capacity a workload of 100% represents. */
export const WEEKLY_CAPACITY_MINUTES = 40 * 60;

export type WorkloadLevel = "baixa" | "normal" | "elevada" | "sobrecarga";

/** Total estimated minutes of open (non-concluido) work — the numerator for
 * a person's workload (section 17: calcular carga a partir de tarefas,
 * quantidade, estimativa, duração). */
export function computeWorkloadMinutes(tasks: Array<Pick<Task, "status" | "estimate_minutes">>): number {
  return tasks
    .filter((t) => t.status !== "concluido")
    .reduce((sum, t) => sum + (t.estimate_minutes ?? DEFAULT_ESTIMATE_MINUTES), 0);
}

export function computeWorkloadPercent(minutes: number, capacityMinutes: number): number {
  return Math.round((minutes / capacityMinutes) * 100);
}

/** Four bands from section 17: baixa < normal < elevada < sobrecarga. */
export function classifyWorkload(percent: number): WorkloadLevel {
  if (percent < 50) return "baixa";
  if (percent <= 84) return "normal";
  if (percent <= 110) return "elevada";
  return "sobrecarga";
}

export interface PersonWorkload {
  profileId: string;
  openTaskCount: number;
  overdueTaskCount: number;
  minutes: number;
  percent: number;
  level: WorkloadLevel;
}

export function computePersonWorkload(
  profileId: string,
  tasks: Array<Pick<Task, "status" | "estimate_minutes" | "due_date">>,
  referenceDate: string,
  capacityMinutes: number = WEEKLY_CAPACITY_MINUTES,
): PersonWorkload {
  const open = tasks.filter((t) => t.status !== "concluido");
  const minutes = computeWorkloadMinutes(tasks);
  const percent = computeWorkloadPercent(minutes, capacityMinutes);
  return {
    profileId,
    openTaskCount: open.length,
    overdueTaskCount: open.filter((t) => t.due_date !== null && t.due_date < referenceDate).length,
    minutes,
    percent,
    level: classifyWorkload(percent),
  };
}

