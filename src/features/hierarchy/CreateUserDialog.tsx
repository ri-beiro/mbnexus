import { useState, type FormEvent } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { inviteUser, type Papel } from "@/repositories/userAdminRepository";
import type { Department, ManagementUnit } from "@/types/database";

const PAPEL_OPTIONS: { value: Papel; label: string }[] = [
  { value: "gestor", label: "Gestor do setor" },
  { value: "lider", label: "Líder de equipe" },
  { value: "analista", label: "Analista" },
  { value: "assistente", label: "Assistente" },
];

interface CreateUserDialogProps {
  open: boolean;
  onClose: () => void;
  managementUnits: ManagementUnit[];
  departments: Department[];
  onCreated: () => void;
}

export function CreateUserDialog({ open, onClose, managementUnits, departments, onCreated }: CreateUserDialogProps) {
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [managementUnitId, setManagementUnitId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [papel, setPapel] = useState<Papel | "">("");
  const [submitting, setSubmitting] = useState(false);

  const departmentsForUnit = departments.filter((d) => d.management_unit_id === managementUnitId);

  function reset() {
    setFullName("");
    setEmail("");
    setManagementUnitId("");
    setDepartmentId("");
    setPapel("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !managementUnitId || !departmentId || !papel) return;
    setSubmitting(true);
    try {
      await inviteUser({
        fullName: fullName.trim(),
        email: email.trim(),
        managementUnitId,
        departmentId,
        papel,
      });
      toast({ title: "Convite enviado", description: `${fullName.trim()} vai receber um e-mail para criar a senha.`, variant: "success" });
      reset();
      onCreated();
      onClose();
    } catch (err) {
      toast({
        title: "Não foi possível convidar o usuário",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Novo usuário</DialogTitle>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="new-user-name">Nome completo</Label>
            <Input id="new-user-name" autoFocus value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-user-email">E-mail</Label>
            <Input id="new-user-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-user-cd">CD</Label>
              <select
                id="new-user-cd"
                value={managementUnitId}
                onChange={(e) => {
                  setManagementUnitId(e.target.value);
                  setDepartmentId("");
                }}
                required
                className="neu-divider neu-select h-9 w-full rounded-full border bg-transparent px-3 text-sm outline-none focus-visible:neu-focus"
              >
                <option value="" disabled>
                  Selecione o CD
                </option>
                {managementUnits.map((mu) => (
                  <option key={mu.id} value={mu.id}>
                    {mu.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-user-setor">Setor</Label>
              <select
                id="new-user-setor"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                disabled={!managementUnitId}
                required
                className="neu-divider neu-select h-9 w-full rounded-full border bg-transparent px-3 text-sm outline-none focus-visible:neu-focus disabled:opacity-50"
              >
                <option value="" disabled>
                  Selecione o setor
                </option>
                {departmentsForUnit.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-user-papel">Papel no setor</Label>
            <select
              id="new-user-papel"
              value={papel}
              onChange={(e) => setPapel(e.target.value as Papel)}
              required
              className="neu-divider neu-select h-9 w-full rounded-full border bg-transparent px-3 text-sm outline-none focus-visible:neu-focus"
            >
              <option value="" disabled>
                Selecione o papel
              </option>
              {PAPEL_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || !fullName.trim() || !email.trim() || !managementUnitId || !departmentId || !papel}>
              Convidar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
