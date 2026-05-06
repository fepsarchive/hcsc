"use client"

import { useEffect, useMemo, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { ToastStack } from "@/components/layout/toast-stack"
import { useDemo } from "@/components/layout/demo-provider"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

const publicRoutes = new Set(["/login", "/verify-2fa", "/onboarding"])

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { auth, onboardingCompleted } = useDemo()
  const contentScrollRef = useRef<HTMLDivElement | null>(null)
  const isPublicRoute = publicRoutes.has(pathname)
  const isScrollablePublicRoute = pathname === "/onboarding"
  const isPrintRoute = pathname.startsWith("/reports/") && pathname.endsWith("/print")

  const redirectTarget = useMemo(() => {
    if (!auth.hydrated) return null

    if (!auth.isAuthenticated) {
      return isPublicRoute && pathname === "/login" ? null : "/login"
    }

    if (!auth.is2FAVerified) {
      return pathname === "/verify-2fa" ? null : "/verify-2fa"
    }

    if (!onboardingCompleted) {
      return pathname === "/onboarding" ? null : "/onboarding"
    }

    if (isPublicRoute) {
      return "/dashboard"
    }

    return null
  }, [auth.hydrated, auth.isAuthenticated, auth.is2FAVerified, isPublicRoute, onboardingCompleted, pathname])

  useEffect(() => {
    if (!redirectTarget || pathname === redirectTarget) return
    router.replace(redirectTarget)
  }, [pathname, redirectTarget, router])

  useEffect(() => {
    if (isPublicRoute) return
    contentScrollRef.current?.scrollTo({ top: 0, left: 0, behavior: "auto" })
  }, [isPublicRoute, pathname])

  if (!auth.hydrated || redirectTarget) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 text-sm text-[var(--text-secondary)]">
          Güvenli oturum hazırlanıyor...
        </div>
      </div>
    )
  }

  if (isPublicRoute) {
    return (
      <div
        className={
          isScrollablePublicRoute
            ? "hcsc-scrollbar h-svh overflow-y-auto overflow-x-hidden bg-background"
            : "h-svh overflow-hidden bg-background"
        }
      >
        <ToastStack />
        {children}
      </div>
    )
  }

  if (isPrintRoute) {
    return (
      <div className="min-h-svh bg-background">
        <ToastStack />
        {children}
      </div>
    )
  }

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
          <div
            ref={contentScrollRef}
            className="hcsc-scrollbar min-h-0 min-w-0 flex flex-1 flex-col overflow-y-auto overflow-x-hidden"
          >
            <div className="@container/main flex min-h-0 min-w-0 flex-1 flex-col gap-3 px-3 py-3 lg:px-4 lg:py-4">
              {children}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
