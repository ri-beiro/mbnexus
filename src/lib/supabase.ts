import { createClient } from "@supabase/supabase-js";

// A hand-authored Database generic (src/types/database.ts) doesn't satisfy
// supabase-js's structural constraints for query builder generics closely
// enough to be worth fighting; repositories instead type their own
// inputs/outputs against those domain types at the call boundary. Swap this
// for `createClient<Database>(...)` once `supabase gen types` output is
// wired in (see docs/architecture.md section 9).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY ausentes. Copie .env.example para .env e configure seu projeto Supabase.",
  );
}

export const supabase = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
