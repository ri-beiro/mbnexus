-- Row Level Security for organizations, profiles and the hierarchy/RBAC tables.
-- Every table in the app carries RLS from the migration that creates it — see
-- docs/architecture.md section 6 for the overall strategy.

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.management_units enable row level security;
alter table public.departments enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;

-- organizations: any authenticated member of the org can read it; only a
-- super admin can change organization-level settings.
create policy organizations_select on public.organizations
  for select to authenticated
  using (id = public.current_organization_id());

create policy organizations_update on public.organizations
  for update to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- profiles: see your own profile, anyone in your managed subtree, or (read-only)
-- any teammate in your own team/org chart for basic directory purposes.
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or public.is_in_scope(id)
    or organization_id = public.current_organization_id()
  );

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_super_admin() or public.has_permission('user.manage'))
  with check (id = auth.uid() or public.is_super_admin() or public.has_permission('user.manage'));

create policy profiles_insert_admin on public.profiles
  for insert to authenticated
  with check (public.is_super_admin() or public.has_permission('user.manage'));

-- management_units / departments / teams: readable by anyone in the org
-- (needed to render org charts / pickers); writable only by super admin or
-- someone with hierarchy.manage inside that slice.
create policy management_units_select on public.management_units
  for select to authenticated
  using (organization_id = public.current_organization_id());

create policy management_units_write on public.management_units
  for all to authenticated
  using (public.is_super_admin() or public.has_permission('hierarchy.manage'))
  with check (public.is_super_admin() or public.has_permission('hierarchy.manage'));

create policy departments_select on public.departments
  for select to authenticated
  using (organization_id = public.current_organization_id());

create policy departments_write on public.departments
  for all to authenticated
  using (
    public.is_super_admin()
    or (public.has_permission('hierarchy.manage') and management_unit_id in (select public.managed_management_unit_ids()))
  )
  with check (
    public.is_super_admin()
    or (public.has_permission('hierarchy.manage') and management_unit_id in (select public.managed_management_unit_ids()))
  );

create policy teams_select on public.teams
  for select to authenticated
  using (organization_id = public.current_organization_id());

create policy teams_write on public.teams
  for all to authenticated
  using (
    public.is_super_admin()
    or (public.has_permission('hierarchy.manage') and department_id in (select public.managed_department_ids()))
  )
  with check (
    public.is_super_admin()
    or (public.has_permission('hierarchy.manage') and department_id in (select public.managed_department_ids()))
  );

create policy team_members_select on public.team_members
  for select to authenticated
  using (
    profile_id = auth.uid()
    or team_id in (select public.managed_team_ids())
    or public.is_super_admin()
  );

create policy team_members_write on public.team_members
  for all to authenticated
  using (public.is_super_admin() or team_id in (select public.managed_team_ids()))
  with check (public.is_super_admin() or team_id in (select public.managed_team_ids()));

-- roles / permissions / role_permissions: catalog data, readable by everyone
-- authenticated, writable only by super admin.
create policy roles_select on public.roles for select to authenticated using (true);
create policy permissions_select on public.permissions for select to authenticated using (true);
create policy role_permissions_select on public.role_permissions for select to authenticated using (true);

create policy roles_write on public.roles
  for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());
create policy permissions_write on public.permissions
  for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());
create policy role_permissions_write on public.role_permissions
  for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

-- user_roles: users can see their own role assignments and those of people in
-- their managed subtree; only super admin or someone with role.manage (within
-- their own scope) can assign roles.
create policy user_roles_select on public.user_roles
  for select to authenticated
  using (profile_id = auth.uid() or public.is_in_scope(profile_id) or public.is_super_admin());

create policy user_roles_write on public.user_roles
  for all to authenticated
  using (public.is_super_admin() or public.has_permission('role.manage'))
  with check (public.is_super_admin() or public.has_permission('role.manage'));
