// User-triggered Edge Function (docs/architecture.md section 7): creates a
// Teams online meeting for an existing event and persists the join link.
// Unlike the cron functions in Phase 7, this one is called synchronously
// from the frontend (eventRepository.createTeamsMeeting) while the org's
// admin app registration handles the Graph call app-only — no per-user
// Microsoft login required.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createAdminClient, requiredEnv } from "../_shared/supabaseAdmin.ts";
import { getGraphAppToken } from "../_shared/graphAuth.ts";
import { buildOnlineMeetingRequest, mapMeetingResponse } from "../_shared/teamsMeetingLogic.ts";

interface RequestBody {
  eventId?: string;
}

interface EventRow {
  id: string;
  organization_id: string;
  title: string;
  starts_at: string;
  ends_at: string;
}

interface IntegrationConfig {
  organizerUpn?: string;
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonError("Não autenticado.", 401);

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return jsonError("Corpo da requisição inválido.", 400);
  }
  if (!body.eventId) return jsonError("eventId é obrigatório.", 400);

  // Acts as the caller (their JWT forwarded via the Authorization header),
  // so reading/updating the event goes through the same `events_select` /
  // `events_write` RLS policies the rest of the app uses — no separate
  // authorization check duplicated here.
  const userClient = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: event, error: eventError } = await userClient
    .from("events")
    .select("id, organization_id, title, starts_at, ends_at")
    .eq("id", body.eventId)
    .single();
  if (eventError || !event) {
    return jsonError(eventError?.message ?? "Evento não encontrado ou sem permissão de acesso.", 404);
  }
  const typedEvent = event as EventRow;

  // integrations is super-admin-only under RLS, but any user who can edit
  // the event should be able to trigger a meeting for it — so this lookup
  // goes through the service-role client rather than widening that policy.
  const admin = createAdminClient();
  const { data: integration } = await admin
    .from("integrations")
    .select("is_enabled, config")
    .eq("organization_id", typedEvent.organization_id)
    .eq("provider", "microsoft_365")
    .maybeSingle();

  if (!integration?.is_enabled) {
    return jsonError("A integração Microsoft 365 não está ativada para esta organização.", 409);
  }

  const organizerUpn = (integration.config as IntegrationConfig | null)?.organizerUpn;
  if (!organizerUpn) {
    return jsonError("A integração Microsoft 365 não tem um e-mail organizador configurado.", 409);
  }

  const token = await getGraphAppToken(
    requiredEnv("MS_TENANT_ID"),
    requiredEnv("MS_CLIENT_ID"),
    requiredEnv("MS_CLIENT_SECRET"),
  );

  const meetingRequest = buildOnlineMeetingRequest({
    title: typedEvent.title,
    startsAt: typedEvent.starts_at,
    endsAt: typedEvent.ends_at,
  });

  const graphResponse = await fetch(`https://graph.microsoft.com/v1.0/users/${organizerUpn}/onlineMeetings`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(meetingRequest),
  });

  if (!graphResponse.ok) {
    return jsonError(`Falha ao criar reunião no Teams: ${graphResponse.status} ${await graphResponse.text()}`, 502);
  }

  const patch = mapMeetingResponse(await graphResponse.json());

  const { data: updated, error: updateError } = await userClient
    .from("events")
    .update({ teams_meeting_id: patch.teamsMeetingId, teams_join_url: patch.teamsJoinUrl })
    .eq("id", body.eventId)
    .select()
    .single();
  if (updateError) return jsonError(updateError.message, 500);

  return new Response(JSON.stringify(updated), { headers: { "Content-Type": "application/json" } });
});
