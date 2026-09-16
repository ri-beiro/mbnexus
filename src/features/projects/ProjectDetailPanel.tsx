import { useEffect, useState } from "react";
import { ListChecks, Plus, X } from "lucide-react";
import {
  addProjectMember,
  createProjectPhase,
  listProjectPhases,
  removeProjectMember,
} from "@/repositories/projectRepository";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast-provider";
import type { Profile, ProjectPhase } from "@/types/database";

interface ProjectDetailPanelProps {
  projectId: string;
  profiles: Profile[];
  memberIds: string[];
  computedProgress: number;
  onMembersChange?: (memberIds: string[]) => void;
}

function profileName(profiles: Profile[], id: string): string {
  return profiles.find((p) => p.id === id)?.full_name ?? "Usuário";
}

export function ProjectDetailPanel({
  projectId,
  profiles,
  memberIds,
  computedProgress,
  onMembersChange,
}: ProjectDetailPanelProps) {
  const { toast } = useToast();
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [members, setMembers] = useState<string[]>(memberIds);
  const [loading, setLoading] = useState(true);
  const [newPhaseName, setNewPhaseName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMembers(memberIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listProjectPhases(projectId)
      .then((rows) => {
        if (!cancelled) setPhases(rows);
      })
      .catch((err) => {
        if (cancelled) return;
        toast({
          title: "Não foi possível carregar as fases do projeto",
          description: err instanceof Error ? err.message : undefined,
          variant: "destructive",
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function handleAddPhase() {
    const name = newPhaseName.trim();
    if (!name) return;
    setBusy(true);
    try {
      const created = await createProjectPhase(projectId, name);
      setPhases((prev) => [...prev, created]);
      setNewPhaseName("");
    } catch (err) {
      toast({
        title: "Não foi possível criar a fase",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleAddMember(profileId: string) {
    if (!profileId || members.includes(profileId)) return;
    setBusy(true);
    try {
      await addProjectMember(projectId, profileId);
      const next = [...members, profileId];
      setMembers(next);
      onMembersChange?.(next);
    } catch (err) {
      toast({
        title: "Não foi possível adicionar o membro",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveMember(profileId: string) {
    setBusy(true);
    try {
      await removeProjectMember(projectId, profileId);
      const next = members.filter((id) => id !== profileId);
      setMembers(next);
      onMembersChange?.(next);
    } catch (err) {
      toast({
        title: "Não foi possível remover o membro",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4 border-t pt-3 md:grid-cols-2">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase text-muted-foreground">Progresso</h4>
          <span className="text-xs font-medium">{computedProgress}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${computedProgress}%` }} />
        </div>

        <h4 className="mt-4 flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
          <ListChecks className="h-3.5 w-3.5" /> Fases
        </h4>
        {loading ? (
          <Skeleton className="h-16" />
        ) : (
          <>
            {phases.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma fase ainda.</p>}
            <ul className="space-y-1">
              {phases.map((phase) => (
                <li key={phase.id} className="rounded-md border px-2 py-1.5 text-sm">
                  {phase.name}
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Input
                value={newPhaseName}
                onChange={(e) => setNewPhaseName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddPhase();
                }}
                placeholder="Nova fase…"
                disabled={busy}
              />
              <Button type="button" size="icon" variant="outline" onClick={handleAddPhase} disabled={busy || !newPhaseName.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase text-muted-foreground">Membros</h4>
        <div className="flex flex-wrap gap-2">
          {members.length === 0 && <p className="text-xs text-muted-foreground">Nenhum membro ainda.</p>}
          {members.map((id) => (
            <div key={id} className="flex items-center gap-1.5 rounded-full border py-0.5 pl-0.5 pr-1.5 text-xs">
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[10px]">{profileName(profiles, id).slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              {profileName(profiles, id)}
              <button
                type="button"
                onClick={() => handleRemoveMember(id)}
                aria-label={`Remover ${profileName(profiles, id)}`}
                disabled={busy}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
        <select
          aria-label="Adicionar membro"
          value=""
          disabled={busy}
          onChange={(e) => handleAddMember(e.target.value)}
          className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
        >
          <option value="" disabled>
            Adicionar membro…
          </option>
          {profiles
            .filter((p) => !members.includes(p.id))
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
        </select>
      </div>
    </div>
  );
}
