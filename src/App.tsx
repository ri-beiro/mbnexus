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
import { Kanban } from "@/pages/Kanban";
import { Projects } from "@/pages/Projects";
import { Calendar } from "@/pages/Calendar";
import { Gantt } from "@/pages/Gantt";
import { Notes } from "@/pages/Notes";
import { Team } from "@/pages/Team";
import { Dashboards } from "@/pages/Dashboards";
import { Reports } from "@/pages/Reports";
import { Ideas } from "@/pages/Ideas";
import { HelpPage } from "@/pages/placeholders";

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
                <Route path="/kanban" element={<Kanban />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/gantt" element={<Gantt />} />
                <Route path="/notes" element={<Notes />} />
                <Route path="/ideas" element={<Ideas />} />
                <Route path="/dashboards" element={<Dashboards />} />
                <Route path="/team" element={<Team />} />
                <Route path="/reports" element={<Reports />} />
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
