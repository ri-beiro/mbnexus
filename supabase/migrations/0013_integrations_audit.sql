-- Third-party integrations (Phase 8) and the audit log (all phases).

create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  provider text not null, -- 'microsoft_365' | 'locaweb_smtp' | ...
  is_enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb, -- non-secret config only (tenant id, from-address...)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider)
);

create trigger trg_integrations_updated_at
  before update on public.integrations
  for each row execute function public.set_updated_at();

-- Tokens are only ever written/read by Edge Functions using the service role
-- key; RLS below denies all client access outright (defense in depth even
-- though anon/authenticated keys should never see this table).
create table public.integration_tokens (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.integrations (id) on delete cascade,
  encrypted_access_token text,
  encrypted_refresh_token text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_integration_tokens_updated_at
  before update on public.integration_tokens
  for each row execute function public.set_updated_at();

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  actor_profile_id uuid references public.profiles (id) on delete set null,
  action text not null, -- e.g. 'task.update', 'user.deactivate'
  entity_type text not null,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  ip_address text,
  source text, -- 'web' | 'edge_function' | 'automation'
  created_at timestamptz not null default now()
);

create index idx_audit_logs_org on public.audit_logs (organization_id, created_at desc);
create index idx_audit_logs_entity on public.audit_logs (entity_type, entity_id);

alter table public.integrations enable row level security;
alter table public.integration_tokens enable row level security;
alter table public.audit_logs enable row level security;

create policy integrations_select on public.integrations
  for select to authenticated
  using (organization_id = public.current_organization_id() and public.is_super_admin());

create policy integrations_write on public.integrations
  for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

-- No policy grants access to integration_tokens for anon/authenticated roles:
-- RLS is enabled and zero policies exist, so every client-side query returns
-- no rows and every write is rejected. Only the service role (which bypasses
-- RLS) can read/write it, from Edge Functions.

create policy audit_logs_select on public.audit_logs
  for select to authenticated
  using (public.is_super_admin() or public.has_permission('audit.view'));
