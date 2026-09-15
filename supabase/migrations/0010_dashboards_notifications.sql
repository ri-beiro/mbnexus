-- Dashboards & widgets (Phase 6), notifications & preferences (Phase 7).

create type public.dashboard_scope as enum ('personal', 'team', 'department', 'management_unit', 'corporate');

create table public.dashboards (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  scope public.dashboard_scope not null default 'personal',
  scope_id uuid,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_dashboards_org on public.dashboards (organization_id);
create index idx_dashboards_owner on public.dashboards (owner_profile_id);

create trigger trg_dashboards_updated_at
  before update on public.dashboards
  for each row execute function public.set_updated_at();

create table public.dashboard_widgets (
  id uuid primary key default gen_random_uuid(),
  dashboard_id uuid not null references public.dashboards (id) on delete cascade,
  widget_type text not null,
  title text,
  config jsonb not null default '{}'::jsonb,
  position_x integer not null default 0,
  position_y integer not null default 0,
  width integer not null default 4,
  height integer not null default 3,
  created_at timestamptz not null default now()
);

create index idx_dashboard_widgets_dashboard on public.dashboard_widgets (dashboard_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link_url text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_notifications_profile on public.notifications (profile_id, is_read);

create table public.notification_preferences (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  in_app_enabled boolean not null default true,
  email_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create trigger trg_notification_preferences_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();

alter table public.dashboards enable row level security;
alter table public.dashboard_widgets enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;

create policy dashboards_select on public.dashboards
  for select to authenticated
  using (
    owner_profile_id = auth.uid()
    or public.is_super_admin()
    or (scope = 'team' and scope_id in (select public.managed_team_ids()))
    or (scope = 'department' and scope_id in (select public.managed_department_ids()))
    or (scope = 'management_unit' and scope_id in (select public.managed_management_unit_ids()))
    or scope = 'corporate'
  );

create policy dashboards_write on public.dashboards
  for all to authenticated
  using (owner_profile_id = auth.uid() or public.is_super_admin())
  with check (owner_profile_id = auth.uid() or public.is_super_admin());

create policy dashboard_widgets_all on public.dashboard_widgets
  for all to authenticated
  using (dashboard_id in (select id from public.dashboards))
  with check (dashboard_id in (select id from public.dashboards where owner_profile_id = auth.uid() or public.is_super_admin()));

create policy notifications_select on public.notifications
  for select to authenticated using (profile_id = auth.uid());

create policy notifications_update on public.notifications
  for update to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- Regular inserts are limited to the current user's own scope; bulk/system
-- notifications (automations, mentions from any author) are sent through a
-- SECURITY DEFINER RPC (added when automations land in Phase 7), which
-- bypasses this policy intentionally instead of widening it.
create policy notifications_insert on public.notifications
  for insert to authenticated
  with check (profile_id = auth.uid() or public.is_in_scope(profile_id) or public.is_super_admin());

create policy notification_preferences_all on public.notification_preferences
  for all to authenticated
  using (profile_id = auth.uid() or public.is_super_admin())
  with check (profile_id = auth.uid() or public.is_super_admin());
