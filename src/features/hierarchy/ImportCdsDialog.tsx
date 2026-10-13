import { useState, type ChangeEvent } from "react";
import { read, utils } from "xlsx";
import { Upload } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { extractCdNames } from "@/features/hierarchy/cdImport";
import { bulkCreateManagementUnits } from "@/repositories/hierarchyRepository";

interface ImportCdsDialogProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

export function ImportCdsDialog({ open, onClose, onImported }: ImportCdsDialogProps) {
  const { toast } = useToast();
  const [names, setNames] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setNames([]);
    setFileName(null);
    setParseError(null);
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setFileName(file.name);
    setParseError(null);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = read(buffer, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = utils.sheet_to_json<Record<string, unknown>>(firstSheet);
      const extracted = extractCdNames(rows);
      if (extracted.length === 0) {
        setParseError("Nenhum nome de CD encontrado no arquivo.");
        setNames([]);
      } else {
        setNames(extracted);
      }
    } catch {
      setParseError("Não foi possível ler esse arquivo. Confira se é um .csv ou .xlsx válido.");
      setNames([]);
    }
  }

  async function handleImport() {
    if (names.length === 0) return;
    setSubmitting(true);
    try {
      await bulkCreateManagementUnits(names);
      toast({ title: `${names.length} CD(s) importado(s) com sucesso`, variant: "success" });
      reset();
      onImported();
      onClose();
    } catch (err) {
      toast({
        title: "Não foi possível importar os CDs",
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
        <DialogHeader>
          <DialogTitle>Importar CDs</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Envie uma planilha .csv ou .xlsx com uma coluna de nome (ex.: "Nome" ou "CD") — uma linha por centro de
            distribuição.
          </p>
          <label
            htmlFor="cd-import-file"
            className="neu-sunken flex cursor-pointer items-center justify-center gap-2 py-6 text-sm text-muted-foreground hover:text-[var(--neu-lime-solid)]"
          >
            <Upload className="h-4 w-4" /> {fileName ?? "Escolher arquivo…"}
          </label>
          <input
            id="cd-import-file"
            type="file"
            accept=".csv,.xlsx,.xls"
            className="sr-only"
            aria-label="Selecionar planilha de CDs"
            onChange={handleFileChange}
          />

          {parseError && <p className="text-sm text-destructive">{parseError}</p>}

          {names.length > 0 && (
            <div className="neu-sunken max-h-40 space-y-1 overflow-y-auto p-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-[.1em] text-[var(--neu-text-label)]">
                {names.length} CD(s) encontrado(s)
              </p>
              <ul className="space-y-0.5">
                {names.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleImport} disabled={names.length === 0 || submitting}>
            Importar {names.length > 0 ? `(${names.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
