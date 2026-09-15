import { useEffect, useState } from "react";
import { MessageSquare, Plus, Send, X } from "lucide-react";
import {
  addTaskAssignee,
  addTaskComment,
  createSubtask,
  listSubtasks,
  listTaskComments,
  removeTaskAssignee,
} from "@/repositories/taskRepository";
import { STATUS_LABELS } from "@/features/tasks/taskLabels";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast-provider";
import type { Profile, Task, TaskComment } from "@/types/database";

interface TaskDetailPanelProps {
  taskId: string;
  organizationId: string;
  currentProfileId: string;
  profiles: Profile[];
  assigneeIds: string[];
  onAssigneesChange?: (assigneeIds: string[]) => void;
}

function profileName(profiles: Profile[], id: string): string {
  return profiles.find((p) => p.id === id)?.full_name ?? "Usuário";
}

export function TaskDetailPanel({
  taskId,
  organizationId,
  currentProfileId,
  profiles,
  assigneeIds,
  onAssigneesChange,
}: TaskDetailPanelProps) {
  const { toast } = useToast();
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [assignees, setAssignees] = useState<string[]>(assigneeIds);
  const [loading, setLoading] = useState(true);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newComment, setNewComment] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setAssignees(assigneeIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([listSubtasks(taskId), listTaskComments(taskId)])
      .then(([subtaskRows, commentRows]) => {
        if (cancelled) return;
        setSubtasks(subtaskRows);
        setComments(commentRows);
      })
      .catch((err) => {
        if (cancelled) return;
        toast({
          title: "Não foi possível carregar os detalhes da tarefa",
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
  }, [taskId]);

  async function handleAddSubtask() {
    const title = newSubtaskTitle.trim();
    if (!title) return;
    setBusy(true);
    try {
      const created = await createSubtask({
        parentTaskId: taskId,
        organizationId,
        title,
        createdBy: currentProfileId,
      });
      setSubtasks((prev) => [...prev, created]);
      setNewSubtaskTitle("");
    } catch (err) {
      toast({
        title: "Não foi possível criar a subtarefa",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleAddAssignee(profileId: string) {
    if (!profileId || assignees.includes(profileId)) return;
    setBusy(true);
    try {
      await addTaskAssignee(taskId, profileId);
      const next = [...assignees, profileId];
      setAssignees(next);
      onAssigneesChange?.(next);
    } catch (err) {
      toast({
        title: "Não foi possível adicionar o responsável",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveAssignee(profileId: string) {
    setBusy(true);
    try {
      await removeTaskAssignee(taskId, profileId);
      const next = assignees.filter((id) => id !== profileId);
      setAssignees(next);
      onAssigneesChange?.(next);
    } catch (err) {
      toast({
        title: "Não foi possível remover o responsável",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleAddComment() {
    const body = newComment.trim();
    if (!body) return;
    setBusy(true);
    try {
      const created = await addTaskComment(taskId, currentProfileId, body);
      setComments((prev) => [...prev, created]);
      setNewComment("");
    } catch (err) {
      toast({
        title: "Não foi possível adicionar o comentário",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-2 border-t pt-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-16" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 border-t pt-3 md:grid-cols-2">
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase text-muted-foreground">Responsáveis</h4>
        <div className="flex flex-wrap gap-2">
          {assignees.length === 0 && <p className="text-xs text-muted-foreground">Nenhum responsável atribuído.</p>}
          {assignees.map((id) => (
            <div key={id} className="flex items-center gap-1.5 rounded-full border py-0.5 pl-0.5 pr-1.5 text-xs">
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[10px]">{profileName(profiles, id).slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              {profileName(profiles, id)}
              <button
                type="button"
                onClick={() => handleRemoveAssignee(id)}
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
          aria-label="Adicionar responsável"
          value=""
          disabled={busy}
          onChange={(e) => handleAddAssignee(e.target.value)}
          className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
        >
          <option value="" disabled>
            Adicionar responsável…
          </option>
          {profiles
            .filter((p) => !assignees.includes(p.id))
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
        </select>

        <h4 className="mt-4 text-xs font-semibold uppercase text-muted-foreground">Subtarefas</h4>
        {subtasks.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma subtarefa ainda.</p>}
        <ul className="space-y-1">
          {subtasks.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-sm">
              <span>{s.title}</span>
              <Badge variant="secondary">{STATUS_LABELS[s.status]}</Badge>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <Input
            value={newSubtaskTitle}
            onChange={(e) => setNewSubtaskTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddSubtask();
            }}
            placeholder="Nova subtarefa…"
            disabled={busy}
          />
          <Button type="button" size="icon" variant="outline" onClick={handleAddSubtask} disabled={busy || !newSubtaskTitle.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
          <MessageSquare className="h-3.5 w-3.5" /> Comentários
        </h4>
        {comments.length === 0 && <p className="text-xs text-muted-foreground">Nenhum comentário ainda.</p>}
        <ul className="space-y-2">
          {comments.map((c) => (
            <li key={c.id} className="rounded-md border px-2.5 py-2 text-sm">
              <p className="text-xs font-medium text-muted-foreground">{profileName(profiles, c.author_id)}</p>
              <p>{c.body}</p>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Adicionar comentário…"
            disabled={busy}
          />
          <Button type="button" size="icon" variant="outline" onClick={handleAddComment} disabled={busy || !newComment.trim()}>
            <Send className="h-4 w-4" />
            <span className="sr-only">Comentar</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
