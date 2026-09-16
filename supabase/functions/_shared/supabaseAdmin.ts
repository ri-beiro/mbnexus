import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Service-role client for Edge Functions. Bypasses RLS on purpose — these
 * functions run on a schedule (pg_cron / Supabase scheduled triggers), not
 * on behalf of a signed-in user, and process every organization in one pass.
 */
export function createAdminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY não configurados nas secrets da função.");
  }
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
}

export function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  return value;
}
