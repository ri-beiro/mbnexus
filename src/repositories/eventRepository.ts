import { supabase } from "@/lib/supabase";
import type { Event, EventType } from "@/types/database";

export async function listEvents(): Promise<Event[]> {
  const { data, error } = await supabase.from("events").select("*").order("starts_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Event[];
}

export interface CreateEventInput {
  organizationId: string;
  title: string;
  createdBy: string;
  startsAt: string;
  endsAt: string;
  type?: EventType;
  description?: string | null;
  location?: string | null;
  projectId?: string | null;
  taskId?: string | null;
}

export async function createEvent(input: CreateEventInput): Promise<Event> {
  const { data, error } = await supabase
    .from("events")
    .insert({
      organization_id: input.organizationId,
      title: input.title,
      created_by: input.createdBy,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      type: input.type ?? "event",
      description: input.description ?? null,
      location: input.location ?? null,
      project_id: input.projectId ?? null,
      task_id: input.taskId ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Event;
}

export interface UpdateEventInput {
  title?: string;
  description?: string | null;
  type?: EventType;
  startsAt?: string;
  endsAt?: string;
  location?: string | null;
}

const UPDATE_EVENT_KEYS: Record<keyof UpdateEventInput, string> = {
  title: "title",
  description: "description",
  type: "type",
  startsAt: "starts_at",
  endsAt: "ends_at",
  location: "location",
};

export async function updateEvent(eventId: string, patch: UpdateEventInput): Promise<void> {
  const payload: Record<string, unknown> = {};
  for (const [key, column] of Object.entries(UPDATE_EVENT_KEYS) as [keyof UpdateEventInput, string][]) {
    if (key in patch) payload[column] = patch[key];
  }
  const { error } = await supabase.from("events").update(payload).eq("id", eventId);
  if (error) throw error;
}

export async function deleteEvent(eventId: string): Promise<void> {
  const { error } = await supabase.from("events").delete().eq("id", eventId);
  if (error) throw error;
}

/** Calls the `ms-meetings` Edge Function (docs/architecture.md section 7) to
 * create a Teams online meeting for this event and persist its join link.
 * Requires the org's Microsoft 365 integration to be enabled — see
 * MicrosoftIntegrationPanel and supabase/functions/README.md. */
export async function createTeamsMeeting(eventId: string): Promise<Event> {
  const { data, error } = await supabase.functions.invoke("ms-meetings", { body: { eventId } });
  if (error) throw error;
  return data as Event;
}
