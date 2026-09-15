import { useState, type FormEvent } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type DialogKind = { kind: "management_unit" } | { kind: "department"; managementUnitId: string } | { kind: "team"; departmentId: string } | null;

const TITLES: Record<NonNullable<DialogKind>["kind"], string> = {
  management_unit: "Nova gerência",
  department: "Nova coordenação",
  team: "Nova equipe",
};

export function CreateHierarchyNodeDialog({
  dialog,
  onClose,
  onSubmit,
}: {
  dialog: DialogKind;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    await onSubmit(name.trim());
    setSubmitting(false);
    setName("");
  }

  return (
    <Dialog open={dialog !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {dialog && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{TITLES[dialog.kind]}</DialogTitle>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="node-name">Nome</Label>
              <Input id="node-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                Criar
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
