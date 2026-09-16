import { supabase } from "@/lib/supabase";
import { computeProjectProgressFromTasks } from "@/features/projects/projectLogic";
import type { Project, ProjectPhase, ProjectStatus, TaskPriority, TaskStatus } from "@/types/database";

export interface CreateProjectInput {
  organizationId: string;
  name: string;
  createdBy: string;
  code?: string | null;
  description?: string | null;
  ownerProfileId?: string | null;
  managementUnitId?: string | null;
  departmentId?: string | null;
  teamId?: string | null;
  status?: ProjectStatus;
  priority?: TaskPriority;
  startDate?: string | null;
  dueDate?: string | null;
  budget?: number | null;
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const { data, error } = await supabase
    .from("projects")
    .insert({
      organization_id: input.organizationId,
      name: input.name,
      code: input.code ?? null,
      description: input.description ?? null,
      owner_profile_id: input.ownerProfileId ?? null,
      management_unit_id: input.managementUnitId ?? null,
      department_id: input.departmentId ?? null,
      team_id: input.teamId ?? null,
      status: input.status ?? "planejamento",
      priority: input.priority ?? "normal",
      start_date: input.startDate ?? null,
      due_date: input.dueDate ?? null,
      budget: input.budget ?? null,
      created_by: input.createdBy,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Project;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string | null;
  status?: ProjectStatus;
  priority?: TaskPriority;
  ownerProfileId?: string | null;
  teamId?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  progress?: number;
  budget?: number | null;
}

const UPDATE_PROJECT_KEYS: Record<keyof UpdateProjectInput, string> = {
  name: "name",
  description: "description",
  status: "status",
  priority: "priority",
  ownerProfileId: "owner_profile_id",
  teamId: "team_id",
  startDate: "start_date",
  dueDate: "due_date",
  progress: "progress",
  budget: "budget",
};

export async function updateProject(projectId: string, patch: UpdateProjectInput): Promise<void> {
  const payload: Record<string, unknown> = {};
  for (const [key, column] of Object.entries(UPDATE_PROJECT_KEYS) as [keyof UpdateProjectInput, string][]) {
    if (key in patch) payload[column] = patch[key];
  }
  const { error } = await supabase.from("projects").update(payload).eq("id", projectId);
  if (error) throw error;
}

export async function deleteProject(projectId: string): Promise<void> {
  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) throw error;
}

export async function addProjectMember(projectId: string, profileId: string): Promise<void> {
  const { error } = await supabase.from("project_members").insert({ project_id: projectId, profile_id: profileId });
  if (error) throw error;
}

export async function removeProjectMember(projectId: string, profileId: string): Promise<void> {
  const { error } = await supabase
    .from("project_members")
    .delete()
    .eq("project_id", projectId)
    .eq("profile_id", profileId);
  if (error) throw error;
}

export async function listProjectPhases(projectId: string): Promise<ProjectPhase[]> {
  const { data, error } = await supabase
    .from("project_phases")
    .select("*")
    .eq("project_id", projectId)
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ProjectPhase[];
}

export async function createProjectPhase(projectId: string, name: string): Promise<ProjectPhase> {
  const { data, error } = await supabase
    .from("project_phases")
    .insert({ project_id: projectId, name })
    .select()
    .single();
  if (error) throw error;
  return data as ProjectPhase;
}

export interface ProjectListRow extends Project {
  team_name: string | null;
  memberIds: string[];
  computedProgress: number;
}

/** All projects visible to the current session (RLS-scoped), with the team
 * name, member ids and a task-derived progress flattened in for the list
 * view — falls back to the project's own stored progress when it has no
 * linked tasks yet. */
export async function listProjects(): Promise<ProjectListRow[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*, teams(name), project_members(profile_id), tasks(status)")
    .order("due_date", { ascending: true });
  if (error) throw error;

  return (data ?? []).map((row) => {
    const raw = row as unknown as Project & {
      teams: { name: string } | null;
      project_members: { profile_id: string }[];
      tasks: { status: TaskStatus }[];
    };
    const { teams, project_members, tasks, ...project } = raw;
    const computedProgress = computeProjectProgressFromTasks(tasks) ?? project.progress;
    return {
      ...project,
      team_name: teams?.name ?? null,
      memberIds: project_members.map((m) => m.profile_id),
      computedProgress,
    } satisfies ProjectListRow;
  });
}
