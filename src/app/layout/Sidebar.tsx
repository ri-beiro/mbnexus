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
          "group relative flex items-center gap-3 rounded-2xl py-2 pl-3.5 pr-3 text-sm font-medium text-sidebar-foreground/65 transition-all duration-300 hover:bg-[rgba(190,249,27,0.08)] hover:text-[var(--neu-lime-solid)]",
          isActive && "bg-[rgba(190,249,27,0.12)] font-semibold text-[var(--neu-lime-solid)]",
          collapsed && "justify-center px-0",
        )
      }
      title={collapsed ? item.label : undefined}
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-[var(--neu-lime-solid)] transition-all duration-300",
              isActive ? "opacity-100" : "opacity-0",
            )}
          />
          <span
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all duration-300",
              isActive ? "neu-sunken" : "group-hover:bg-[rgba(190,249,27,0.1)]",
            )}
          >
            <Icon className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110" />
          </span>
          {!collapsed && <span className="truncate">{item.label}</span>}
        </>
      )}
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
      <div
        className={cn(
          "neu-divider flex h-16 items-center gap-2.5 border-b px-5",
          collapsed && "justify-center px-0",
        )}
      >
        <div className="neu-surface-sm flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
          <Layers className="h-4 w-4 text-[var(--neu-lime-solid)]" />
        </div>
        {!collapsed && <span className="text-sm font-semibold tracking-tight">MB Nexus</span>}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
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

      <div className="neu-divider space-y-1 border-t px-3 py-3">
        <NavRow item={SETTINGS_NAV} collapsed={collapsed} />
        <button
          onClick={toggle}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          className={cn(
            "neu-sunken flex items-center justify-center gap-2 rounded-xl py-2 text-sidebar-foreground/60 transition-all duration-200 hover:text-[var(--neu-lime-solid)]",
            collapsed ? "mx-auto h-7 w-7" : "w-full",
          )}
        >
          {collapsed ? <ChevronsRight className="h-3.5 w-3.5" /> : <ChevronsLeft className="h-3.5 w-3.5" />}
        </button>
      </div>
    </aside>
  );
}
