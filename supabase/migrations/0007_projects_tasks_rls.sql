alter table public.tags enable row level security;
alter table public.projects enable row level security;
alter table public.project_phases enable row level security;
alter table public.project_members enable row level security;
alter table public.tasks enable row level security;
alter table public.task_assignees enable row level security;
alter table public.task_dependencies enable row level security;
alter table public.task_comments enable row level security;
alter table public.task_attachments enable row level security;
alter table public.task_checklists enable row level security;
alter table public.task_tags enable row level security;

-- SECURITY DEFINER helpers, same reasoning as migration 0004: projects and
-- project_members each gate access by querying the other, and tasks and
-- task_assignees do the same. A policy that queries another RLS-protected
-- table re-triggers that table's policies as the calling role, and if the
-- two reference each other Postgres detects infinite recursion. Wrapping
-- each cross-table check in a SECURITY DEFINER function breaks the cycle:
-- the function body runs with the (RLS-exempt) function owner's privileges,
-- so it reads the other table directly instead of re-entering its policy.
create or replace function public.is_project_member(p_project_id uuid)
returns boolean
language sql stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.project_members
    where project_id = p_project_id and profile_id = auth.uid()
  );
$$;

create or replace function public.is_project_visible(p_project_id uuid)
returns boolean
language sql stable
security definer set search_path = public
as $$
  select public.is_super_admin() or exists (
    select 1 from public.projects p
    where p.id = p_project_id
      and (
        p.owner_profile_id = auth.uid()
        or p.created_by = auth.uid()
        or p.team_id in (select public.managed_team_ids())
        or public.is_project_member(p_project_id)
      )
  );
$$;

create or replace function public.is_task_assignee(p_task_id uuid)
returns boolean
language sql stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.task_assignees
    where task_id = p_task_id and profile_id = auth.uid()
  );
$$;

create or replace function public.is_task_visible(p_task_id uuid)
returns boolean
language sql stable
security definer set search_path = public
as $$
  select public.is_super_admin() or exists (
    select 1 from public.tasks t
    where t.id = p_task_id
      and (
        t.created_by = auth.uid()
        or t.team_id in (select public.managed_team_ids())
        or public.is_task_assignee(p_task_id)
        or (t.project_id is not null and public.is_project_visible(t.project_id))
      )
  );
$$;

create policy tags_select on public.tags for select to authenticated
  using (organization_id = public.current_organization_id());
create policy tags_write on public.tags for all to authenticated
  using (organization_id = public.current_organization_id())
  with check (organization_id = public.current_organization_id());

-- Projects: visible if you're the owner, a member, in the responsible team's
-- managed subtree, or a super admin. Creating requires project.create.
create policy projects_select on public.projects
  for select to authenticated
  using (
    public.is_super_admin()
    or owner_profile_id = auth.uid()
    or created_by = auth.uid()
    or public.is_project_member(id)
    or team_id in (select public.managed_team_ids())
  );

create policy projects_insert on public.projects
  for insert to authenticated
  with check (public.has_permission('project.create') or public.is_super_admin());

create policy projects_update on public.projects
  for update to authenticated
  using (
    public.is_super_admin()
    or owner_profile_id = auth.uid()
    or created_by = auth.uid()
    or team_id in (select public.managed_team_ids())
  )
  with check (
    public.is_super_admin()
    or owner_profile_id = auth.uid()
    or created_by = auth.uid()
    or team_id in (select public.managed_team_ids())
  );

create policy projects_delete on public.projects
  for delete to authenticated
  using (public.is_super_admin() or created_by = auth.uid() or team_id in (select public.managed_team_ids()));

create policy project_phases_all on public.project_phases
  for all to authenticated
  using (public.is_project_visible(project_id))
  with check (public.is_project_visible(project_id));

create policy project_members_select on public.project_members
  for select to authenticated
  using (profile_id = auth.uid() or public.is_project_visible(project_id));

create policy project_members_write on public.project_members
  for all to authenticated
  using (
    public.is_super_admin()
    or project_id in (select id from public.projects where created_by = auth.uid() or owner_profile_id = auth.uid())
  )
  with check (
    public.is_super_admin()
    or project_id in (select id from public.projects where created_by = auth.uid() or owner_profile_id = auth.uid())
  );

-- Tasks: visible to creator, assignees, anyone in the responsible team's
-- managed subtree, or a super admin. This is the concrete rule from
-- docs/architecture.md section 6.4 (funcionário A não vê tarefas privadas de B).
create policy tasks_select on public.tasks
  for select to authenticated
  using (
    public.is_super_admin()
    or created_by = auth.uid()
    or public.is_task_assignee(id)
    or team_id in (select public.managed_team_ids())
    or (project_id is not null and public.is_project_visible(project_id))
  );

create policy tasks_insert on public.tasks
  for insert to authenticated
  with check (public.has_permission('task.create') or public.is_super_admin());

create policy tasks_update on public.tasks
  for update to authenticated
  using (
    public.is_super_admin()
    or created_by = auth.uid()
    or public.is_task_assignee(id)
    or team_id in (select public.managed_team_ids())
  )
  with check (
    public.is_super_admin()
    or created_by = auth.uid()
    or public.is_task_assignee(id)
    or team_id in (select public.managed_team_ids())
  );

create policy tasks_delete on public.tasks
  for delete to authenticated
  using (public.is_super_admin() or created_by = auth.uid() or team_id in (select public.managed_team_ids()));

create policy task_assignees_select on public.task_assignees
  for select to authenticated
  using (
    profile_id = auth.uid()
    or public.is_task_visible(task_id)
  );

create policy task_assignees_write on public.task_assignees
  for all to authenticated
  using (task_id in (select id from public.tasks where created_by = auth.uid() or team_id in (select public.managed_team_ids())) or public.is_super_admin())
  with check (task_id in (select id from public.tasks where created_by = auth.uid() or team_id in (select public.managed_team_ids())) or public.is_super_admin());

create policy task_dependencies_all on public.task_dependencies
  for all to authenticated
  using (public.is_task_visible(task_id))
  with check (public.is_task_visible(task_id));

create policy task_comments_select on public.task_comments
  for select to authenticated using (public.is_task_visible(task_id));

create policy task_comments_insert on public.task_comments
  for insert to authenticated with check (author_id = auth.uid() and public.is_task_visible(task_id));

create policy task_comments_update on public.task_comments
  for update to authenticated using (author_id = auth.uid() or public.is_super_admin())
  with check (author_id = auth.uid() or public.is_super_admin());

create policy task_comments_delete on public.task_comments
  for delete to authenticated using (author_id = auth.uid() or public.is_super_admin());

create policy task_attachments_select on public.task_attachments
  for select to authenticated using (public.is_task_visible(task_id));

create policy task_attachments_write on public.task_attachments
  for all to authenticated
  using (uploaded_by = auth.uid() or task_id in (select id from public.tasks where created_by = auth.uid()) or public.is_super_admin())
  with check (uploaded_by = auth.uid());

create policy task_checklists_all on public.task_checklists
  for all to authenticated
  using (public.is_task_visible(task_id))
  with check (public.is_task_visible(task_id));

create policy task_tags_all on public.task_tags
  for all to authenticated
  using (public.is_task_visible(task_id))
  with check (public.is_task_visible(task_id));
