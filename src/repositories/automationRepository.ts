import { supabase } from "@/lib/supabase";
import type { Automation } from "@/types/database";

export async function listAutomations(): Promise<Automation[]> {
  const { data, error } = await supabase.from("automations").select("*").order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Automation[];
}

export interface CreateAutomationInput {
  organizationId: string;
  name: string;
  triggerEvent: string;
  createdBy: string;
  description?: string | null;
  condition?: Record<string, unknown>;
  action?: Record<string, unknown>;
}

export async function createAutomation(input: CreateAutomationInput): Promise<Automation> {
  const { data, error } = await supabase
    .from("automations")
    .insert({
      organization_id: input.organizationId,
      name: input.name,
      trigger_event: input.triggerEvent,
      created_by: input.createdBy,
      description: input.description ?? null,
      condition: input.condition ?? {},
      action: input.action ?? {},
      is_active: true,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Automation;
}

export interface UpdateAutomationInput {
  name?: string;
  description?: string | null;
  triggerEvent?: string;
  condition?: Record<string, unknown>;
  action?: Record<string, unknown>;
  isActive?: boolean;
}

const UPDATE_AUTOMATION_KEYS: Record<keyof UpdateAutomationInput, string> = {
  name: "name",
  description: "description",
  triggerEvent: "trigger_event",
  condition: "condition",
  action: "action",
  isActive: "is_active",
};

export async function updateAutomation(automationId: string, patch: UpdateAutomationInput): Promise<void> {
  const payload: Record<string, unknown> = {};
  for (const [key, column] of Object.entries(UPDATE_AUTOMATION_KEYS) as [keyof UpdateAutomationInput, string][]) {
    if (key in patch) payload[column] = patch[key];
  }
  const { error } = await supabase.from("automations").update(payload).eq("id", automationId);
  if (error) throw error;
}

export async function deleteAutomation(automationId: string): Promise<void> {
  const { error } = await supabase.from("automations").delete().eq("id", automationId);
  if (error) throw error;
}
