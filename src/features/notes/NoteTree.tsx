import { FileText, Plus } from "lucide-react";
import { buildNoteTree, type NoteTreeNode } from "@/features/notes/noteLogic";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import type { Note } from "@/types/database";

interface NoteTreeProps {
  notes: Note[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreateRoot: () => void;
  onCreateChild: (parentId: string) => void;
}

function NoteNode({
  node,
  depth,
  selectedId,
  onSelect,
  onCreateChild,
}: {
  node: NoteTreeNode;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreateChild: (parentId: string) => void;
}) {
  return (
    <div data-testid={`note-tree-node-${node.note.id}`}>
      <div
        className={cn(
          "group flex items-center gap-1.5 rounded-full py-1.5 pr-1 text-sm transition-colors hover:bg-primary/10",
          selectedId === node.note.id &&
            "bg-primary/15 font-medium shadow-[3px_3px_6px_var(--neu-d),-2px_-2px_5px_var(--neu-l)]",
        )}
        style={{ paddingLeft: 10 + depth * 14 }}
      >
        <button type="button" onClick={() => onSelect(node.note.id)} className="flex flex-1 items-center gap-1.5 text-left">
          <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">{node.note.title}</span>
        </button>
        <button
          type="button"
          onClick={() => onCreateChild(node.note.id)}
          aria-label="Adicionar subpágina"
          className="opacity-0 text-muted-foreground hover:text-[var(--neu-lime-solid)] group-hover:opacity-100"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      {node.children.map((child) => (
        <NoteNode key={child.note.id} node={child} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} onCreateChild={onCreateChild} />
      ))}
    </div>
  );
}

export function NoteTree({ notes, selectedId, onSelect, onCreateRoot, onCreateChild }: NoteTreeProps) {
  const tree = buildNoteTree(notes);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-semibold uppercase tracking-[.12em] text-[var(--neu-text-label)]">Minhas notas</span>
        <Button type="button" size="sm" variant="ghost" onClick={onCreateRoot}>
          <Plus className="h-3.5 w-3.5" /> Nova página
        </Button>
      </div>

      {tree.length === 0 ? (
        <EmptyState icon={FileText} title="Nenhuma nota ainda" description="Crie sua primeira página acima." />
      ) : (
        <div>
          {tree.map((node) => (
            <NoteNode key={node.note.id} node={node} depth={0} selectedId={selectedId} onSelect={onSelect} onCreateChild={onCreateChild} />
          ))}
        </div>
      )}
    </div>
  );
}
