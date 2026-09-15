import { supabase } from "@/lib/supabase";
import type { Task } from "@/types/database";

export interface MyTask extends Task {
  project_name: string | null;
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
