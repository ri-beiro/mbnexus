import { NavLink } from "react-router-dom";
import { Calendar, FolderKanban, Home, ListTodo, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { label: "Home", to: "/home", icon: Home },
  { label: "Tarefas", to: "/tasks", icon: ListTodo },
  { label: "Projetos", to: "/projects", icon: FolderKanban },
  { label: "Calendário", to: "/calendar", icon: Calendar },
  { label: "Mais", to: "/settings", icon: Menu },
];

// Seção 40: no mobile a sidebar vira um menu inferior.
export function MobileNav() {
  return (
    <nav
      className="neu-surface fixed inset-x-3 bottom-3 z-40 flex items-center justify-around !rounded-3xl py-2 md:hidden"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)" }}
    >
      {ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] text-muted-foreground transition-colors",
                isActive && "text-[var(--neu-lime-solid)]",
              )
            }
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
