import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FolderKanban, Plus } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import { useProjectsData } from "@/features/projects/useProjectsData";
import { filterProjects, type ProjectFilters } from "@/features/projects/projectLogic";
import { PROJECT_STATUS_BADGE_VARIANT, PROJECT_STATUS_LABELS, PROJECT_STATUS_ORDER } from "@/features/projects/projectLabels";
import { ProjectDetailPanel } from "@/features/projects/ProjectDetailPanel";
import { createProject, updateProject } from "@/repositories/projectRepository";
import { useToast } from "@/components/ui/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/types/database";

function StatusFilterBar({ active, onToggle }: { active: Set<ProjectStatus>; onToggle: (status: ProjectStatus) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PROJECT_STATUS_ORDER.map((status) => (
        <Button
          key={status}
          type="button"
          size="sm"
          variant={active.has(status) ? "default" : "outline"}
          onClick={() => onToggle(status)}
        >
          {PROJECT_STATUS_LABELS[status]}
        </Button>
      ))}
    </div>
  );
}

export function Projects() {
  const { profile } = useAuth();
  const { projects, profiles, loading, error, reload } = useProjectsData();
  const { toast } = useToast();

  const [statusFilter, setStatusFilter] = useState<Set<ProjectStatus>>(new Set());
  const [search, setSearch] = useState("");
  const [quickName, setQuickName] = useState("");
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filters: ProjectFilters = useMemo(
    () => ({ statuses: Array.from(statusFilter), search: search || undefined }),
    [statusFilter, search],
  );

  const visibleProjects = filterProjects(projects, filters);

  function toggleStatus(status: ProjectStatus) {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  async function handleQuickCreate() {
    const name = quickName.trim();
    if (!name || !profile) return;
    setCreating(true);
    try {
      await createProject({ organizationId: profile.organization_id, name, createdBy: profile.id });
      setQuickName("");
      await reload();
    } catch (err) {
      toast({
        title: "Não foi possível criar o projeto",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  }

  async function handleStatusChange(projectId: string, status: ProjectStatus) {
    try {
      await updateProject(projectId, { status });
      await reload();
    } catch (err) {
      toast({
        title: "Não foi possível atualizar o status",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Projetos</h1>
        <p className="text-sm text-muted-foreground">Todos os projetos que você pode ver, com filtros.</p>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border p-3">
        <div className="flex items-center gap-2">
          <Input
            value={quickName}
            onChange={(e) => setQuickName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleQuickCreate();
            }}
            placeholder="Novo projeto… pressione Enter para criar"
            disabled={creating}
          />
          <Button type="button" onClick={handleQuickCreate} disabled={creating || !quickName.trim()}>
            <Plus className="h-4 w-4" /> Adicionar
          </Button>
        </div>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar projetos…"
          className="max-w-xs"
        />
        <StatusFilterBar active={statusFilter} onToggle={toggleStatus} />
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : error ? (
        <EmptyState icon={FolderKanban} title="Erro ao carregar projetos" description={error} />
      ) : visibleProjects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="Nenhum projeto encontrado"
          description="Crie um projeto acima ou ajuste os filtros."
        />
      ) : (
        <ul className="space-y-1.5">
          {visibleProjects.map((project) => {
            const isExpanded = expandedId === project.id;
            return (
              <li key={project.id} data-project-row className="rounded-md border px-3 py-2">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : project.id)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={isExpanded ? "Recolher projeto" : "Expandir projeto"}
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : project.id)}
                    className="min-w-40 flex-1 text-left"
                  >
                    <p className="text-sm font-medium">{project.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{project.team_name ?? "Sem equipe"}</p>
                  </button>

                  <span className="text-xs text-muted-foreground">{project.computedProgress}%</span>

                  <Badge variant={PROJECT_STATUS_BADGE_VARIANT[project.status]}>{PROJECT_STATUS_LABELS[project.status]}</Badge>

                  {project.due_date && <span className="text-xs text-muted-foreground">{project.due_date}</span>}

                  <select
                    aria-label="Status do projeto"
                    value={project.status}
                    onChange={(e) => handleStatusChange(project.id, e.target.value as ProjectStatus)}
                    className={cn(
                      "h-8 rounded-md border border-input bg-background px-2 text-xs",
                      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    )}
                  >
                    {PROJECT_STATUS_ORDER.map((status) => (
                      <option key={status} value={status}>
                        {PROJECT_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </div>

                {isExpanded && (
                  <div className="mt-3">
                    <ProjectDetailPanel
                      projectId={project.id}
                      profiles={profiles}
                      memberIds={project.memberIds}
                      computedProgress={project.computedProgress}
                      onMembersChange={() => reload()}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
