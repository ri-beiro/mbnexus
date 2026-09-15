-- RBAC: roles, permissions, role_permissions, user_roles (scoped)

create type public.role_key as enum (
  'super_admin',
  'gerente',
  'coordenador',
  'lider',
  'funcionario'
);

create type public.scope_type as enum (
  'global',
  'management_unit',
  'department',
  'team'
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  key public.role_key not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  -- "resource.action", e.g. "task.create", "project.delete", "audit.view"
  key text not null unique,
  resource text not null,
  action text not null,
  description text
);

create table public.role_permissions (
  role_id uuid not null references public.roles (id) on delete cascade,
  permission_id uuid not null references public.permissions (id) on delete cascade,
  primary key (role_id, permission_id)
);

-- A profile can hold multiple roles, each scoped to a slice of the org chart.
-- scope_type = 'global'           -> scope_id is null (super admin)
-- scope_type = 'management_unit'  -> scope_id references management_units.id
-- scope_type = 'department'       -> scope_id references departments.id
-- scope_type = 'team'             -> scope_id references teams.id
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete cascade,
  scope_type public.scope_type not null,
  scope_id uuid,
  created_at timestamptz not null default now(),
  constraint chk_scope_consistency check (
    (scope_type = 'global' and scope_id is null) or
    (scope_type <> 'global' and scope_id is not null)
  ),
  unique (profile_id, role_id, scope_type, scope_id)
);

create index idx_user_roles_profile on public.user_roles (profile_id);
create index idx_user_roles_role on public.user_roles (role_id);
create index idx_user_roles_scope on public.user_roles (scope_type, scope_id);

-- Seed structural roles (not sample data — these are required for the app to function).
insert into public.roles (key, name, description) values
  ('super_admin', 'Super Admin', 'Acesso global: usuários, hierarquia, permissões, auditoria e parâmetros globais.'),
  ('gerente', 'Gerente', 'Administra sua gerência: coordenações, equipes, projetos e indicadores da estrutura.'),
  ('coordenador', 'Coordenador', 'Administra suas equipes, projetos e tarefas.'),
  ('lider', 'Líder de Equipe', 'Distribui e acompanha tarefas da sua equipe.'),
  ('funcionario', 'Funcionário', 'Executa e acompanha suas próprias tarefas, projetos e notas.');

-- Seed the base permission catalog (resource.action). Fine-grained permissions
-- are added as later phases introduce their resources (tasks, projects, ideas...).
insert into public.permissions (key, resource, action, description) values
  ('organization.manage', 'organization', 'manage', 'Configurar parâmetros globais da organização.'),
  ('hierarchy.manage', 'hierarchy', 'manage', 'Criar/editar gerências, coordenações e equipes.'),
  ('user.manage', 'user', 'manage', 'Convidar, ativar/desativar e transferir usuários.'),
  ('role.manage', 'role', 'manage', 'Atribuir papéis e permissões.'),
  ('audit.view', 'audit', 'view', 'Consultar logs de auditoria.'),
  ('project.create', 'project', 'create', 'Criar projetos.'),
  ('project.view_scope', 'project', 'view_scope', 'Visualizar projetos dentro do escopo hierárquico.'),
  ('task.create', 'task', 'create', 'Criar tarefas.'),
  ('task.view_scope', 'task', 'view_scope', 'Visualizar tarefas dentro do escopo hierárquico.'),
  ('team.view_scope', 'team', 'view_scope', 'Visualizar equipes/funcionários dentro do escopo hierárquico.'),
  ('dashboard.view_management', 'dashboard', 'view_management', 'Visualizar dashboards de gestão (workload, indicadores).');

-- Role -> permission grants.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.key = 'super_admin';

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p
  on p.key in (
    'project.create', 'project.view_scope', 'task.create', 'task.view_scope',
    'team.view_scope', 'dashboard.view_management', 'user.manage'
  )
where r.key = 'gerente';

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p
  on p.key in (
    'project.create', 'project.view_scope', 'task.create', 'task.view_scope',
    'team.view_scope', 'dashboard.view_management'
  )
where r.key = 'coordenador';

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p
  on p.key in ('task.create', 'task.view_scope', 'team.view_scope', 'dashboard.view_management')
where r.key = 'lider';

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p
  on p.key in ('task.create', 'task.view_scope')
where r.key = 'funcionario';
