import { supabase } from "@/lib/supabase";

export type Papel = "gestor" | "lider" | "analista" | "assistente";

export interface InviteUserInput {
  email: string;
  fullName: string;
  managementUnitId: string;
  departmentId: string;
  papel: Papel;
}

export interface InviteUserResult {
  profileId: string;
  teamId: string;
}

/** Calls the invite-user Edge Function, which creates the Auth login and
 * assigns the CD/Setor/papel structural data server-side (needs the
 * service role key, which never reaches the browser). */
export async function inviteUser(input: InviteUserInput): Promise<InviteUserResult> {
  const { data, error } = await supabase.functions.invoke<InviteUserResult>("invite-user", {
    body: input,
  });
  if (error) throw error;
  if (!data) throw new Error("Resposta vazia ao convidar o usuário.");
  return data;
}
