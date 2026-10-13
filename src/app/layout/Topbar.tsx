import { useNavigate } from "react-router-dom";
import { Calendar, HelpCircle, LogOut, Plus, Search, Settings, User } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import { ROLE_LABELS } from "@/permissions/types";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CommandPalette, useCommandPalette } from "@/app/layout/CommandPalette";
import { NotificationCenter } from "@/features/notifications/NotificationCenter";
import { ThemeToggle } from "@/features/theme/ThemeToggle";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

const CREATE_ITEMS = [
  { label: "Nova tarefa", to: "/tasks?new=1" },
  { label: "Novo projeto", to: "/projects?new=1" },
  { label: "Nova nota", to: "/notes?new=1" },
  { label: "Novo evento", to: "/calendar?new=1" },
  { label: "Nova ideia", to: "/ideas?new=1" },
];

export function Topbar() {
  const { profile, primaryRole, signOut } = useAuth();
  const navigate = useNavigate();
  const palette = useCommandPalette();

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 bg-background px-5">
      <button
        onClick={palette.open}
        className="neu-sunken group flex w-full max-w-sm items-center gap-2.5 py-2.5 pl-2.5 pr-3.5 text-sm text-muted-foreground transition-all duration-200 hover:text-[var(--neu-lime-solid)]"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[rgba(190,249,27,0.12)] text-[var(--neu-lime-solid)] transition-transform duration-200 group-hover:scale-110">
          <Search className="h-3.5 w-3.5" />
        </span>
        <span className="flex-1 text-left">Buscar…</span>
        <kbd className="neu-divider rounded-md border bg-transparent px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          Ctrl K
        </kbd>
      </button>
      <CommandPalette open={palette.isOpen} onOpenChange={palette.setOpen} />

      <div className="flex-1" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Criar
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {CREATE_ITEMS.map((item) => (
            <DropdownMenuItem key={item.to} onSelect={() => navigate(item.to)}>
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => navigate("/calendar")}
          aria-label="Calendário"
          className="neu-surface-sm neu-surface-hover flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--neu-text-secondary)]"
        >
          <Calendar className="h-4 w-4" />
        </button>

        <NotificationCenter />

        <ThemeToggle />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="neu-surface-sm neu-surface-hover ml-1 flex items-center gap-2 rounded-full p-0.5">
            <Avatar>
              {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.full_name} />}
              <AvatarFallback>{profile ? initials(profile.full_name) : <User className="h-4 w-4" />}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <p className="truncate text-sm font-medium">{profile?.full_name}</p>
            <p className="truncate text-xs font-normal text-muted-foreground">
              {primaryRole ? ROLE_LABELS[primaryRole] : "Sem papel atribuído"}
            </p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => navigate("/settings")}>
            <Settings className="h-4 w-4" /> Configurações
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => navigate("/help")}>
            <HelpCircle className="h-4 w-4" /> Ajuda
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => signOut()} className="text-destructive focus:text-destructive">
            <LogOut className="h-4 w-4" /> Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
