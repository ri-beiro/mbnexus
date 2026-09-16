import { useEffect, useState } from "react";
import { ArrowRight, Lightbulb, Rocket } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import { IDEA_STATUS_LABELS, IDEA_STATUS_ORDER, nextIdeaStatus } from "@/features/ideas/ideaLogic";
import { convertIdeaToProject, createIdea, listIdeas, updateIdea } from "@/repositories/ideaRepository";
import { useToast } from "@/components/ui/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import type { Idea } from "@/types/database";

const APPROVED_INDEX = IDEA_STATUS_ORDER.indexOf("aprovada");

export function Ideas() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quickTitle, setQuickTitle] = useState("");
  const [creating, setCreating] = useState(false);

  async function reload() {
    try {
      setIdeas(await listIdeas());
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível carregar as ideias.";
      setError(message);
      toast({ title: "Não foi possível carregar as ideias", description: message, variant: "destructive" });
    }
  }

  useEffect(() => {
    setLoading(true);
    reload().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate() {
    const title = quickTitle.trim();
    if (!title || !profile) return;
    setCreating(true);
    try {
      await createIdea({ organizationId: profile.organization_id, authorId: profile.id, title });
      setQuickTitle("");
      await reload();
    } catch (err) {
      toast({ title: "Não foi possível registrar a ideia", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  }

  async function handleAdvance(idea: Idea) {
    const next = nextIdeaStatus(idea.status);
    if (!next) return;
    try {
      await updateIdea(idea.id, { status: next });
      await reload();
    } catch (err) {
      toast({ title: "Não foi possível avançar a etapa", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    }
  }

  async function handleConvert(idea: Idea) {
    if (!profile) return;
    try {
      await convertIdeaToProject(idea, profile.id);
      toast({ title: "Ideia transformada em projeto", variant: "success" });
      await reload();
    } catch (err) {
      toast({ title: "Não foi possível transformar em projeto", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    }
  }

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
    return <EmptyState icon={Lightbulb} title="Erro ao carregar" description={error} />;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Central de Ideias</h1>
        <p className="text-sm text-muted-foreground">Registre, acompanhe e transforme ideias em projetos.</p>
      </div>

      <div className="flex items-center gap-2 rounded-lg border p-3">
        <Input
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
          }}
          placeholder="Título da ideia…"
          disabled={creating}
        />
        <Button type="button" onClick={handleCreate} disabled={creating || !quickTitle.trim()}>
          <Lightbulb className="h-4 w-4" /> Registrar ideia
        </Button>
      </div>

      {ideas.length === 0 ? (
        <EmptyState icon={Lightbulb} title="Nenhuma ideia registrada ainda" description="Registre a primeira ideia acima." />
      ) : (
        <ul className="space-y-1.5">
          {ideas.map((idea) => {
            const next = nextIdeaStatus(idea.status);
            const canConvert = idea.converted_project_id === null && IDEA_STATUS_ORDER.indexOf(idea.status) >= APPROVED_INDEX;
            return (
              <li key={idea.id} data-testid={`idea-row-${idea.id}`} className="flex flex-wrap items-center gap-3 rounded-md border px-3 py-2">
                <div className="min-w-40 flex-1">
                  <p className="text-sm font-medium">{idea.title}</p>
                  {idea.problem && <p className="truncate text-xs text-muted-foreground">{idea.problem}</p>}
                </div>
                <Badge variant="secondary">{IDEA_STATUS_LABELS[idea.status]}</Badge>
                {next && (
                  <Button type="button" size="sm" variant="outline" onClick={() => handleAdvance(idea)}>
                    <ArrowRight className="h-3.5 w-3.5" /> Avançar etapa
                  </Button>
                )}
                {canConvert && (
                  <Button type="button" size="sm" onClick={() => handleConvert(idea)}>
                    <Rocket className="h-3.5 w-3.5" /> Transformar em projeto
                  </Button>
                )}
                {idea.converted_project_id && <Badge variant="success">Virou projeto</Badge>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
