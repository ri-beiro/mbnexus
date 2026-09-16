import type { ProjectStatus } from "@/types/database";

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planejamento: "Planejamento",
  nao_iniciado: "Não Iniciado",
  em_andamento: "Em Andamento",
  em_risco: "Em Risco",
  bloqueado: "Bloqueado",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export const PROJECT_STATUS_ORDER: ProjectStatus[] = [
  "planejamento",
  "nao_iniciado",
  "em_andamento",
  "em_risco",
  "bloqueado",
  "concluido",
  "cancelado",
];

export const PROJECT_STATUS_BADGE_VARIANT: Record<ProjectStatus, "secondary" | "default" | "warning" | "destructive" | "success"> = {
  planejamento: "secondary",
  nao_iniciado: "secondary",
  em_andamento: "default",
  em_risco: "warning",
  bloqueado: "destructive",
  concluido: "success",
  cancelado: "secondary",
};
