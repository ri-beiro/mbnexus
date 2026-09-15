import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { ToastProvider } from "@/components/ui/toast-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedRoute } from "@/app/ProtectedRoute";
import { AppLayout } from "@/app/layout/AppLayout";
import { Login } from "@/pages/Login";
import { Home } from "@/pages/Home";
import { Settings } from "@/pages/Settings";
import { Tasks } from "@/pages/Tasks";
import {
  CalendarPage,
  DashboardsPage,
  HelpPage,
  IdeasPage,
  NotesPage,
  ProjectsPage,
  ReportsPage,
  TeamPage,
} from "@/pages/placeholders";

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <TooltipProvider>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/home" element={<Home />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/notes" element={<NotesPage />} />
                <Route path="/ideas" element={<IdeasPage />} />
                <Route path="/dashboards" element={<DashboardsPage />} />
                <Route path="/team" element={<TeamPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/help" element={<HelpPage />} />
              </Route>
              <Route path="/" element={<Navigate to="/home" replace />} />
              <Route path="*" element={<Navigate to="/home" replace />} />
            </Routes>
          </AuthProvider>
        </TooltipProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
