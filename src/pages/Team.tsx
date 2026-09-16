import { useEffect, useMemo, useState } from "react";
import { Users } from "lucide-react";
import { listTasks, type TaskListRow } from "@/repositories/taskRepository";
import { listOrgProfiles } from "@/repositories/profileRepository";
import { listTeamMembers, listTeams } from "@/repositories/hierarchyRepository";
import { computePersonWorkload, type WorkloadLevel } from "@/features/workload/workloadLogic";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import type { Profile, Team as TeamRow, TeamMember } from "@/types/database";

const LEVEL_LABELS: Record<WorkloadLevel, string> = {
  baixa: "Carga baixa",
  normal: "Carga normal",
  elevada: "Carga elevada",
  sobrecarga: "Sobrecarga",
};

const LEVEL_BADGE_VARIANT: Record<WorkloadLevel, "secondary" | "default" | "warning" | "destructive"> = {
  baixa: "secondary",
  normal: "default",
  elevada: "warning",
  sobrecarga: "destructive",
};

export function Team() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [tasks, setTasks] = useState<TaskListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listOrgProfiles(), listTeams(), listTeamMembers(), listTasks()])
      .then(([profileRows, teamRows, memberRows, taskRows]) => {
        if (cancelled) return;
        setProfiles(profileRows);
        setTeams(teamRows);
        setMembers(memberRows);
        setTasks(taskRows);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Não foi possível carregar a equipe.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const rows = members.map((member) => {
    const profile = profiles.find((p) => p.id === member.profile_id);
    const team = teams.find((t) => t.id === member.team_id);
    const memberTasks = tasks.filter((t) => t.assigneeIds.includes(member.profile_id));
    const workload = computePersonWorkload(member.profile_id, memberTasks, today);
    const completedCount = memberTasks.filter((t) => t.status === "concluido").length;
    return { member, profile, team, workload, completedCount };
  });

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }

  if (error) {
    return <EmptyState icon={Users} title="Erro ao carregar" description={error} />;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Minha Equipe</h1>
        <p className="text-sm text-muted-foreground">Tarefas, prazos e carga de trabalho de cada pessoa.</p>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum membro na sua estrutura ainda" />
      ) : (
        <div className="space-y-2">
          {rows.map(({ member, profile, team, workload, completedCount }) => (
            <div key={member.id} data-testid={`team-row-${member.profile_id}`} className="rounded-md border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{profile?.full_name ?? "Usuário"}</p>
                  <p className="text-xs text-muted-foreground">{team?.name ?? "Sem equipe"}</p>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{workload.openTaskCount} abertas</span>
                  <span className={workload.overdueTaskCount > 0 ? "font-medium text-destructive" : undefined}>
                    {workload.overdueTaskCount} atrasadas
                  </span>
                  <span>{completedCount} concluídas</span>
                  <Badge variant={LEVEL_BADGE_VARIANT[workload.level]}>{LEVEL_LABELS[workload.level]}</Badge>
                </div>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${Math.min(workload.percent, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
