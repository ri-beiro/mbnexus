import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Calendar,
  FolderKanban,
  GanttChartSquare,
  Home,
  Lightbulb,
  LayoutDashboard,
  LayoutGrid,
  ListTodo,
  Settings,
  StickyNote,
  Users,
} from "lucide-react";
import { isManagementRole, type SessionRole } from "@/permissions/types";
import type { RoleKey } from "@/types/database";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  shortcut?: string;
}

// Section 33: itens que o usuário não possui permissão não devem aparecer.
export const PRIMARY_NAV: NavItem[] = [
  { label: "Minha Home", to: "/home", icon: Home },
  { label: "Tarefas", to: "/tasks", icon: ListTodo, shortcut: "N" },
  { label: "Kanban", to: "/kanban", icon: LayoutGrid, shortcut: "K" },
  { label: "Projetos", to: "/projects", icon: FolderKanban },
  { label: "Calendário", to: "/calendar", icon: Calendar, shortcut: "C" },
  { label: "Gantt", to: "/gantt", icon: GanttChartSquare, shortcut: "G" },
  { label: "Notas", to: "/notes", icon: StickyNote },
  { label: "Ideias", to: "/ideas", icon: Lightbulb },
  { label: "Dashboards", to: "/dashboards", icon: LayoutDashboard, shortcut: "D" },
];

export const MANAGEMENT_NAV: NavItem[] = [
  { label: "Minha Equipe", to: "/team", icon: Users },
  { label: "Relatórios", to: "/reports", icon: BarChart3 },
];

export const SETTINGS_NAV: NavItem = { label: "Configurações", to: "/settings", icon: Settings };

export function visibleManagementNav(role: RoleKey | null, roles: SessionRole[]): NavItem[] {
  if (isManagementRole(role) || roles.length === 0) return MANAGEMENT_NAV;
  return [];
}
