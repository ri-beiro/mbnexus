-- Central de Ideias / melhoria contínua (Phase 9).

create type public.idea_status as enum (
  'ideia', 'em_analise', 'aprovada', 'planejada', 'em_execucao', 'implantada', 'resultados'
);

create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  author_id uuid not null references public.profiles (id),
  title text not null,
  problem text,
  proposal text,
  expected_benefit text,
  area_department_id uuid references public.departments (id) on delete set null,
  responsible_profile_id uuid references public.profiles (id) on delete set null,
  impact text,
  effort text,
  priority public.task_priority not null default 'normal',
  status public.idea_status not null default 'ideia',
  converted_project_id uuid references public.projects (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_ideas_org on public.ideas (organization_id);
create index idx_ideas_status on public.ideas (status);
create index idx_ideas_author on public.ideas (author_id);

create trigger trg_ideas_updated_at
  before update on public.ideas
  for each row execute function public.set_updated_at();

create table public.idea_comments (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references public.ideas (id) on delete cascade,
  author_id uuid not null references public.profiles (id),
  body text not null,
  created_at timestamptz not null default now()
);

create index idx_idea_comments_idea on public.idea_comments (idea_id);

alter table public.ideas enable row level security;
alter table public.idea_comments enable row level security;

-- Any employee can submit an idea and everyone in the org can read the
-- pipeline (visibility drives participation); only the author, the assigned
-- responsible, or management can change its status/fields.
create policy ideas_select on public.ideas
  for select to authenticated
  using (organization_id = public.current_organization_id());

create policy ideas_insert on public.ideas
  for insert to authenticated with check (author_id = auth.uid());

create policy ideas_update on public.ideas
  for update to authenticated
  using (author_id = auth.uid() or responsible_profile_id = auth.uid() or public.is_super_admin() or public.has_permission('project.create'))
  with check (author_id = auth.uid() or responsible_profile_id = auth.uid() or public.is_super_admin() or public.has_permission('project.create'));

create policy idea_comments_select on public.idea_comments
  for select to authenticated using (idea_id in (select id from public.ideas));

create policy idea_comments_insert on public.idea_comments
  for insert to authenticated with check (author_id = auth.uid());
