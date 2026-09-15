import { useState } from "react";
import { NavLink } from "react-router-dom";
import { ChevronsLeft, ChevronsRight, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/useAuth";
import { PRIMARY_NAV, SETTINGS_NAV, visibleManagementNav, type NavItem } from "@/app/nav-config";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem("mbnexus:sidebar-collapsed") === "1";
  } catch {
    return false;
  }
}

function NavRow({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
          isActive && "bg-sidebar-accent text-sidebar-foreground",
          collapsed && "justify-center px-0",
        )
      }
      title={collapsed ? item.label : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const { primaryRole, roles } = useAuth();
  const managementItems = visibleManagementNav(primaryRole, roles);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("mbnexus:sidebar-collapsed", next ? "1" : "0");
      } catch {
        /* per-viewer convenience only */
      }
      return next;
    });
  };

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-150 md:flex",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div className={cn("flex h-14 items-center gap-2 px-4", collapsed && "justify-center px-0")}>
        <Layers className="h-5 w-5 text-primary" />
        {!collapsed && <span className="text-sm font-semibold">MB Nexus</span>}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-2">
        {PRIMARY_NAV.map((item) => (
          <NavRow key={item.to} item={item} collapsed={collapsed} />
        ))}

        {managementItems.length > 0 && (
          <>
            <div className={cn("mt-4 mb-1 px-3 text-xs font-semibold uppercase text-sidebar-foreground/40", collapsed && "hidden")}>
              Gestão
            </div>
            {managementItems.map((item) => (
              <NavRow key={item.to} item={item} collapsed={collapsed} />
            ))}
          </>
        )}
      </nav>

      <div className="space-y-1 border-t border-sidebar-border px-2 py-2">
        <NavRow item={SETTINGS_NAV} collapsed={collapsed} />
        <button
          onClick={toggle}
          className="flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
}
