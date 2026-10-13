// Admin-only Edge Function (docs/architecture.md section 7 pattern): invites
// a new login via Supabase Auth, which triggers handle_new_auth_user (0002)
// to create the profiles row, then wires up the person's CD/Setor placement:
// resolves (or creates) the department's default team, sets job_title from
// the chosen papel, and grants the matching RBAC role —
//   gestor      -> departments.coordinator_profile_id + role 'coordenador' @ department
//   lider       -> teams.leader_profile_id + role 'lider' @ team
//   analista/assistente -> role 'funcionario' @ team (job_title only differs)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createAdminClient, requiredEnv } from "../_shared/supabaseAdmin.ts";

type Papel = "gestor" | "lider" | "analista" | "assistente";

interface RequestBody {
  email?: string;
  fullName?: string;
  managementUnitId?: string;
  departmentId?: string;
  papel?: Papel;
}

const JOB_TITLE_BY_PAPEL: Record<Papel, string> = {
  gestor: "Gestor",
  lider: "Líder",
  analista: "Analista",
  assistente: "Assistente",
};

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonError("Não autenticado.", 401);

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return jsonError("Corpo da requisição inválido.", 400);
  }

  const { email, fullName, managementUnitId, departmentId, papel } = body;
  if (!email || !fullName || !managementUnitId || !departmentId || !papel) {
    return jsonError("email, fullName, managementUnitId, departmentId e papel são obrigatórios.", 400);
  }
  if (!(papel in JOB_TITLE_BY_PAPEL)) return jsonError("papel inválido.", 400);

  // Acts as the caller so hierarchy.manage/user.manage is checked through the
  // same RBAC the rest of the app uses, not re-derived here.
  const userClient = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: canManage, error: permError } = await userClient.rpc("has_permission", {
    permission_key: "user.manage",
  });
  if (permError || !canManage) return jsonError("Sem permissão para convidar usuários.", 403);

  const {
    data: { user: caller },
  } = await userClient.auth.getUser();
  const { data: callerProfile, error: callerError } = await userClient
    .from("profiles")
    .select("organization_id")
    .eq("id", caller?.id ?? "")
    .single();
  if (callerError || !callerProfile) return jsonError("Não foi possível identificar sua organização.", 403);

  const admin = createAdminClient();

  const { data: department, error: deptError } = await admin
    .from("departments")
    .select("id, name, management_unit_id")
    .eq("id", departmentId)
    .single();
  if (deptError || !department || department.management_unit_id !== managementUnitId) {
    return jsonError("Setor não pertence ao CD informado.", 400);
  }

  const { data: existingTeams, error: teamsError } = await admin
    .from("teams")
    .select("id")
    .eq("department_id", departmentId)
    .order("created_at", { ascending: true })
    .limit(1);
  if (teamsError) return jsonError(teamsError.message, 500);

  let teamId: string;
  if (existingTeams && existingTeams.length > 0) {
    teamId = existingTeams[0].id;
  } else {
    const { data: newTeam, error: teamError } = await admin
      .from("teams")
      .insert({ organization_id: callerProfile.organization_id, department_id: departmentId, name: department.name })
      .select("id")
      .single();
    if (teamError || !newTeam) return jsonError(teamError?.message ?? "Não foi possível criar a equipe padrão.", 500);
    teamId = newTeam.id;
  }

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName, organization_id: callerProfile.organization_id },
  });
  if (inviteError || !invited?.user) {
    return jsonError(inviteError?.message ?? "Não foi possível convidar o usuário.", 500);
  }
  const newProfileId = invited.user.id;

  const { error: profileUpdateError } = await admin
    .from("profiles")
    .update({ primary_team_id: teamId, job_title: JOB_TITLE_BY_PAPEL[papel] })
    .eq("id", newProfileId);
  if (profileUpdateError) return jsonError(profileUpdateError.message, 500);

  await admin.from("team_members").insert({ team_id: teamId, profile_id: newProfileId, is_primary: true });

  const { data: roles, error: rolesError } = await admin.from("roles").select("id, key");
  if (rolesError) return jsonError(rolesError.message, 500);
  const roleIdByKey = new Map((roles ?? []).map((r: { id: string; key: string }) => [r.key, r.id]));

  if (papel === "gestor") {
    await admin.from("departments").update({ coordinator_profile_id: newProfileId }).eq("id", departmentId);
    await admin.from("user_roles").insert({
      profile_id: newProfileId,
      role_id: roleIdByKey.get("coordenador"),
      scope_type: "department",
      scope_id: departmentId,
    });
  } else if (papel === "lider") {
    await admin.from("teams").update({ leader_profile_id: newProfileId }).eq("id", teamId);
    await admin.from("user_roles").insert({
      profile_id: newProfileId,
      role_id: roleIdByKey.get("lider"),
      scope_type: "team",
      scope_id: teamId,
    });
  } else {
    await admin.from("user_roles").insert({
      profile_id: newProfileId,
      role_id: roleIdByKey.get("funcionario"),
      scope_type: "team",
      scope_id: teamId,
    });
  }

  return new Response(JSON.stringify({ profileId: newProfileId, teamId }), {
    headers: { "Content-Type": "application/json" },
  });
});
