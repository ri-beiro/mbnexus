import {
  BarChart3,
  Calendar,
  FolderKanban,
  HelpCircle,
  LayoutDashboard,
  Lightbulb,
  ListTodo,
  StickyNote,
  Users,
} from "lucide-react";
import { ComingSoon } from "@/components/ComingSoon";

export const TasksPage = () => <ComingSoon icon={ListTodo} title="Tarefas" phase="Fase 2" />;
export const ProjectsPage = () => <ComingSoon icon={FolderKanban} title="Projetos" phase="Fase 3" />;
export const CalendarPage = () => <ComingSoon icon={Calendar} title="Calendário" phase="Fase 4" />;
export const NotesPage = () => <ComingSoon icon={StickyNote} title="Notas" phase="Fase 5" />;
export const IdeasPage = () => <ComingSoon icon={Lightbulb} title="Central de Ideias" phase="Fase 9" />;
export const DashboardsPage = () => <ComingSoon icon={LayoutDashboard} title="Dashboards" phase="Fase 6" />;
export const TeamPage = () => <ComingSoon icon={Users} title="Minha Equipe" phase="Fase 6" />;
export const ReportsPage = () => <ComingSoon icon={BarChart3} title="Relatórios" phase="Fase 6" />;
export const HelpPage = () => <ComingSoon icon={HelpCircle} title="Ajuda" phase="uma fase futura" />;
