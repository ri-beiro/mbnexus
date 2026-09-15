-- Calendar events / meetings (Phase 4/8 UI; schema defined now).

create type public.event_type as enum ('event', 'meeting', 'deadline');

create table public.events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  description text,
  type public.event_type not null default 'event',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text,
  project_id uuid references public.projects (id) on delete set null,
  task_id uuid references public.tasks (id) on delete set null,
  created_by uuid not null references public.profiles (id),
  -- Microsoft Teams integration (Phase 8) — never store raw tokens here,
  -- only the resulting meeting metadata; tokens live in integration_tokens.
  teams_meeting_id text,
  teams_join_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at >= starts_at)
);

create index idx_events_org on public.events (organization_id);
create index idx_events_starts_at on public.events (starts_at);
create index idx_events_project on public.events (project_id);
create index idx_events_task on public.events (task_id);

create trigger trg_events_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

create table public.event_attendees (
  event_id uuid not null references public.events (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  response text not null default 'pending' check (response in ('pending', 'accepted', 'declined', 'tentative')),
  primary key (event_id, profile_id)
);

create index idx_event_attendees_profile on public.event_attendees (profile_id);

alter table public.events enable row level security;
alter table public.event_attendees enable row level security;

-- SECURITY DEFINER helper (see migration 0007 for the full rationale): events
-- and event_attendees each gate access through the other table, so the check
-- is wrapped to avoid RLS-policy infinite recursion.
create or replace function public.is_event_attendee(p_event_id uuid)
returns boolean
language sql stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.event_attendees
    where event_id = p_event_id and profile_id = auth.uid()
  );
$$;

create policy events_select on public.events
  for select to authenticated
  using (
    public.is_super_admin()
    or created_by = auth.uid()
    or public.is_event_attendee(id)
  );

create policy events_write on public.events
  for all to authenticated
  using (public.is_super_admin() or created_by = auth.uid())
  with check (public.is_super_admin() or created_by = auth.uid());

create policy event_attendees_select on public.event_attendees
  for select to authenticated
  using (profile_id = auth.uid() or event_id in (select id from public.events where created_by = auth.uid()) or public.is_super_admin());

create policy event_attendees_write on public.event_attendees
  for all to authenticated
  using (event_id in (select id from public.events where created_by = auth.uid()) or public.is_super_admin())
  with check (event_id in (select id from public.events where created_by = auth.uid()) or public.is_super_admin());
