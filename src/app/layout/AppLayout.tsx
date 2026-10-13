import { Outlet } from "react-router-dom";
import { Sidebar } from "@/app/layout/Sidebar";
import { Topbar } from "@/app/layout/Topbar";
import { MobileNav } from "@/app/layout/MobileNav";
import { BirthdayBalloons } from "@/features/profile/BirthdayBalloons";

export function AppLayout() {
  return (
    <div className="neu-grid-bg flex h-screen w-full overflow-hidden bg-background">
      <BirthdayBalloons />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <div className="container py-6">
            <Outlet />
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
