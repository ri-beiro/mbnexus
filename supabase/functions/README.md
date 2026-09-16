# Edge Functions (Fase 7 — Automação/E-mail; Fase 8 — Microsoft 365)

Three functions, per `docs/architecture.md` sections 7-8:

- **`automations`** *(cron)* — evaluates every active row in `automations`
  against its organization's open tasks (mirrors
  `src/features/automation/conditionLogic.ts` in
  `_shared/automationConditions.ts`, since Edge Functions run in a separate
  Deno runtime and can't import the Vite/Node frontend source directly). On a
  match it queues the configured action (`{ "type": "send_email", "template":
  "<email_templates.key>" }`) for every assignee with an email, then writes an
  `automation_runs` row so the same task isn't re-notified again the same day.
- **`process-email-queue`** *(cron)* — drains `email_queue`, sending each
  pending row through whichever `EmailProvider` is configured
  (`_shared/emailProvider.ts`: `MicrosoftGraphEmailProvider` or
  `LocawebSMTPProvider`), with attempt tracking and a `failed` terminal state
  after 5 tries.
- **`ms-meetings`** *(called from the frontend)* — `eventRepository.createTeamsMeeting(eventId)`
  invokes this synchronously. It reads/updates the event as the calling user
  (their JWT is forwarded, so the same `events_select`/`events_write` RLS
  policies apply — no separate authorization check duplicated here), looks up
  the org's `microsoft_365` integration row via the service-role client (that
  table is super-admin-only under RLS, but any user who can edit the event
  should be able to trigger a meeting for it), creates a Teams online meeting
  via Graph app-only auth, and persists `teams_meeting_id`/`teams_join_url`
  back onto the event. Shares the app-only Graph token helper
  (`_shared/graphAuth.ts`) with `process-email-queue`'s
  `MicrosoftGraphEmailProvider` — one app registration for both.

## ⚠️ Verification status

This code has **not** been run. The sandbox this was written in has no Deno
runtime, no Docker daemon (so no local Supabase Edge Runtime), and none of the
real secrets below — `curl`-installing Deno was tried and blocked by the
sandbox's network proxy. It was written carefully against the Supabase Edge
Functions / Deno APIs and reviewed by hand, following the same repository
conventions as the rest of the codebase, but treat it as an unverified first
draft: **deploy to a real Supabase project and exercise it end-to-end (with
real tasks, automations, and a real mailbox) before relying on it.** Start
with `LOCAWEB_SMTP_*` against a test mailbox and confirm a queued row actually
flips to `sent`.

## Deploying

```bash
supabase functions deploy automations
supabase functions deploy process-email-queue
supabase functions deploy ms-meetings
```

## Required secrets

Set with `supabase secrets set KEY=value` (never in the frontend `.env`,
which only carries public `VITE_*` keys):

| Secret | Used by | Notes |
| --- | --- | --- |
| `SUPABASE_URL` | all three | usually already present in the function's runtime env |
| `SUPABASE_ANON_KEY` | `ms-meetings` | to build the RLS-respecting client acting as the caller |
| `SUPABASE_SERVICE_ROLE_KEY` | all three | bypasses RLS on purpose for the org-wide/cron reads — never used for the event read/write in `ms-meetings`, which goes through the caller's own JWT instead |
| `EMAIL_PROVIDER` | `process-email-queue` | `locaweb_smtp` (default) or `microsoft_graph` |
| `LOCAWEB_SMTP_HOST` / `_PORT` / `_USER` / `_PASSWORD` / `_FROM` | `process-email-queue` | required when `EMAIL_PROVIDER=locaweb_smtp` |
| `MS_TENANT_ID` / `MS_CLIENT_ID` / `MS_CLIENT_SECRET` | `process-email-queue` (when `EMAIL_PROVIDER=microsoft_graph`), `ms-meetings` (always) | one app registration for both — needs `Mail.Send` and `OnlineMeetings.ReadWrite.All` **application** permissions with admin consent (app-only/client-credentials, no per-user Microsoft login) |
| `MS_SENDER_UPN` | `process-email-queue` | mailbox Graph sends as, when `EMAIL_PROVIDER=microsoft_graph` |

`ms-meetings` additionally needs a super admin to enable the integration and
set an organizer mailbox from **Configurações → Integrações** in the app
(writes to `integrations`, not a secret) before it will do anything — that
config lives in the database on purpose, since it's per-organization and
non-secret, unlike the app registration credentials above.

## Scheduling

Both functions expect a `POST` and do one batch per invocation — wire them up
with `pg_cron` + `pg_net` (or the Supabase dashboard's Scheduled Triggers UI)
rather than calling them from the frontend:

```sql
select cron.schedule(
  'process-email-queue-every-5-min',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/process-email-queue',
    headers := jsonb_build_object('Authorization', 'Bearer ' || '<service-role-or-anon-key>')
  );
  $$
);

select cron.schedule(
  'automations-every-15-min',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/automations',
    headers := jsonb_build_object('Authorization', 'Bearer ' || '<service-role-or-anon-key>')
  );
  $$
);
```

## Known gaps (left for a later pass, not silently skipped)

- `automations` only implements the `task.due_soon` / `task.overdue` /
  `subtasks.completed` triggers that `AutomationsPanel` exposes today — no
  project-level or idea-level triggers yet.
- Recurrence (`tasks.recurrence_rule`, `src/features/automation/recurrenceLogic.ts`)
  computes the *next* occurrence date but nothing yet creates the follow-up
  task row on completion — that's a third scheduled function this phase
  didn't get to.
- No dead-letter surfacing in the UI yet for rows that hit `email_queue.status
  = 'failed'`; they're visible via `getNotificationPreferences`'s sibling
  table only by querying the DB directly for now.
- `ms-meetings` only creates a meeting; there's no UI yet to cancel/update one
  once `teams_join_url` is set, and no attendee sync (`event_attendees` →
  Graph meeting participants) — the meeting is created against the organizer
  mailbox only.
- Outlook calendar sync and Teams presence/chat (mentioned in the master
  prompt alongside meetings) aren't started; only the "create a Teams link
  for an event" slice is built.
