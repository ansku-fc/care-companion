import React, { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TaskProvider } from "@/components/tasks/TaskProvider";
import { NotificationBell } from "@/components/NotificationBell";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider style={{ "--sidebar-width": "14rem", "--sidebar-width-icon": "3.75rem" } as React.CSSProperties}>
      <TaskProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <main className="flex-1 flex flex-col min-w-0 bg-[var(--app-canvas)]">
            <header className="h-14 flex items-center justify-between border-b border-[var(--app-line)] px-8 bg-[var(--app-header)]">
              <div className="md:hidden"><SidebarTrigger /></div>
              <div className="flex-1" />
              <NotificationBell />
            </header>
            <div className="flex-1 px-8 md:px-10 py-8 overflow-auto">
              {children}
            </div>
          </main>
        </div>
      </TaskProvider>
    </SidebarProvider>
  );
}
