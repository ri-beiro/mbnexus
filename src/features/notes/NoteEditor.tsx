import { useEffect, useState } from "react";
import { Code2, Heading as HeadingIcon, ListChecks, Plus, Text, Trash2 } from "lucide-react";
import { useAutosave, type AutosaveStatus } from "@/features/notes/useAutosave";
import { useToast } from "@/components/ui/toast-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Note, NoteBlock, NoteBlockType } from "@/types/database";

const STATUS_LABELS: Record<AutosaveStatus, string> = {
  saved: "Salvo",
  saving: "Salvando...",
  unsaved: "Alterações não salvas",
};

interface ChecklistItem {
  text: string;
  checked: boolean;
}

interface NoteEditorProps {
  note: Note;
  blocks: NoteBlock[];
  onSaveTitle: (title: string) => Promise<void>;
  onAddBlock: (type: NoteBlockType) => void;
  onSaveBlockContent: (blockId: string, content: Record<string, unknown>) => Promise<void>;
  onDeleteBlock: (blockId: string) => void;
}

function TextBlock({
  block,
  onSave,
  multiline,
  className,
}: {
  block: NoteBlock;
  onSave: (content: Record<string, unknown>) => Promise<void>;
  multiline: boolean;
  className?: string;
}) {
  const { toast } = useToast();
  const [text, setText] = useState(() => String(block.content.text ?? ""));

  async function persist() {
    try {
      await onSave({ text });
    } catch (err) {
      toast({ title: "Não foi possível salvar", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    }
  }

  const commonProps = {
    value: text,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setText(e.target.value),
    onBlur: persist,
    className: cn("w-full resize-none border-none bg-transparent outline-none", className),
  };

  return multiline ? <textarea {...commonProps} rows={3} /> : <input {...commonProps} />;
}

function ChecklistBlock({
  block,
  onSave,
}: {
  block: NoteBlock;
  onSave: (content: Record<string, unknown>) => Promise<void>;
}) {
  const { toast } = useToast();
  const [items, setItems] = useState<ChecklistItem[]>(() => (block.content.items as ChecklistItem[] | undefined) ?? []);

  async function persist(next: ChecklistItem[]) {
    setItems(next);
    try {
      await onSave({ items: next });
    } catch (err) {
      toast({ title: "Não foi possível salvar", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    }
  }

  function toggle(index: number) {
    persist(items.map((item, i) => (i === index ? { ...item, checked: !item.checked } : item)));
  }

  function updateText(index: number, text: string) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, text } : item)));
  }

  function commitText() {
    persist(items);
  }

  function addItem() {
    persist([...items, { text: "", checked: false }]);
  }

  return (
    <div className="space-y-1">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <input type="checkbox" checked={item.checked} onChange={() => toggle(i)} aria-label={item.text || `Item ${i + 1}`} />
          <input
            value={item.text}
            onChange={(e) => updateText(i, e.target.value)}
            onBlur={commitText}
            className={cn("flex-1 border-none bg-transparent text-sm outline-none", item.checked && "text-muted-foreground line-through")}
          />
        </div>
      ))}
      <Button type="button" size="sm" variant="ghost" onClick={addItem}>
        <Plus className="h-3.5 w-3.5" /> Item
      </Button>
    </div>
  );
}

const ADD_BLOCK_OPTIONS: { type: NoteBlockType; label: string; icon: typeof Text }[] = [
  { type: "paragraph", label: "Parágrafo", icon: Text },
  { type: "heading", label: "Título", icon: HeadingIcon },
  { type: "code", label: "Código", icon: Code2 },
  { type: "checklist", label: "Checklist", icon: ListChecks },
];

export function NoteEditor({ note, blocks, onSaveTitle, onAddBlock, onSaveBlockContent, onDeleteBlock }: NoteEditorProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState(note.title);

  useEffect(() => setTitle(note.title), [note.id, note.title]);

  const { status } = useAutosave(title, onSaveTitle);

  async function handleSaveBlock(blockId: string, content: Record<string, unknown>) {
    try {
      await onSaveBlockContent(blockId, content);
    } catch (err) {
      toast({ title: "Não foi possível salvar o bloco", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 border-none bg-transparent text-2xl font-semibold tracking-tight outline-none"
        />
        <span className="shrink-0 text-xs text-muted-foreground">{STATUS_LABELS[status]}</span>
      </div>

      <div className="space-y-3">
        {blocks.map((block) => (
          <div key={block.id} data-testid={`note-block-${block.id}`} className="group flex items-start gap-2">
            <div className="flex-1">
              {block.type === "paragraph" && (
                <TextBlock block={block} onSave={(c) => handleSaveBlock(block.id, c)} multiline className="text-sm" />
              )}
              {block.type === "heading" && (
                <TextBlock block={block} onSave={(c) => handleSaveBlock(block.id, c)} multiline={false} className="text-lg font-semibold" />
              )}
              {block.type === "code" && (
                <TextBlock block={block} onSave={(c) => handleSaveBlock(block.id, c)} multiline className="rounded bg-muted p-2 font-mono text-sm" />
              )}
              {block.type === "checklist" && <ChecklistBlock block={block} onSave={(c) => handleSaveBlock(block.id, c)} />}
            </div>
            <button
              type="button"
              onClick={() => onDeleteBlock(block.id)}
              aria-label="Remover bloco"
              className="opacity-0 text-muted-foreground hover:text-destructive group-hover:opacity-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <Plus className="h-4 w-4" /> Adicionar bloco
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {ADD_BLOCK_OPTIONS.map((opt) => (
            <DropdownMenuItem key={opt.type} onSelect={() => onAddBlock(opt.type)}>
              <opt.icon className="h-4 w-4" /> {opt.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
