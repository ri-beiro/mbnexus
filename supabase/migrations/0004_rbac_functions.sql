-- SECURITY DEFINER helper functions used by RLS policies (and callable via RPC
-- from the client for read-only permission checks). Centralizing scope logic
-- here means every table's policy stays a one-liner and the rules are tested
-- in one place instead of re-derived per table.

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer set search_path = public
as $$
  select auth.uid();
$$;

-- Wrapped in SECURITY DEFINER because policies on public.profiles itself use
-- this to compare against other rows' organization_id; a plain subquery on
-- profiles from inside a profiles policy would re-trigger that same policy
-- and recurse infinitely (same class of bug as the cross-table helpers in
-- migration 0007/0009).
create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer set search_path = public
as $$
  select organization_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.profile_id = auth.uid()
      and r.key = 'super_admin'
      and ur.scope_type = 'global'
  );
$$;

-- Management units the current user manages directly (role scope_type = management_unit).
create or replace function public.managed_management_unit_ids()
returns setof uuid
language sql
stable
security definer set search_path = public
as $$
  select ur.scope_id
  from public.user_roles ur
  where ur.profile_id = auth.uid()
    and ur.scope_type = 'management_unit';
$$;

-- Departments the current user manages directly, plus every department under
-- a management unit they manage.
create or replace function public.managed_department_ids()
returns setof uuid
language sql
stable
security definer set search_path = public
as $$
  select ur.scope_id
  from public.user_roles ur
  where ur.profile_id = auth.uid()
    and ur.scope_type = 'department'
  union
  select d.id
  from public.departments d
  where d.management_unit_id in (select public.managed_management_unit_ids());
$$;

-- Teams the current user manages directly, plus every team under a department
-- (or management unit) they manage.
create or replace function public.managed_team_ids()
returns setof uuid
language sql
stable
security definer set search_path = public
as $$
  select ur.scope_id
  from public.user_roles ur
  where ur.profile_id = auth.uid()
    and ur.scope_type = 'team'
  union
  select t.id
  from public.teams t
  where t.department_id in (select public.managed_department_ids());
$$;

-- Profile ids that fall inside the current user's managed subtree (their
-- teams' members), used to gate visibility of other people's data.
create or replace function public.managed_profile_ids()
returns setof uuid
language sql
stable
security definer set search_path = public
as $$
  select tm.profile_id
  from public.team_members tm
  where tm.team_id in (select public.managed_team_ids());
$$;

-- Is target_profile_id the current user, or inside their managed subtree, or
-- is the current user a super admin?
create or replace function public.is_in_scope(target_profile_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select
    public.is_super_admin()
    or target_profile_id = auth.uid()
    or target_profile_id in (select public.managed_profile_ids());
$$;

-- Does the current user hold a role granting permission_key, in any scope?
create or replace function public.has_permission(permission_key text)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    join public.permissions p on p.id = rp.permission_id
    where ur.profile_id = auth.uid()
      and p.key = permission_key
  );
$$;
