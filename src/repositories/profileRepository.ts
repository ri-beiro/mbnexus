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

const AVATARS_BUCKET = "avatars";

/** Uploads to `<profileId>/<kind>.<ext>` (overwriting any previous file at
 * that path) and stamps a cache-busting query param on the public URL so
 * the UI picks up the new image immediately instead of an old cached one. */
async function uploadProfileMedia(
  profileId: string,
  file: File,
  kind: "avatar" | "cover",
  column: "avatar_url" | "cover_url",
): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${profileId}/${kind}.${ext}`;

  const { error: uploadError } = await supabase.storage.from(AVATARS_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || undefined,
  });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path);
  const url = `${data.publicUrl}?t=${Date.now()}`;

  const { error: updateError } = await supabase.from("profiles").update({ [column]: url }).eq("id", profileId);
  if (updateError) throw updateError;

  return url;
}

export function uploadAvatar(profileId: string, file: File): Promise<string> {
  return uploadProfileMedia(profileId, file, "avatar", "avatar_url");
}

export function uploadCoverPhoto(profileId: string, file: File): Promise<string> {
  return uploadProfileMedia(profileId, file, "cover", "cover_url");
}

export interface ProfileDetailsUpdate {
  fullName?: string;
  teamsUrl?: string | null;
  whatsappNumber?: string | null;
  birthday?: string | null;
}

/** Only the keys actually present in `updates` are sent, so a field left
 * out of the call keeps its current value instead of being cleared. */
export async function updateProfileDetails(profileId: string, updates: ProfileDetailsUpdate): Promise<void> {
  const payload: Record<string, unknown> = {};
  if ("fullName" in updates) payload.full_name = updates.fullName;
  if ("teamsUrl" in updates) payload.teams_url = updates.teamsUrl;
  if ("whatsappNumber" in updates) payload.whatsapp_number = updates.whatsappNumber;
  if ("birthday" in updates) payload.birthday = updates.birthday;

  const { error } = await supabase.from("profiles").update(payload).eq("id", profileId);
  if (error) throw error;
}

export async function setCoverPreset(profileId: string, presetId: string): Promise<void> {
  const { error } = await supabase.from("profiles").update({ cover_url: `preset:${presetId}` }).eq("id", profileId);
  if (error) throw error;
}
