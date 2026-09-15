import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { getProfile } from "@/repositories/profileRepository";
import { getPermissionKeys, getSessionRoles } from "@/repositories/rbacRepository";
import { highestRole, type SessionRole } from "@/permissions/types";
import type { Profile, RoleKey } from "@/types/database";

interface AuthState {
  status: "loading" | "signed_out" | "signed_in";
  session: Session | null;
  profile: Profile | null;
  roles: SessionRole[];
  permissionKeys: Set<string>;
  primaryRole: RoleKey | null;
  hasPermission: (key: string) => boolean;
  hasRole: (key: RoleKey) => boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthState["status"]>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<SessionRole[]>([]);
  const [permissionKeys, setPermissionKeys] = useState<Set<string>>(new Set());

  const loadUserData = useCallback(async (userId: string) => {
    const [profileRow, sessionRoles] = await Promise.all([getProfile(userId), getSessionRoles(userId)]);
    setProfile(profileRow);
    setRoles(sessionRoles);
    setPermissionKeys(await getPermissionKeys(sessionRoles.map((r) => r.roleId)));
  }, []);

  const refresh = useCallback(async () => {
    const {
      data: { session: current },
    } = await supabase.auth.getSession();
    setSession(current);
    if (current) {
      await loadUserData(current.user.id);
      setStatus("signed_in");
    } else {
      setProfile(null);
      setRoles([]);
      setPermissionKeys(new Set());
      setStatus("signed_out");
    }
  }, [loadUserData]);

  useEffect(() => {
    refresh();
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        loadUserData(newSession.user.id).then(() => setStatus("signed_in"));
      } else {
        setProfile(null);
        setRoles([]);
        setPermissionKeys(new Set());
        setStatus("signed_out");
      }
    });
    return () => subscription.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthState>(() => {
    const primaryRole = highestRole(roles);
    return {
      status,
      session,
      profile,
      roles,
      permissionKeys,
      primaryRole,
      hasPermission: (key: string) => permissionKeys.has(key),
      hasRole: (key: RoleKey) => roles.some((r) => r.key === key),
      signInWithPassword,
      signOut,
      refresh,
    };
  }, [status, session, profile, roles, permissionKeys, signInWithPassword, signOut, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
