import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types/database";

export async function getProfile(profileId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", profileId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function listOrgProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase.from("profiles").select("*").order("full_name");
  if (error) throw error;
  return data ?? [];
}

export async function setProfileActive(profileId: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from("profiles").update({ is_active: isActive }).eq("id", profileId);
  if (error) throw error;
}

export async function transferProfileTeam(profileId: string, teamId: string | null): Promise<void> {
  const { error } = await supabase.from("profiles").update({ primary_team_id: teamId }).eq("id", profileId);
  if (error) throw error;
}
