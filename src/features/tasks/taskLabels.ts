import type { TaskPriority, TaskStatus } from "@/types/database";

export const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: "Backlog",
  a_fazer: "A Fazer",
  em_andamento: "Em Andamento",
  em_revisao: "Em Revisão",
  bloqueado: "Bloqueado",
  concluido: "Concluído",
};

export const STATUS_ORDER: TaskStatus[] = ["backlog", "a_fazer", "em_andamento", "em_revisao", "bloqueado", "concluido"];

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  baixa: "Baixa",
  normal: "Normal",
  alta: "Alta",
  urgente: "Urgente",
  critica: "Crítica",
};

export const PRIORITY_ORDER: TaskPriority[] = ["baixa", "normal", "alta", "urgente", "critica"];

export const PRIORITY_BADGE_VARIANT: Record<TaskPriority, "secondary" | "default" | "warning" | "destructive"> = {
  baixa: "secondary",
  normal: "secondary",
  alta: "default",
  urgente: "warning",
  critica: "destructive",
};

/** A small accent color per priority, used for Kanban card top-bars and the
 * priority indicator dot on list rows — keeps the two views visually
 * consistent instead of each inventing its own palette. */
export const PRIORITY_ACCENT_COLOR: Record<TaskPriority, string> = {
  baixa: "var(--neu-text-label)",
  normal: "var(--neu-text-label)",
  alta: "var(--neu-lime-solid)",
  urgente: "#e8b43b",
  critica: "var(--neu-error-text)",
};
