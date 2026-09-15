import { supabase } from "@/lib/supabase";
import type { Department, ManagementUnit, Team, TeamMember } from "@/types/database";

export async function listManagementUnits(): Promise<ManagementUnit[]> {
  const { data, error } = await supabase.from("management_units").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function listDepartments(): Promise<Department[]> {
  const { data, error } = await supabase.from("departments").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function listTeams(): Promise<Team[]> {
  const { data, error } = await supabase.from("teams").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function listTeamMembers(): Promise<TeamMember[]> {
  const { data, error } = await supabase.from("team_members").select("*");
  if (error) throw error;
  return data ?? [];
}

export async function createManagementUnit(input: { name: string; description?: string | null }): Promise<void> {
  const { data: profile } = await supabase.auth.getUser();
  const orgId = await currentOrganizationId();
  const { error } = await supabase.from("management_units").insert({
    organization_id: orgId,
    name: input.name,
    description: input.description ?? null,
  });
  if (error) throw error;
  void profile;
}

export async function createDepartment(input: {
  name: string;
  managementUnitId: string;
  description?: string | null;
}): Promise<void> {
  const orgId = await currentOrganizationId();
  const { error } = await supabase.from("departments").insert({
    organization_id: orgId,
    management_unit_id: input.managementUnitId,
    name: input.name,
    description: input.description ?? null,
  });
  if (error) throw error;
}

export async function createTeam(input: { name: string; departmentId: string; description?: string | null }): Promise<void> {
  const orgId = await currentOrganizationId();
  const { error } = await supabase.from("teams").insert({
    organization_id: orgId,
    department_id: input.departmentId,
    name: input.name,
    description: input.description ?? null,
  });
  if (error) throw error;
}

export async function setManagementUnitActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from("management_units").update({ is_active: isActive }).eq("id", id);
  if (error) throw error;
}

export async function setDepartmentActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from("departments").update({ is_active: isActive }).eq("id", id);
  if (error) throw error;
}

export async function setTeamActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from("teams").update({ is_active: isActive }).eq("id", id);
  if (error) throw error;
}

async function currentOrganizationId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão inválida.");
  const { data, error } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single();
  if (error) throw error;
  return data.organization_id;
}
