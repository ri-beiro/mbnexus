import type { Idea, IdeaStatus } from "@/types/database";

/** The melhoria contínua pipeline (section 20), in order. */
export const IDEA_STATUS_ORDER: IdeaStatus[] = [
  "ideia",
  "em_analise",
  "aprovada",
  "planejada",
  "em_execucao",
  "implantada",
  "resultados",
];

export const IDEA_STATUS_LABELS: Record<IdeaStatus, string> = {
  ideia: "Ideia",
  em_analise: "Em Análise",
  aprovada: "Aprovada",
  planejada: "Planejada",
  em_execucao: "Em Execução",
  implantada: "Implantada",
  resultados: "Resultados",
};

/** The next stage in the pipeline, or null once at the last one. */
export function nextIdeaStatus(status: IdeaStatus): IdeaStatus | null {
  const index = IDEA_STATUS_ORDER.indexOf(status);
  return index === -1 || index === IDEA_STATUS_ORDER.length - 1 ? null : IDEA_STATUS_ORDER[index + 1];
}

export interface IdeaFilters {
  statuses?: IdeaStatus[];
  search?: string;
}

export function filterIdeas<T extends Idea>(ideas: T[], filters: IdeaFilters): T[] {
  const search = filters.search?.trim().toLowerCase();
  return ideas.filter((idea) => {
    if (filters.statuses && filters.statuses.length > 0 && !filters.statuses.includes(idea.status)) return false;
    if (search && !idea.title.toLowerCase().includes(search)) return false;
    return true;
  });
}
