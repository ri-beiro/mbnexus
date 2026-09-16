import { useCallback, useEffect, useState } from "react";
import { StickyNote } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import { NoteTree } from "@/features/notes/NoteTree";
import { NoteEditor } from "@/features/notes/NoteEditor";
import { useToast } from "@/components/ui/toast-provider";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  createBlock,
  createNote,
  deleteBlock,
  listBlocks,
  listNotes,
  updateBlock,
  updateNote,
} from "@/repositories/noteRepository";
import type { Note, NoteBlock, NoteBlockType } from "@/types/database";

const DEFAULT_BLOCK_CONTENT: Record<NoteBlockType, Record<string, unknown>> = {
  paragraph: { text: "" },
  heading: { text: "" },
  bulleted_list: { items: [] },
  numbered_list: { items: [] },
  checklist: { items: [] },
  table: { rows: [] },
  code: { text: "" },
  image: { url: "" },
  link: { url: "" },
  attachment: { url: "" },
};

export function Notes() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [blocks, setBlocks] = useState<NoteBlock[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reloadNotes = useCallback(async () => {
    try {
      setNotes(await listNotes());
    } catch (err) {
      toast({ title: "Não foi possível carregar as notas", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => {
    setLoading(true);
    reloadNotes().finally(() => setLoading(false));
  }, [reloadNotes]);

  useEffect(() => {
    if (!selectedId) {
      setBlocks([]);
      return;
    }
    listBlocks(selectedId)
      .then(setBlocks)
      .catch((err) =>
        toast({ title: "Não foi possível carregar a página", description: err instanceof Error ? err.message : undefined, variant: "destructive" }),
      );
  }, [selectedId, toast]);

  async function handleCreateRoot() {
    if (!profile) return;
    try {
      const created = await createNote({ organizationId: profile.organization_id, ownerProfileId: profile.id });
      await reloadNotes();
      setSelectedId(created.id);
    } catch (err) {
      toast({ title: "Não foi possível criar a página", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    }
  }

  async function handleCreateChild(parentId: string) {
    if (!profile) return;
    try {
      const created = await createNote({ organizationId: profile.organization_id, ownerProfileId: profile.id, parentNoteId: parentId });
      await reloadNotes();
      setSelectedId(created.id);
    } catch (err) {
      toast({ title: "Não foi possível criar a subpágina", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    }
  }

  async function handleSaveTitle(title: string) {
    if (!selectedId) return;
    await updateNote(selectedId, { title });
    setNotes((prev) => prev.map((n) => (n.id === selectedId ? { ...n, title } : n)));
  }

  async function handleAddBlock(type: NoteBlockType) {
    if (!selectedId) return;
    try {
      const created = await createBlock(selectedId, type, DEFAULT_BLOCK_CONTENT[type], blocks.length);
      setBlocks((prev) => [...prev, created]);
    } catch (err) {
      toast({ title: "Não foi possível adicionar o bloco", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    }
  }

  async function handleSaveBlockContent(blockId: string, content: Record<string, unknown>) {
    await updateBlock(blockId, { content });
  }

  async function handleDeleteBlock(blockId: string) {
    try {
      await deleteBlock(blockId);
      setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    } catch (err) {
      toast({ title: "Não foi possível remover o bloco", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    }
  }

  const selectedNote = notes.find((n) => n.id === selectedId) ?? null;

  return (
    <div className="grid grid-cols-[240px_1fr] gap-6">
      <div className="border-r pr-4">
        {loading ? <Skeleton className="h-48" /> : (
          <NoteTree notes={notes} selectedId={selectedId} onSelect={setSelectedId} onCreateRoot={handleCreateRoot} onCreateChild={handleCreateChild} />
        )}
      </div>

      <div>
        {selectedNote ? (
          <NoteEditor
            key={selectedNote.id}
            note={selectedNote}
            blocks={blocks}
            onSaveTitle={handleSaveTitle}
            onAddBlock={handleAddBlock}
            onSaveBlockContent={handleSaveBlockContent}
            onDeleteBlock={handleDeleteBlock}
          />
        ) : (
          <EmptyState icon={StickyNote} title="Selecione ou crie uma página" description="Use o menu à esquerda para começar." className="mt-10" />
        )}
      </div>
    </div>
  );
}
