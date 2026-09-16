import { supabase } from "@/lib/supabase";
import type { Integration } from "@/types/database";

export async function getIntegration(provider: string): Promise<Integration | null> {
  const { data, error } = await supabase.from("integrations").select("*").eq("provider", provider).maybeSingle();
  if (error) throw error;
  return (data ?? null) as Integration | null;
}

export interface UpsertIntegrationInput {
  organizationId: string;
  provider: string;
  isEnabled: boolean;
  config: Record<string, unknown>;
}

export async function upsertIntegration(input: UpsertIntegrationInput): Promise<Integration> {
  const { data, error } = await supabase
    .from("integrations")
    .upsert(
      {
        organization_id: input.organizationId,
        provider: input.provider,
        is_enabled: input.isEnabled,
        config: input.config,
      },
      { onConflict: "organization_id,provider" },
    )
    .select()
    .single();
  if (error) throw error;
  return data as Integration;
}
