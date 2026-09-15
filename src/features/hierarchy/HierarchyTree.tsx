import { useState } from "react";
import { Building2, Plus, Users2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast-provider";
import { useAuth } from "@/features/auth/useAuth";
import { RequirePermission } from "@/permissions/RequirePermission";
import { useHierarchyData } from "@/features/hierarchy/useHierarchyData";
import { createDepartment, createManagementUnit, createTeam } from "@/repositories/hierarchyRepository";
import { CreateHierarchyNodeDialog } from "@/features/hierarchy/CreateHierarchyNodeDialog";

export function HierarchyTree() {
  const { data, loading, error, reload } = useHierarchyData();
  const { toast } = useToast();
  const { hasPermission } = useAuth();
  const [dialog, setDialog] = useState<
    | { kind: "management_unit" }
    | { kind: "department"; managementUnitId: string }
    | { kind: "team"; departmentId: string }
    | null
  >(null);

  if (loading) return <Skeleton className="h-72" />;
  if (error) return <EmptyState icon={Building2} title="Erro ao carregar" description={error} />;
  if (!data) return null;

  const canManage = hasPermission("hierarchy.manage");

  async function handleCreate(name: string) {
    if (!dialog) return;
    try {
      if (dialog.kind === "management_unit") await createManagementUnit({ name });
      if (dialog.kind === "department") await createDepartment({ name, managementUnitId: dialog.managementUnitId });
      if (dialog.kind === "team") await createTeam({ name, departmentId: dialog.departmentId });
      toast({ title: "Criado com sucesso", variant: "success" });
      setDialog(null);
      reload();
    } catch (err) {
      toast({
        title: "Não foi possível criar",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Empresa → Gerência → Coordenação → Equipe → Funcionários
        </p>
        <RequirePermission permission="hierarchy.manage">
          <Button size="sm" variant="outline" onClick={() => setDialog({ kind: "management_unit" })}>
            <Plus className="h-4 w-4" /> Nova gerência
          </Button>
        </RequirePermission>
      </div>

      {data.managementUnits.length === 0 ? (
        <EmptyState icon={Building2} title="Nenhuma gerência cadastrada" />
      ) : (
        <div className="space-y-3">
          {data.managementUnits.map((mu) => {
            const departments = data.departments.filter((d) => d.management_unit_id === mu.id);
            return (
              <div key={mu.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span className="font-medium">{mu.name}</span>
                    {!mu.is_active && <Badge variant="secondary">Inativa</Badge>}
                  </div>
                  {canManage && (
                    <Button size="sm" variant="ghost" onClick={() => setDialog({ kind: "department", managementUnitId: mu.id })}>
                      <Plus className="h-3.5 w-3.5" /> Coordenação
                    </Button>
                  )}
                </div>

                <div className="ml-6 mt-3 space-y-2 border-l pl-4">
                  {departments.length === 0 && <p className="text-xs text-muted-foreground">Sem coordenações.</p>}
                  {departments.map((dept) => {
                    const teams = data.teams.filter((t) => t.department_id === dept.id);
                    return (
                      <div key={dept.id} className="rounded-md border p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{dept.name}</span>
                          {canManage && (
                            <Button size="sm" variant="ghost" onClick={() => setDialog({ kind: "team", departmentId: dept.id })}>
                              <Plus className="h-3.5 w-3.5" /> Equipe
                            </Button>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {teams.length === 0 && <p className="text-xs text-muted-foreground">Sem equipes.</p>}
                          {teams.map((team) => {
                            const memberCount = data.teamMembers.filter((m) => m.team_id === team.id).length;
                            return (
                              <Badge key={team.id} variant="outline" className="gap-1.5 py-1">
                                <Users2 className="h-3 w-3" /> {team.name} · {memberCount}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateHierarchyNodeDialog dialog={dialog} onClose={() => setDialog(null)} onSubmit={handleCreate} />
    </div>
  );
}
