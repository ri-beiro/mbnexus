import { useState } from "react";
import { Plus, UserCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileHoverCard } from "@/features/profile/ProfileHoverCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast-provider";
import { RequirePermission } from "@/permissions/RequirePermission";
import { useHierarchyData } from "@/features/hierarchy/useHierarchyData";
import { CreateUserDialog } from "@/features/hierarchy/CreateUserDialog";
import { setProfileActive, transferProfileTeam } from "@/repositories/profileRepository";

export function UsersPanel() {
  const { data, loading, error, reload } = useHierarchyData();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);

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
    <div className="neu-surface flex flex-col gap-2 p-4">
      <RequirePermission permission="user.manage">
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Novo usuário
          </Button>
        </div>
      </RequirePermission>

      {data.profiles.map((p) => (
        <div key={p.id} className="neu-sunken flex flex-wrap items-center gap-3 px-3.5 py-2.5">
          <ProfileHoverCard profile={p}>
            <Avatar className="cursor-default">
              {p.avatar_url && <AvatarImage src={p.avatar_url} alt={p.full_name} />}
              <AvatarFallback>{p.full_name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
          </ProfileHoverCard>
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

      <CreateUserDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        managementUnits={data.managementUnits}
        departments={data.departments}
        onCreated={reload}
      />
    </div>
  );
}
