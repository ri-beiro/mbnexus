import type { RoleKey, ScopeType } from "@/types/database";

export interface SessionRole {
  key: RoleKey;
  roleId: string;
  scopeType: ScopeType;
  scopeId: string | null;
}

// Highest-to-lowest, used to decide the landing page after login (section 45)
// and any UI that needs "the user's most senior role".
export const ROLE_PRIORITY: RoleKey[] = ["super_admin", "gerente", "coordenador", "lider", "funcionario"];

export const ROLE_LABELS: Record<RoleKey, string> = {
  super_admin: "Super Admin",
  gerente: "Gerente",
  coordenador: "Coordenador",
  lider: "Líder de Equipe",
  funcionario: "Funcionário",
};

export function highestRole(roles: SessionRole[]): RoleKey | null {
  for (const key of ROLE_PRIORITY) {
    if (roles.some((r) => r.key === key)) return key;
  }
  return null;
}

export function isManagementRole(role: RoleKey | null): boolean {
  return role === "super_admin" || role === "gerente" || role === "coordenador" || role === "lider";
}
