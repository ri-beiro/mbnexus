import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FolderKanban, Plus } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import { useProjectsData } from "@/features/projects/useProjectsData";
import { filterProjects, type ProjectFilters } from "@/features/projects/projectLogic";
import { PROJECT_STATUS_BADGE_VARIANT, PROJECT_STATUS_LABELS, PROJECT_STATUS_ORDER } from "@/features/projects/projectLabels";
import { ProjectDetailPanel } from "@/features/projects/ProjectDetailPanel";
import { CreateProjectDialog } from "@/features/projects/CreateProjectDialog";
import { updateProject } from "@/repositories/projectRepository";
import { useToast } from "@/components/ui/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
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
  const [createOpen, setCreateOpen] = useState(false);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projetos</h1>
          <p className="text-sm text-muted-foreground">Todos os projetos que você pode ver, com filtros.</p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Novo projeto
        </Button>
      </div>

      {profile && (
        <CreateProjectDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          organizationId={profile.organization_id}
          createdBy={profile.id}
          onCreated={reload}
        />
      )}

      <div className="neu-surface-sm flex flex-col gap-3 p-4">
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
        <ul className="neu-surface flex flex-col gap-2 p-4">
          {visibleProjects.map((project, index) => {
            const isExpanded = expandedId === project.id;
            return (
              <li
                key={project.id}
                data-project-row
                className="neu-sunken neu-fade-up px-3.5 py-2.5"
                style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : project.id)}
                    className="text-muted-foreground transition-colors hover:text-[var(--neu-lime-solid)]"
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

                  <span className="font-mono text-xs text-muted-foreground">{project.computedProgress}%</span>

                  <Badge variant={PROJECT_STATUS_BADGE_VARIANT[project.status]}>{PROJECT_STATUS_LABELS[project.status]}</Badge>

                  {project.due_date && <span className="font-mono text-xs text-muted-foreground">{project.due_date}</span>}

                  <select
                    aria-label="Status do projeto"
                    value={project.status}
                    onChange={(e) => handleStatusChange(project.id, e.target.value as ProjectStatus)}
                    className="neu-select h-9 rounded-full border-0 bg-black/10 px-3 text-xs outline-none focus-visible:neu-focus dark:bg-white/5"
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
