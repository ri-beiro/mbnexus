import { useNavigate } from "react-router-dom";
import { Bell, Calendar, HelpCircle, LogOut, Plus, Search, Settings, User } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import { ROLE_LABELS } from "@/permissions/types";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CommandPalette, useCommandPalette } from "@/app/layout/CommandPalette";
import { useNotificationsBadge } from "@/features/notifications/useNotificationsBadge";

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
  const unreadCount = useNotificationsBadge();

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4">
      <button
        onClick={palette.open}
        className="flex w-full max-w-sm items-center gap-2 rounded-md border bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Buscar…</span>
        <kbd className="rounded border bg-background px-1.5 py-0.5 text-[10px]">Ctrl K</kbd>
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

      <Button variant="ghost" size="icon" onClick={() => navigate("/calendar")} aria-label="Calendário">
        <Calendar className="h-4 w-4" />
      </Button>

      <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-full">
            <Avatar>
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
