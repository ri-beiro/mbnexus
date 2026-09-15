-- Automation rules and the email queue/templates (Phase 7). Business logic
-- runs in Edge Functions; these tables are the durable state they operate on.
-- See docs/architecture.md sections 7-8.

create table public.automations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  description text,
  trigger_event text not null, -- e.g. 'task.due_soon', 'task.overdue', 'subtasks.completed'
  condition jsonb not null default '{}'::jsonb,
  action jsonb not null default '{}'::jsonb, -- e.g. { "type": "send_email", "template": "..." }
  is_active boolean not null default true,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_automations_org on public.automations (organization_id);

create trigger trg_automations_updated_at
  before update on public.automations
  for each row execute function public.set_updated_at();

create table public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references public.automations (id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  status text not null default 'success' check (status in ('success', 'failed', 'skipped')),
  detail text,
  ran_at timestamptz not null default now()
);

create index idx_automation_runs_automation on public.automation_runs (automation_id);

create table public.email_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  key text not null, -- e.g. 'nova_tarefa', 'tarefa_atrasada', 'mencao'
  subject text not null,
  body_html text not null,
  updated_at timestamptz not null default now(),
  unique (organization_id, key)
);

create trigger trg_email_templates_updated_at
  before update on public.email_templates
  for each row execute function public.set_updated_at();

create table public.email_queue (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  template_id uuid references public.email_templates (id) on delete set null,
  recipient_email text not null,
  recipient_profile_id uuid references public.profiles (id) on delete set null,
  subject text not null,
  body_html text not null,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed')),
  attempts integer not null default 0,
  last_error text,
  provider text, -- 'microsoft_graph' | 'locaweb_smtp'
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index idx_email_queue_status on public.email_queue (status);
create index idx_email_queue_org on public.email_queue (organization_id);

alter table public.automations enable row level security;
alter table public.automation_runs enable row level security;
alter table public.email_templates enable row level security;
alter table public.email_queue enable row level security;

create policy automations_select on public.automations
  for select to authenticated
  using (organization_id = public.current_organization_id());

create policy automations_write on public.automations
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy automation_runs_select on public.automation_runs
  for select to authenticated
  using (automation_id in (select id from public.automations) and public.is_super_admin());

create policy email_templates_select on public.email_templates
  for select to authenticated
  using (organization_id = public.current_organization_id());

create policy email_templates_write on public.email_templates
  for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

-- Only the service role (Edge Functions) processes the queue; end users may
-- see the status of emails addressed to them, nothing else.
create policy email_queue_select on public.email_queue
  for select to authenticated
  using (recipient_profile_id = auth.uid() or public.is_super_admin());
