import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { PRIMARY_NAV, MANAGEMENT_NAV, SETTINGS_NAV } from "@/app/nav-config";

export function useCommandPalette() {
  const [isOpen, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return { isOpen, open: () => setOpen(true), setOpen };
}

const ALL_ITEMS = [...PRIMARY_NAV, ...MANAGEMENT_NAV, SETTINGS_NAV];

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const results = ALL_ITEMS.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[20%] max-w-md translate-y-0 p-0">
        <DialogTitle className="sr-only">Busca global</DialogTitle>
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ir para…"
          className="w-full border-b bg-transparent px-4 py-3 text-sm outline-none"
        />
        <div className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted-foreground">Nenhum resultado.</p>}
          {results.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.to}
                onClick={() => {
                  navigate(item.to);
                  onOpenChange(false);
                  setQuery("");
                }}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
                {item.label}
              </button>
            );
          })}
        </div>
        <p className="border-t px-4 py-2 text-xs text-muted-foreground">
          A busca por tarefas, projetos e pessoas chega nas próximas fases.
        </p>
      </DialogContent>
    </Dialog>
  );
}
