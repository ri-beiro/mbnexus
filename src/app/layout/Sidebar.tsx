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
      style={{ transitionTimingFunction: "cubic-bezier(.2,.7,.3,1)" }}
      className={({ isActive }) =>
        cn(
          "group flex items-center gap-3 rounded-full px-3.5 py-2 text-sm font-medium text-sidebar-foreground/70 transition-all duration-300 hover:translate-x-0.5 hover:bg-[rgba(190,249,27,0.09)] hover:text-[var(--neu-lime-solid)]",
          isActive &&
            "bg-primary text-primary-foreground font-semibold shadow-[6px_6px_14px_var(--neu-d),-4px_-4px_11px_var(--neu-l),0_0_20px_-8px_var(--neu-glow)] hover:translate-x-0 hover:bg-primary hover:text-primary-foreground",
          collapsed && "justify-center px-0 hover:translate-x-0",
        )
      }
      title={collapsed ? item.label : undefined}
    >
      <Icon className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110" />
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
        "hidden shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex",
        collapsed ? "w-20" : "w-64",
      )}
    >
      <div className={cn("flex h-16 items-center gap-2.5 px-5", collapsed && "justify-center px-0")}>
        <div className="neu-surface-sm flex h-9 w-9 shrink-0 items-center justify-center">
          <Layers className="h-4 w-4 text-[var(--neu-lime-solid)]" />
        </div>
        {!collapsed && <span className="text-sm font-semibold">MB Nexus</span>}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {PRIMARY_NAV.map((item) => (
          <NavRow key={item.to} item={item} collapsed={collapsed} />
        ))}

        {managementItems.length > 0 && (
          <>
            <div
              className={cn(
                "mb-1 mt-4 px-3.5 text-[10px] font-semibold uppercase tracking-[.12em] text-[var(--neu-text-label)]",
                collapsed && "hidden",
              )}
            >
              Gestão
            </div>
            {managementItems.map((item) => (
              <NavRow key={item.to} item={item} collapsed={collapsed} />
            ))}
          </>
        )}
      </nav>

      <div className="space-y-1 px-3 py-3">
        <NavRow item={SETTINGS_NAV} collapsed={collapsed} />
        <button
          onClick={toggle}
          className="flex w-full items-center justify-center gap-2 rounded-full px-3.5 py-2 text-sm text-sidebar-foreground/60 transition-colors hover:bg-[rgba(190,249,27,0.09)] hover:text-[var(--neu-lime-solid)]"
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
}
