import type { ReactNode } from "react";
import { useAuth } from "@/features/auth/useAuth";
import type { RoleKey } from "@/types/database";

interface RequirePermissionProps {
  permission?: string;
  role?: RoleKey;
  fallback?: ReactNode;
  children: ReactNode;
}

/** Client-side gate for rendering only — the real decision is server-side RLS (docs/architecture.md section 4/6). */
export function RequirePermission({ permission, role, fallback = null, children }: RequirePermissionProps) {
  const { hasPermission, hasRole } = useAuth();
  const allowed = (permission ? hasPermission(permission) : true) && (role ? hasRole(role) : true);
  return allowed ? <>{children}</> : <>{fallback}</>;
}
