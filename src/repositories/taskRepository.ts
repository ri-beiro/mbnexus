import { supabase } from "@/lib/supabase";
import type { DependencyType, Task, TaskComment, TaskDependency, TaskPriority, TaskStatus } from "@/types/database";

export interface MyTask extends Task {
  project_name: string | null;
}

export interface CreateTaskInput {
  organizationId: string;
  title: string;
  createdBy: string;
  description?: string | null;
  projectId?: string | null;
  phaseId?: string | null;
  teamId?: string | null;
  parentTaskId?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  startDate?: string | null;
  dueDate?: string | null;
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      organization_id: input.organizationId,
      title: input.title,
      description: input.description ?? null,
      project_id: input.projectId ?? null,
      phase_id: input.phaseId ?? null,
      team_id: input.teamId ?? null,
      parent_task_id: input.parentTaskId ?? null,
      priority: input.priority ?? "normal",
      status: input.status ?? "backlog",
      start_date: input.startDate ?? null,
      due_date: input.dueDate ?? null,
      created_by: input.createdBy,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Task;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  startDate?: string | null;
  dueDate?: string | null;
  progress?: number;
}

const UPDATE_TASK_KEYS: Record<keyof UpdateTaskInput, string> = {
  title: "title",
  description: "description",
  status: "status",
  priority: "priority",
  startDate: "start_date",
  dueDate: "due_date",
  progress: "progress",
};

export async function updateTask(taskId: string, patch: UpdateTaskInput): Promise<void> {
  const payload: Record<string, unknown> = {};
  for (const [key, column] of Object.entries(UPDATE_TASK_KEYS) as [keyof UpdateTaskInput, string][]) {
    if (key in patch) payload[column] = patch[key];
  }
  const { error } = await supabase.from("tasks").update(payload).eq("id", taskId);
  if (error) throw error;
}

export async function deleteTask(taskId: string): Promise<void> {
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw error;
}

export async function addTaskAssignee(taskId: string, profileId: string): Promise<void> {
  const { error } = await supabase.from("task_assignees").insert({ task_id: taskId, profile_id: profileId });
  if (error) throw error;
}

export async function removeTaskAssignee(taskId: string, profileId: string): Promise<void> {
  const { error } = await supabase.from("task_assignees").delete().eq("task_id", taskId).eq("profile_id", profileId);
  if (error) throw error;
}

export async function listTaskComments(taskId: string): Promise<TaskComment[]> {
  const { data, error } = await supabase
    .from("task_comments")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as TaskComment[];
}

export async function addTaskComment(taskId: string, authorId: string, body: string): Promise<TaskComment> {
  const { data, error } = await supabase
    .from("task_comments")
    .insert({ task_id: taskId, author_id: authorId, body })
    .select()
    .single();
  if (error) throw error;
  return data as TaskComment;
}

export async function listSubtasks(parentTaskId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("parent_task_id", parentTaskId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Task[];
}

export async function createSubtask(input: CreateTaskInput & { parentTaskId: string }): Promise<Task> {
  return createTask(input);
}

export async function listTaskDependencies(taskIds: string[]): Promise<TaskDependency[]> {
  const { data, error } = await supabase.from("task_dependencies").select("*").in("task_id", taskIds);
  if (error) throw error;
  return (data ?? []) as TaskDependency[];
}

export async function createTaskDependency(
  taskId: string,
  dependsOnTaskId: string,
  type: DependencyType = "finish_start",
): Promise<TaskDependency> {
  const { data, error } = await supabase
    .from("task_dependencies")
    .insert({ task_id: taskId, depends_on_task_id: dependsOnTaskId, type })
    .select()
    .single();
  if (error) throw error;
  return data as TaskDependency;
}

export async function deleteTaskDependency(dependencyId: string): Promise<void> {
  const { error } = await supabase.from("task_dependencies").delete().eq("id", dependencyId);
  if (error) throw error;
}

export interface TaskListRow extends Task {
  project_name: string | null;
  assigneeIds: string[];
}

/** All top-level tasks visible to the current session (RLS-scoped), for the
 * task list/filters view. Subtasks are loaded on demand via listSubtasks
 * when a task is expanded, so this stays a flat, filterable list. */
export async function listTasks(): Promise<TaskListRow[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*, projects(name), task_assignees(profile_id)")
    .is("parent_task_id", null)
    .order("due_date", { ascending: true });
  if (error) throw error;

  return (data ?? []).map((row) => {
    const raw = row as unknown as Task & {
      projects: { name: string } | null;
      task_assignees: { profile_id: string }[];
    };
    const { projects, task_assignees, ...task } = raw;
    return {
      ...task,
      project_name: projects?.name ?? null,
      assigneeIds: task_assignees.map((a) => a.profile_id),
    } satisfies TaskListRow;
  });
}

/** Tasks assigned to the current user, newest due date first. RLS already
 * scopes this to what the signed-in profile may see. */
export async function listMyTasks(profileId: string): Promise<MyTask[]> {
  const { data, error } = await supabase
    .from("task_assignees")
    .select("tasks(*, projects(name))")
    .eq("profile_id", profileId);
  if (error) throw error;

  return (data ?? [])
    .map((row) => {
      const raw = row as unknown as { tasks: (Task & { projects: { name: string } | null }) | null };
      const t = raw.tasks;
      if (!t) return null;
      const { projects, ...task } = t;
      return { ...task, project_name: projects?.name ?? null } satisfies MyTask;
    })
    .filter((t): t is MyTask => t !== null)
    .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"));
}

interface ScopeCounts {
  tasksOpen: number;
  tasksOverdue: number;
  tasksCompleted: number;
  projectsActive: number;
  projectsAtRisk: number;
  projectsBlocked: number;
}

/** Aggregate counts for whatever slice of the org the current session can
 * see — RLS does the scoping, this just counts. Used by the management Home
 * and, later, the executive view (docs/architecture.md section 4/6). */
export async function getScopeCounts(): Promise<ScopeCounts> {
  const today = new Date().toISOString().slice(0, 10);

  const [open, overdue, completed, active, atRisk, blocked] = await Promise.all([
    supabase.from("tasks").select("id", { count: "exact", head: true }).neq("status", "concluido"),
    supabase.from("tasks").select("id", { count: "exact", head: true }).neq("status", "concluido").lt("due_date", today),
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("status", "concluido"),
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("status", "em_andamento"),
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("status", "em_risco"),
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("status", "bloqueado"),
  ]);

  return {
    tasksOpen: open.count ?? 0,
    tasksOverdue: overdue.count ?? 0,
    tasksCompleted: completed.count ?? 0,
    projectsActive: active.count ?? 0,
    projectsAtRisk: atRisk.count ?? 0,
    projectsBlocked: blocked.count ?? 0,
  };
}
