import { UserCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast-provider";
import { RequirePermission } from "@/permissions/RequirePermission";
import { useHierarchyData } from "@/features/hierarchy/useHierarchyData";
import { setProfileActive, transferProfileTeam } from "@/repositories/profileRepository";

export function UsersPanel() {
  const { data, loading, error, reload } = useHierarchyData();
  const { toast } = useToast();

  if (loading) return <Skeleton className="h-72" />;
  if (error) return <EmptyState icon={UserCog} title="Erro ao carregar" description={error} />;
  if (!data) return null;

  async function handleToggleActive(id: string, next: boolean) {
    try {
      await setProfileActive(id, next);
      toast({ title: next ? "Usuário ativado" : "Usuário desativado", variant: "success" });
      reload();
    } catch (err) {
      toast({ title: "Falha ao atualizar", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    }
  }

  async function handleTransfer(id: string, teamId: string) {
    try {
      await transferProfileTeam(id, teamId === "none" ? null : teamId);
      toast({ title: "Equipe atualizada", variant: "success" });
      reload();
    } catch (err) {
      toast({ title: "Falha ao transferir", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    }
  }

  return (
    <div className="space-y-2">
      {data.profiles.map((p) => (
        <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-md border px-3 py-2">
          <Avatar>
            <AvatarFallback>{p.full_name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-40 flex-1">
            <p className="text-sm font-medium">{p.full_name}</p>
            <p className="text-xs text-muted-foreground">{p.job_title ?? p.email}</p>
          </div>

          <RequirePermission
            permission="user.manage"
            fallback={<Badge variant={p.is_active ? "success" : "secondary"}>{p.is_active ? "Ativo" : "Inativo"}</Badge>}
          >
            <Select value={p.primary_team_id ?? "none"} onValueChange={(v) => handleTransfer(p.id, v)}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Sem equipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem equipe</SelectItem>
                {data.teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button size="sm" variant={p.is_active ? "outline" : "secondary"} onClick={() => handleToggleActive(p.id, !p.is_active)}>
              {p.is_active ? "Desativar" : "Ativar"}
            </Button>
          </RequirePermission>
        </div>
      ))}
    </div>
  );
}
