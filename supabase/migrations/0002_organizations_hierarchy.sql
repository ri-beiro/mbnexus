-- Organizations, profiles and the org-chart hierarchy:
-- organizations -> management_units (gerencias) -> departments (coordenacoes) -> teams (equipes) -> team_members

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_organizations_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

-- One row per auth.users, holds app-level profile data.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  full_name text not null,
  email text not null,
  job_title text,
  avatar_url text,
  is_active boolean not null default true,
  -- direct team membership (a profile's "home" team); management_units/departments
  -- are reached by joining through the team, so a person's position in the org
  -- chart always has one source of truth.
  primary_team_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_organization on public.profiles (organization_id);
create index idx_profiles_primary_team on public.profiles (primary_team_id);

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.management_units (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  description text,
  manager_profile_id uuid references public.profiles (id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_management_units_org on public.management_units (organization_id);
create index idx_management_units_manager on public.management_units (manager_profile_id);

create trigger trg_management_units_updated_at
  before update on public.management_units
  for each row execute function public.set_updated_at();

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  management_unit_id uuid not null references public.management_units (id) on delete cascade,
  name text not null,
  description text,
  coordinator_profile_id uuid references public.profiles (id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_departments_org on public.departments (organization_id);
create index idx_departments_management_unit on public.departments (management_unit_id);
create index idx_departments_coordinator on public.departments (coordinator_profile_id);

create trigger trg_departments_updated_at
  before update on public.departments
  for each row execute function public.set_updated_at();

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  department_id uuid not null references public.departments (id) on delete cascade,
  name text not null,
  description text,
  leader_profile_id uuid references public.profiles (id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_teams_org on public.teams (organization_id);
create index idx_teams_department on public.teams (department_id);
create index idx_teams_leader on public.teams (leader_profile_id);

create trigger trg_teams_updated_at
  before update on public.teams
  for each row execute function public.set_updated_at();

alter table public.profiles
  add constraint fk_profiles_primary_team
  foreign key (primary_team_id) references public.teams (id) on delete set null;

-- Membership join table (a profile could, in principle, help out in more than one team).
create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  is_primary boolean not null default true,
  joined_at timestamptz not null default now(),
  unique (team_id, profile_id)
);

create index idx_team_members_team on public.team_members (team_id);
create index idx_team_members_profile on public.team_members (profile_id);

-- Bootstrap a profile row automatically whenever a new auth user is created.
-- organization_id/full_name come from the invite/signup metadata (set by an
-- admin flow or Edge Function); a super admin can edit the profile afterwards.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  target_org_id uuid;
begin
  target_org_id := nullif(new.raw_user_meta_data ->> 'organization_id', '')::uuid;

  if target_org_id is null then
    select id into target_org_id from public.organizations order by created_at limit 1;
  end if;

  insert into public.profiles (id, organization_id, full_name, email)
  values (
    new.id,
    target_org_id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger trg_handle_new_auth_user
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
