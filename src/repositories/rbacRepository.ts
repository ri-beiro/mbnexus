import { supabase } from "@/lib/supabase";
import type { SessionRole } from "@/permissions/types";
import type { RoleKey } from "@/types/database";

interface UserRoleRow {
  scope_type: SessionRole["scopeType"];
  scope_id: string | null;
  role_id: string;
  roles: { key: RoleKey } | { key: RoleKey }[] | null;
}

function roleKeyOf(row: UserRoleRow): RoleKey | null {
  if (!row.roles) return null;
  return Array.isArray(row.roles) ? (row.roles[0]?.key ?? null) : row.roles.key;
}

/** Roles held by the current session's user, each with its hierarchical scope. */
export async function getSessionRoles(profileId: string): Promise<SessionRole[]> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("scope_type, scope_id, role_id, roles(key)")
    .eq("profile_id", profileId);
  if (error) throw error;

  return (data ?? [])
    .map((row) => {
      const key = roleKeyOf(row as unknown as UserRoleRow);
      if (!key) return null;
      const r = row as unknown as UserRoleRow;
      return { key, roleId: r.role_id, scopeType: r.scope_type, scopeId: r.scope_id } satisfies SessionRole;
    })
    .filter((r): r is SessionRole => r !== null);
}

/** Flattened set of permission keys granted by any of the given role ids. */
export async function getPermissionKeys(roleIds: string[]): Promise<Set<string>> {
  if (roleIds.length === 0) return new Set();
  const { data, error } = await supabase
    .from("role_permissions")
    .select("permissions(key)")
    .in("role_id", roleIds);
  if (error) throw error;

  const keys = new Set<string>();
  for (const row of (data ?? []) as unknown as { permissions: { key: string } | { key: string }[] | null }[]) {
    const p = row.permissions;
    if (!p) continue;
    if (Array.isArray(p)) p.forEach((x) => keys.add(x.key));
    else keys.add(p.key);
  }
  return keys;
}
