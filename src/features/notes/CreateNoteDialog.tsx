import { useState } from "react";
import { FileText } from "lucide-react";
import { createNote } from "@/repositories/noteRepository";
import { useToast } from "@/components/ui/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Note } from "@/types/database";

interface CreateNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  ownerProfileId: string;
  notes: Note[];
  onCreated?: (note: Note) => void;
}

export function CreateNoteDialog({
  open,
  onOpenChange,
  organizationId,
  ownerProfileId,
  notes,
  onCreated,
}: CreateNoteDialogProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [parentNoteId, setParentNoteId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function resetForm() {
    setTitle("");
    setParentNoteId("");
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const trimmed = title.trim();
      const created = await createNote({
        organizationId,
        ownerProfileId,
        ...(trimmed ? { title: trimmed } : {}),
        ...(parentNoteId ? { parentNoteId } : {}),
      });

      resetForm();
      onCreated?.(created);
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Não foi possível criar a página",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova página</DialogTitle>
          <DialogDescription>Dê um nome à página e escolha onde ela deve viver.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="cn-title">Título</Label>
            <Input
              id="cn-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Sem título"
              disabled={submitting}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cn-parent">Página pai</Label>
            <select
              id="cn-parent"
              value={parentNoteId}
              onChange={(e) => setParentNoteId(e.target.value)}
              disabled={submitting}
              className="neu-sunken neu-select h-10 w-full border-0 bg-transparent px-3.5 text-sm outline-none focus-visible:neu-focus"
            >
              <option value="">Página raiz</option>
              {notes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            <FileText className="h-4 w-4" /> Criar página
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
