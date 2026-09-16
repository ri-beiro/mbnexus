import { supabase } from "@/lib/supabase";
import type { Notification, NotificationPreference } from "@/types/database";

export async function listNotifications(): Promise<Notification[]> {
  const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Notification[];
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId);
  if (error) throw error;
}

export async function markAllNotificationsAsRead(profileId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("profile_id", profileId)
    .eq("is_read", false);
  if (error) throw error;
}

export async function getNotificationPreferences(profileId: string): Promise<NotificationPreference | null> {
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as NotificationPreference | null;
}

export interface UpdateNotificationPreferencesInput {
  inAppEnabled?: boolean;
  emailEnabled?: boolean;
}

export async function updateNotificationPreferences(
  profileId: string,
  patch: UpdateNotificationPreferencesInput,
): Promise<NotificationPreference> {
  const payload: Record<string, unknown> = { profile_id: profileId };
  if (patch.inAppEnabled !== undefined) payload.in_app_enabled = patch.inAppEnabled;
  if (patch.emailEnabled !== undefined) payload.email_enabled = patch.emailEnabled;

  const { data, error } = await supabase
    .from("notification_preferences")
    .upsert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as NotificationPreference;
}
