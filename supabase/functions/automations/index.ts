// Cron-triggered Edge Function (docs/architecture.md section 7 roadmap /
// migration 0012_automations_email.sql): evaluates every active automation
// against its organization's open tasks and, on a match, queues the
// configured action (today: `{ "type": "send_email", "template": "<key>" }`)
// and records an automation_runs row so the same task isn't re-notified
// again the same day.
import { createAdminClient } from "../_shared/supabaseAdmin.ts";
import { evaluateAutomationCondition, type AutomationTaskContext } from "../_shared/automationConditions.ts";

type SupabaseAdminClient = ReturnType<typeof createAdminClient>;

interface AutomationRow {
  id: string;
  organization_id: string;
  trigger_event: string;
  condition: Record<string, unknown>;
  action: { type?: string; template?: string } | null;
}

interface TaskRow {
  id: string;
  due_date: string | null;
  status: string;
  priority: string | null;
}

interface SubtaskRow {
  parent_task_id: string;
  status: string;
}

async function fetchCandidateTasks(
  supabase: SupabaseAdminClient,
  organizationId: string,
): Promise<(TaskRow & { subtasks_total: number; subtasks_done: number })[]> {
  const [{ data: tasks, error: tasksError }, { data: subtasks, error: subtasksError }] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, due_date, status, priority")
      .eq("organization_id", organizationId)
      .is("parent_task_id", null),
    supabase
      .from("tasks")
      .select("parent_task_id, status")
      .eq("organization_id", organizationId)
      .not("parent_task_id", "is", null),
  ]);
  if (tasksError) throw tasksError;
  if (subtasksError) throw subtasksError;

  const counts = new Map<string, { total: number; done: number }>();
  for (const s of (subtasks ?? []) as SubtaskRow[]) {
    const entry = counts.get(s.parent_task_id) ?? { total: 0, done: 0 };
    entry.total++;
    if (s.status === "concluido") entry.done++;
    counts.set(s.parent_task_id, entry);
  }

  return ((tasks ?? []) as TaskRow[]).map((task) => ({
    ...task,
    subtasks_total: counts.get(task.id)?.total ?? 0,
    subtasks_done: counts.get(task.id)?.done ?? 0,
  }));
}

async function alreadyRanToday(
  supabase: SupabaseAdminClient,
  automationId: string,
  taskId: string,
  today: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("automation_runs")
    .select("id")
    .eq("automation_id", automationId)
    .eq("entity_id", taskId)
    .gte("ran_at", `${today}T00:00:00.000Z`)
    .maybeSingle();
  return data !== null;
}

async function queueAutomationEmail(
  supabase: SupabaseAdminClient,
  automation: AutomationRow,
  taskId: string,
): Promise<boolean> {
  const templateKey = automation.action?.template;
  if (!templateKey) return false;

  const { data: template } = await supabase
    .from("email_templates")
    .select("id, subject, body_html")
    .eq("organization_id", automation.organization_id)
    .eq("key", templateKey)
    .maybeSingle();
  if (!template) return false;

  const { data: assignees } = await supabase
    .from("task_assignees")
    .select("profiles(id, email)")
    .eq("task_id", taskId);

  let queued = false;
  for (const row of (assignees ?? []) as { profiles: { id: string; email: string } | null }[]) {
    const profile = row.profiles;
    if (!profile?.email) continue;
    await supabase.from("email_queue").insert({
      organization_id: automation.organization_id,
      template_id: template.id,
      recipient_email: profile.email,
      recipient_profile_id: profile.id,
      subject: template.subject,
      body_html: template.body_html,
      status: "pending",
    });
    queued = true;
  }
  return queued;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: automations, error } = await supabase.from("automations").select("*").eq("is_active", true);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let matched = 0;
  let queued = 0;

  const tasksByOrg = new Map<string, (TaskRow & { subtasks_total: number; subtasks_done: number })[]>();

  for (const automation of (automations ?? []) as AutomationRow[]) {
    let tasks = tasksByOrg.get(automation.organization_id);
    if (!tasks) {
      tasks = await fetchCandidateTasks(supabase, automation.organization_id);
      tasksByOrg.set(automation.organization_id, tasks);
    }

    for (const task of tasks) {
      const context: AutomationTaskContext = {
        due_date: task.due_date,
        status: task.status,
        priority: task.priority,
        subtasks_total: task.subtasks_total,
        subtasks_done: task.subtasks_done,
      };
      if (!evaluateAutomationCondition(automation.trigger_event, automation.condition ?? {}, context, today)) {
        continue;
      }
      matched++;

      if (await alreadyRanToday(supabase, automation.id, task.id, today)) continue;

      let detail = `Gatilho ${automation.trigger_event} disparado sem ação configurada`;
      if (automation.action?.type === "send_email") {
        const didQueue = await queueAutomationEmail(supabase, automation, task.id);
        detail = didQueue ? "E-mail enfileirado" : "Nenhum destinatário com e-mail ou modelo não encontrado";
        if (didQueue) queued++;
      }

      await supabase.from("automation_runs").insert({
        automation_id: automation.id,
        entity_type: "task",
        entity_id: task.id,
        status: "success",
        detail,
      });
    }
  }

  return new Response(JSON.stringify({ matched, queued }), {
    headers: { "Content-Type": "application/json" },
  });
});
