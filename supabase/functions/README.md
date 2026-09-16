# Edge Functions (Fase 7 — Automação/E-mail)

Two scheduled functions, per `docs/architecture.md` sections 7-8:

- **`automations`** — evaluates every active row in `automations` against its
  organization's open tasks (mirrors `src/features/automation/conditionLogic.ts`
  in `_shared/automationConditions.ts`, since Edge Functions run in a separate
  Deno runtime and can't import the Vite/Node frontend source directly). On a
  match it queues the configured action (`{ "type": "send_email", "template":
  "<email_templates.key>" }`) for every assignee with an email, then writes an
  `automation_runs` row so the same task isn't re-notified again the same day.
- **`process-email-queue`** — drains `email_queue`, sending each pending row
  through whichever `EmailProvider` is configured (`_shared/emailProvider.ts`:
  `MicrosoftGraphEmailProvider` or `LocawebSMTPProvider`), with attempt
  tracking and a `failed` terminal state after 5 tries.

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
```

## Required secrets

Set with `supabase secrets set KEY=value` (never in the frontend `.env`,
which only carries public `VITE_*` keys):

| Secret | Used by | Notes |
| --- | --- | --- |
| `SUPABASE_URL` | both | usually already present in the function's runtime env |
| `SUPABASE_SERVICE_ROLE_KEY` | both | bypasses RLS on purpose — these run unattended, not as a user |
| `EMAIL_PROVIDER` | `process-email-queue` | `locaweb_smtp` (default) or `microsoft_graph` |
| `LOCAWEB_SMTP_HOST` / `_PORT` / `_USER` / `_PASSWORD` / `_FROM` | `process-email-queue` | required when `EMAIL_PROVIDER=locaweb_smtp` |
| `MS_TENANT_ID` / `MS_CLIENT_ID` / `MS_CLIENT_SECRET` / `MS_SENDER_UPN` | `process-email-queue` | required when `EMAIL_PROVIDER=microsoft_graph`; same app registration as the Fase 8 Graph integration, needs `Mail.Send` application permission with admin consent |

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
