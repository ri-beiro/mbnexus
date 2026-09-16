import { useEffect, useMemo, useState } from "react";
import { BarChart3, Download } from "lucide-react";
import { listTasks, type TaskListRow } from "@/repositories/taskRepository";
import { listOrgProfiles } from "@/repositories/profileRepository";
import { listTeamMembers } from "@/repositories/hierarchyRepository";
import { computePersonReport, toCsv } from "@/features/reports/reportLogic";
import { downloadTextFile } from "@/lib/download";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import type { Profile, TeamMember } from "@/types/database";

const CSV_COLUMNS = [
  { key: "name", label: "Nome" },
  { key: "total", label: "Total de tarefas" },
  { key: "completed", label: "Concluídas" },
  { key: "overdue", label: "Atrasadas" },
  { key: "completionRate", label: "Taxa de conclusão (%)" },
  { key: "onTimeRate", label: "Cumprimento de prazo (%)" },
];

export function Reports() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [tasks, setTasks] = useState<TaskListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listOrgProfiles(), listTeamMembers(), listTasks()])
      .then(([profileRows, memberRows, taskRows]) => {
        if (cancelled) return;
        setProfiles(profileRows);
        setMembers(memberRows);
        setTasks(taskRows);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Não foi possível carregar o relatório.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const rows = useMemo(
    () =>
      members.map((member) => {
        const profile = profiles.find((p) => p.id === member.profile_id);
        const memberTasks = tasks.filter((t) => t.assigneeIds.includes(member.profile_id));
        const report = computePersonReport(member.profile_id, memberTasks, today);
        return { profile, report };
      }),
    [members, profiles, tasks, today],
  );

  function handleExport() {
    const csvRows = rows.map(({ profile, report }) => ({
      name: profile?.full_name ?? "Usuário",
      total: report.totalTasks,
      completed: report.completedTasks,
      overdue: report.overdueTasks,
      completionRate: report.completionRatePercent,
      onTimeRate: report.onTimeRatePercent ?? "",
    }));
    const csv = toCsv(csvRows, CSV_COLUMNS);
    downloadTextFile(`relatorio-produtividade-${today}.csv`, csv);
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    );
  }

  if (error) {
    return <EmptyState icon={BarChart3} title="Erro ao carregar" description={error} />;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Relatórios</h1>
          <p className="text-sm text-muted-foreground">Produtividade, prazos e cumprimento de tarefas.</p>
        </div>
        <Button type="button" variant="outline" onClick={handleExport} disabled={rows.length === 0}>
          <Download className="h-4 w-4" /> Exportar CSV
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={BarChart3} title="Nenhum dado disponível" description="Sem membros de equipe visíveis para gerar o relatório." />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Nome</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">Concluídas</th>
                <th className="px-3 py-2">Atrasadas</th>
                <th className="px-3 py-2">Taxa de conclusão</th>
                <th className="px-3 py-2">Cumprimento de prazo</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ profile, report }) => (
                <tr key={report.profileId} data-testid={`report-row-${report.profileId}`} className="border-t">
                  <td className="px-3 py-2 font-medium">{profile?.full_name ?? "Usuário"}</td>
                  <td className="px-3 py-2">{report.totalTasks}</td>
                  <td className="px-3 py-2">{report.completedTasks}</td>
                  <td className="px-3 py-2">{report.overdueTasks}</td>
                  <td className="px-3 py-2">{report.completionRatePercent}%</td>
                  <td className="px-3 py-2">{report.onTimeRatePercent === null ? "—" : `${report.onTimeRatePercent}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
