"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { ToastStack } from "@/components/layout/toast-stack"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={150}>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "17rem",
            "--sidebar-width-icon": "2.75rem",
            "--header-height": "3.75rem",
          } as React.CSSProperties
        }
      >
        <AppSidebar />
        <SidebarInset className="h-svh min-h-svh overflow-hidden">
          <ToastStack />
          <SiteHeader />
          <div className="hcsc-scrollbar min-h-0 min-w-0 flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
            <div className="@container/main flex min-h-0 min-w-0 flex-1 flex-col gap-3 px-3 py-3 lg:px-4 lg:py-4">
              {children}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
