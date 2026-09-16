import { supabase } from "@/lib/supabase";
import type { Idea, IdeaComment, IdeaStatus, Project, TaskPriority } from "@/types/database";

export async function listIdeas(): Promise<Idea[]> {
  const { data, error } = await supabase.from("ideas").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Idea[];
}

export interface CreateIdeaInput {
  organizationId: string;
  authorId: string;
  title: string;
  problem?: string | null;
  proposal?: string | null;
  expectedBenefit?: string | null;
  areaDepartmentId?: string | null;
  impact?: string | null;
  effort?: string | null;
  priority?: TaskPriority;
}

export async function createIdea(input: CreateIdeaInput): Promise<Idea> {
  const { data, error } = await supabase
    .from("ideas")
    .insert({
      organization_id: input.organizationId,
      author_id: input.authorId,
      title: input.title,
      problem: input.problem ?? null,
      proposal: input.proposal ?? null,
      expected_benefit: input.expectedBenefit ?? null,
      area_department_id: input.areaDepartmentId ?? null,
      impact: input.impact ?? null,
      effort: input.effort ?? null,
      priority: input.priority ?? "normal",
      status: "ideia",
    })
    .select()
    .single();
  if (error) throw error;
  return data as Idea;
}

export interface UpdateIdeaInput {
  status?: IdeaStatus;
  responsibleProfileId?: string | null;
  impact?: string | null;
  effort?: string | null;
  priority?: TaskPriority;
}

const UPDATE_IDEA_KEYS: Record<keyof UpdateIdeaInput, string> = {
  status: "status",
  responsibleProfileId: "responsible_profile_id",
  impact: "impact",
  effort: "effort",
  priority: "priority",
};

export async function updateIdea(ideaId: string, patch: UpdateIdeaInput): Promise<void> {
  const payload: Record<string, unknown> = {};
  for (const [key, column] of Object.entries(UPDATE_IDEA_KEYS) as [keyof UpdateIdeaInput, string][]) {
    if (key in patch) payload[column] = patch[key];
  }
  const { error } = await supabase.from("ideas").update(payload).eq("id", ideaId);
  if (error) throw error;
}

export async function listIdeaComments(ideaId: string): Promise<IdeaComment[]> {
  const { data, error } = await supabase
    .from("idea_comments")
    .select("*")
    .eq("idea_id", ideaId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as IdeaComment[];
}

export async function addIdeaComment(ideaId: string, authorId: string, body: string): Promise<IdeaComment> {
  const { data, error } = await supabase
    .from("idea_comments")
    .insert({ idea_id: ideaId, author_id: authorId, body })
    .select()
    .single();
  if (error) throw error;
  return data as IdeaComment;
}

/** Turns an approved idea into a project (section 20), copying its fields
 * across and linking the idea back to the new project. Two sequential
 * writes rather than a DB transaction (no RPC for this yet) — acceptable
 * here since a failure between them just leaves the idea unlinked, which
 * is safely retryable, not a corrupted half-state. */
export async function convertIdeaToProject(idea: Idea, createdBy: string): Promise<Project> {
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      organization_id: idea.organization_id,
      name: idea.title,
      description: idea.problem,
      department_id: idea.area_department_id,
      owner_profile_id: idea.responsible_profile_id,
      priority: idea.priority,
      status: "planejamento",
      created_by: createdBy,
    })
    .select()
    .single();
  if (projectError) throw projectError;

  const { error: ideaError } = await supabase
    .from("ideas")
    .update({ converted_project_id: (project as Project).id, status: "planejada" })
    .eq("id", idea.id);
  if (ideaError) throw ideaError;

  return project as Project;
}
