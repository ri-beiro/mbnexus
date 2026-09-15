-- Projects & tasks (schema defined now per docs/architecture.md section 5;
-- UI/features land in Phase 2-3). Subtasks are modeled as tasks with a
-- parent_task_id self-reference rather than a separate table, so every view
-- (list/kanban/calendar/gantt) reads the same "tasks" entity regardless of depth.

create type public.project_status as enum (
  'planejamento', 'nao_iniciado', 'em_andamento', 'em_risco',
  'bloqueado', 'concluido', 'cancelado'
);

create type public.task_priority as enum ('baixa', 'normal', 'alta', 'urgente', 'critica');

create type public.task_status as enum (
  'backlog', 'a_fazer', 'em_andamento', 'em_revisao', 'bloqueado', 'concluido'
);

create type public.dependency_type as enum ('finish_start', 'start_start', 'finish_finish');

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  color text not null default '#6366f1',
  unique (organization_id, name)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  code text,
  name text not null,
  description text,
  owner_profile_id uuid references public.profiles (id) on delete set null,
  management_unit_id uuid references public.management_units (id) on delete set null,
  department_id uuid references public.departments (id) on delete set null,
  team_id uuid references public.teams (id) on delete set null,
  status public.project_status not null default 'planejamento',
  priority public.task_priority not null default 'normal',
  start_date date,
  due_date date,
  progress numeric(5, 2) not null default 0 check (progress between 0 and 100),
  budget numeric(14, 2),
  template_of uuid references public.projects (id) on delete set null,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_projects_org on public.projects (organization_id);
create index idx_projects_team on public.projects (team_id);
create index idx_projects_status on public.projects (status);

create trigger trg_projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

create table public.project_phases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  position integer not null default 0,
  start_date date,
  due_date date,
  created_at timestamptz not null default now()
);

create index idx_project_phases_project on public.project_phases (project_id);

create table public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member',
  added_at timestamptz not null default now(),
  unique (project_id, profile_id)
);

create index idx_project_members_project on public.project_members (project_id);
create index idx_project_members_profile on public.project_members (profile_id);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  phase_id uuid references public.project_phases (id) on delete set null,
  parent_task_id uuid references public.tasks (id) on delete cascade,
  team_id uuid references public.teams (id) on delete set null,
  title text not null,
  description text,
  status public.task_status not null default 'backlog',
  priority public.task_priority not null default 'normal',
  start_date date,
  due_date date,
  estimate_minutes integer,
  progress numeric(5, 2) not null default 0 check (progress between 0 and 100),
  recurrence_rule text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_tasks_org on public.tasks (organization_id);
create index idx_tasks_project on public.tasks (project_id);
create index idx_tasks_parent on public.tasks (parent_task_id);
create index idx_tasks_team on public.tasks (team_id);
create index idx_tasks_status on public.tasks (status);
create index idx_tasks_due_date on public.tasks (due_date);

create trigger trg_tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

create table public.task_assignees (
  task_id uuid not null references public.tasks (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (task_id, profile_id)
);

create index idx_task_assignees_profile on public.task_assignees (profile_id);

create table public.task_dependencies (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  depends_on_task_id uuid not null references public.tasks (id) on delete cascade,
  type public.dependency_type not null default 'finish_start',
  check (task_id <> depends_on_task_id),
  unique (task_id, depends_on_task_id)
);

create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  author_id uuid not null references public.profiles (id),
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  edited boolean not null default false
);

create index idx_task_comments_task on public.task_comments (task_id);

create trigger trg_task_comments_updated_at
  before update on public.task_comments
  for each row execute function public.set_updated_at();

create table public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  uploaded_by uuid not null references public.profiles (id),
  file_name text not null,
  storage_path text not null,
  size_bytes bigint,
  content_type text,
  created_at timestamptz not null default now()
);

create index idx_task_attachments_task on public.task_attachments (task_id);

create table public.task_checklists (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  title text not null,
  is_done boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_task_checklists_task on public.task_checklists (task_id);

create table public.task_tags (
  task_id uuid not null references public.tasks (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (task_id, tag_id)
);
