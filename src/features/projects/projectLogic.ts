import { percentageComplete } from "@/lib/progress";
import type { Project, ProjectStatus, Task, TaskPriority } from "@/types/database";

/** Percentage of a project's linked tasks that are concluido (section 6: um
 * projeto mostra progresso calculado a partir de suas tarefas). Returns null
 * with no linked tasks so the caller keeps the project's manually-set
 * progress instead of zeroing it out. */
export function computeProjectProgressFromTasks(tasks: Array<Pick<Task, "status">>): number | null {
  return percentageComplete(tasks, (t) => t.status === "concluido");
}

export function sortProjectsByDueDate<T extends Pick<Project, "due_date">>(projects: T[]): T[] {
  return [...projects].sort((a, b) => {
    if (a.due_date === b.due_date) return 0;
    if (a.due_date === null) return 1;
    if (b.due_date === null) return -1;
    return a.due_date < b.due_date ? -1 : 1;
  });
}

export interface ProjectFilters {
  statuses?: ProjectStatus[];
  priorities?: TaskPriority[];
  teamId?: string;
  departmentId?: string;
  managementUnitId?: string;
  search?: string;
}

/** Applies the filter bar (section 37) with AND semantics across fields. */
export function filterProjects<T extends Project>(projects: T[], filters: ProjectFilters): T[] {
  const search = filters.search?.trim().toLowerCase();

  return projects.filter((project) => {
    if (filters.statuses && filters.statuses.length > 0 && !filters.statuses.includes(project.status)) return false;
    if (filters.priorities && filters.priorities.length > 0 && !filters.priorities.includes(project.priority)) return false;
    if (filters.teamId && project.team_id !== filters.teamId) return false;
    if (filters.departmentId && project.department_id !== filters.departmentId) return false;
    if (filters.managementUnitId && project.management_unit_id !== filters.managementUnitId) return false;
    if (search && !project.name.toLowerCase().includes(search)) return false;
    return true;
  });
}
