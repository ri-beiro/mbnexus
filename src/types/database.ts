// Hand-authored types mirroring supabase/migrations/*.sql. Regenerate with
// `supabase gen types typescript --local` once a real project is linked, and
// keep this file in sync (or replace it with the generated one directly).

export type RoleKey = "super_admin" | "gerente" | "coordenador" | "lider" | "funcionario";
export type ScopeType = "global" | "management_unit" | "department" | "team";

export type ProjectStatus =
  | "planejamento"
  | "nao_iniciado"
  | "em_andamento"
  | "em_risco"
  | "bloqueado"
  | "concluido"
  | "cancelado";

export type TaskPriority = "baixa" | "normal" | "alta" | "urgente" | "critica";
export type TaskStatus = "backlog" | "a_fazer" | "em_andamento" | "em_revisao" | "bloqueado" | "concluido";
export type DependencyType = "finish_start" | "start_start" | "finish_finish";
export type IdeaStatus =
  | "ideia"
  | "em_analise"
  | "aprovada"
  | "planejada"
  | "em_execucao"
  | "implantada"
  | "resultados";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  organization_id: string;
  full_name: string;
  email: string;
  job_title: string | null;
  avatar_url: string | null;
  is_active: boolean;
  primary_team_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ManagementUnit {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  manager_profile_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  organization_id: string;
  management_unit_id: string;
  name: string;
  description: string | null;
  coordinator_profile_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  organization_id: string;
  department_id: string;
  name: string;
  description: string | null;
  leader_profile_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  profile_id: string;
  is_primary: boolean;
  joined_at: string;
}

export interface Role {
  id: string;
  key: RoleKey;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Permission {
  id: string;
  key: string;
  resource: string;
  action: string;
  description: string | null;
}

export interface RolePermission {
  role_id: string;
  permission_id: string;
}

export interface UserRole {
  id: string;
  profile_id: string;
  role_id: string;
  scope_type: ScopeType;
  scope_id: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  organization_id: string;
  code: string | null;
  name: string;
  description: string | null;
  owner_profile_id: string | null;
  management_unit_id: string | null;
  department_id: string | null;
  team_id: string | null;
  status: ProjectStatus;
  priority: TaskPriority;
  start_date: string | null;
  due_date: string | null;
  progress: number;
  budget: number | null;
  template_of: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectPhase {
  id: string;
  project_id: string;
  name: string;
  position: number;
  start_date: string | null;
  due_date: string | null;
  created_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  profile_id: string;
  role: string;
  added_at: string;
}

export interface Task {
  id: string;
  organization_id: string;
  project_id: string | null;
  phase_id: string | null;
  parent_task_id: string | null;
  team_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  start_date: string | null;
  due_date: string | null;
  estimate_minutes: number | null;
  progress: number;
  recurrence_rule: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TaskAssignee {
  task_id: string;
  profile_id: string;
  assigned_at: string;
}

export interface Notification {
  id: string;
  organization_id: string;
  profile_id: string;
  type: string;
  title: string;
  body: string | null;
  link_url: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Idea {
  id: string;
  organization_id: string;
  author_id: string;
  title: string;
  problem: string | null;
  proposal: string | null;
  expected_benefit: string | null;
  area_department_id: string | null;
  responsible_profile_id: string | null;
  impact: string | null;
  effort: string | null;
  priority: TaskPriority;
  status: IdeaStatus;
  converted_project_id: string | null;
  created_at: string;
  updated_at: string;
}

// Generic row/insert/update helpers keep repositories terse without a full
// codegen'd Database type. Swap for `supabase gen types` output when a real
// project is linked; the shape (Tables<T>) stays the same either way.
export interface Table<Row> {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
}

export interface Database {
  public: {
    Tables: {
      organizations: Table<Organization>;
      profiles: Table<Profile>;
      management_units: Table<ManagementUnit>;
      departments: Table<Department>;
      teams: Table<Team>;
      team_members: Table<TeamMember>;
      roles: Table<Role>;
      permissions: Table<Permission>;
      role_permissions: Table<RolePermission>;
      user_roles: Table<UserRole>;
      projects: Table<Project>;
      project_phases: Table<ProjectPhase>;
      project_members: Table<ProjectMember>;
      tasks: Table<Task>;
      task_assignees: Table<TaskAssignee>;
      notifications: Table<Notification>;
      ideas: Table<Idea>;
    };
  };
}
