"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  BellIcon,
  ChevronDownIcon,
  FileTextIcon,
  HelpCircleIcon,
  LogOutIcon,
  MoonStarIcon,
  PlayIcon,
  SearchIcon,
  ShieldCheckIcon,
  SunMediumIcon,
  UserCircle2Icon,
} from "lucide-react"

import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import { useTheme } from "@/components/layout/theme-provider"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { useSecurityConsoleStore } from "@/store/security-console-store"

const pageMeta: Record<string, { title: string; description: string }> = {
  "/": {
    title: "Dashboard",
    description: "Genel güvenlik, risk ve operasyon görünümü",
  },
  "/dashboard": {
    title: "Dashboard",
    description: "Genel güvenlik, risk ve operasyon görünümü",
  },
  "/cloud-map": {
    title: "Cloud Map",
    description: "Hibrit bulut mimarisi ve ilişkiler",
  },
  "/data-assets": {
    title: "Data Assets",
    description: "Veri varlıkları, sınıflandırma ve risk kayıtları",
  },
  "/access-requests": {
    title: "Access Requests",
    description: "Zero Trust erişim talepleri ve karar akışı",
  },
  "/policy-engine": {
    title: "Policy Engine",
    description: "Zero Trust kuralları ve enforcement mantığı",
  },
  "/deception": {
    title: "Deception",
    description: "Deception varlıkları ve aktif savunma görünümü",
  },
  "/adversary-validation": {
    title: "Adversary Validation",
    description: "Yetkili hedefler, güvenlik testi koşuları ve doğrulanmış bulgular",
  },
  "/events": {
    title: "Events",
    description: "SIEM / SOAR olay listesi ve playbook akışları",
  },
  "/compliance": {
    title: "Compliance",
    description: "NIST, ISO, KVKK ve GDPR görünürlüğü",
  },
  "/threat-matrix": {
    title: "Threat Matrix",
    description: "Tehdit-kontrol kapsama tablosu",
  },
  "/reports": {
    title: "Reports",
    description: "Raporlar ve çıktı katmanı",
  },
  "/simulations": {
    title: "Scenarios",
    description: "Operasyon ve tehdit senaryoları",
  },
  "/presentation": {
    title: "Executive Briefing",
    description: "Yönetici odaklı özet ve operasyon hikayesi",
  },
  "/final-checklist": {
    title: "Platform Status",
    description: "Platform yetkinlikleri ve operasyon hazırlığı",
  },
  "/settings": {
    title: "Settings",
    description: "Profil, oturum ve organizasyon ayarları",
  },
  "/audit-logs": {
    title: "Audit Logs",
    description: "Kimlik, karar, rapor ve müdahale kayıtları",
  },
}

const quickTargets = [
  { href: "/events", label: "Events" },
  { href: "/adversary-validation", label: "Adversary Validation" },
  { href: "/reports", label: "Reports" },
  { href: "/simulations", label: "Simulations" },
  { href: "/data-assets", label: "Data Assets" },
] as const

export function SiteHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const environment = useSecurityConsoleStore((state) => state.environment)
  const dashboard = useSecurityConsoleStore((state) => state.dashboard)
  const runExecutiveDemo = useSecurityConsoleStore((state) => state.runExecutiveDemo)
  const generateReport = useSecurityConsoleStore((state) => state.generateReport)
  const currentUser = useSecurityConsoleStore((state) => state.currentUser)
  const currentOrganization = useSecurityConsoleStore((state) => state.currentOrganization)
  const logout = useSecurityConsoleStore((state) => state.logout)
  const notifications = useSecurityConsoleStore((state) => state.notifications)
  const markNotificationRead = useSecurityConsoleStore((state) => state.markNotificationRead)
  const markAllNotificationsRead = useSecurityConsoleStore((state) => state.markAllNotificationsRead)
  const canRunSimulation = useSecurityConsoleStore((state) => state.can("run_simulation"))
  const canGenerateReport = useSecurityConsoleStore((state) => state.can("generate_report"))
  const { theme, toggleTheme } = useTheme()
  const { state: sidebarState } = useSidebar()
  const [query, setQuery] = useState("")
  const meta = pageMeta[pathname] ?? pageMeta["/dashboard"]
  const isSidebarCollapsed = sidebarState === "collapsed"

  const matches = useMemo(() => {
    if (!query.trim()) {
      return []
    }

    const lower = query.toLowerCase()
    const pageMatches = quickTargets.filter((item) => item.label.toLowerCase().includes(lower))
    const assetMatches = environment.assets
      .filter((asset) => `${asset.name} ${asset.path}`.toLowerCase().includes(lower))
      .slice(0, 4)
      .map((asset) => ({ href: "/data-assets", label: asset.name }))

    return [...pageMatches, ...assetMatches].slice(0, 6)
  }, [environment.assets, query])
  const unreadNotifications = notifications.filter((item) => !item.read).length

  return (
    <header className="sticky top-0 z-40 flex h-(--header-height) shrink-0 items-center border-b bg-background/95 backdrop-blur">
      <div className="flex w-full items-center gap-3 px-4 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="data-[orientation=vertical]:h-4" />

        <div
          className={cn(
            "min-w-0 transition-[max-width] duration-200",
            isSidebarCollapsed
              ? "max-w-[180px] sm:max-w-[240px] lg:max-w-[320px] xl:max-w-[380px]"
              : "max-w-[220px] sm:max-w-[320px] lg:max-w-[420px] xl:max-w-[520px]"
          )}
        >
          {!isSidebarCollapsed ? <Breadcrumbs /> : null}
          <div className="mt-0.5 min-w-0 overflow-hidden">
            <h1 className="truncate text-sm font-semibold">{meta.title}</h1>
            <p
              className={cn(
                "truncate text-xs text-muted-foreground",
                isSidebarCollapsed ? "hidden xl:block" : "block"
              )}
            >
              {meta.description}
            </p>
          </div>
        </div>

        <div className="relative ml-auto hidden max-w-md flex-1 md:block">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Varlık, olay veya rapor ara"
            className="pl-8"
            aria-label="Global arama"
          />
          {matches.length ? (
            <div className="absolute top-10 right-0 left-0 z-30 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-1 shadow-lg">
              {matches.map((match) => (
                <Link
                  key={`${match.href}-${match.label}`}
                  href={match.href}
                  onClick={() => setQuery("")}
                  className="block rounded-lg px-2.5 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--surface)]"
                >
                  {match.label}
                </Link>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" className="lg:hidden" onClick={toggleTheme} aria-label="Tema değiştir">
            {theme === "dark" ? <SunMediumIcon /> : <MoonStarIcon />}
          </Button>
          <Badge variant="outline">Score {dashboard.securityScore}</Badge>
          <Badge variant="outline">Critical {environment.events.filter((event) => event.severity === "critical").length}</Badge>
          <Button variant="outline" size="sm" onClick={toggleTheme} className="hidden lg:inline-flex">
            {theme === "dark" ? <SunMediumIcon /> : <MoonStarIcon />}
            {theme === "dark" ? "Light" : "Dark"}
          </Button>
          <Button
            size="sm"
            onClick={() => void runExecutiveDemo()}
            disabled={!canRunSimulation}
            title={!canRunSimulation ? "Bu aksiyon için uygun rol gerekir." : undefined}
            className="hidden lg:inline-flex"
          >
            <PlayIcon />
            Guided Run
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Hızlı rapor üret"
            onClick={() => generateReport()}
            disabled={!canGenerateReport}
            title={!canGenerateReport ? "Bu aksiyon için rapor üretme yetkisi gerekir." : undefined}
          >
            <FileTextIcon />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon-sm" className="relative" aria-label="Bildirim merkezi">
                <BellIcon />
                {unreadNotifications ? (
                  <span className="absolute -top-1 -right-1 inline-flex min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                    {unreadNotifications}
                  </span>
                ) : null}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[70] w-96">
              <DropdownMenuLabel className="flex items-center justify-between gap-2">
                <span>Notification Center</span>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => void markAllNotificationsRead()}>
                  Mark all read
                </Button>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.length ? (
                <div className="max-h-[420px] overflow-y-auto">
                  {notifications.slice(0, 10).map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className="flex cursor-pointer flex-col items-start gap-1 px-3 py-3"
                      onClick={() => {
                        void markNotificationRead(notification.id)
                        if (notification.actionHref) {
                          router.push(notification.actionHref)
                        }
                      }}
                    >
                      <div className="flex w-full items-center justify-between gap-3">
                        <p className="text-sm font-medium text-foreground">{notification.title}</p>
                        <Badge
                          variant="outline"
                          className={
                            notification.severity === "critical"
                              ? "border-rose-500/30 text-rose-300"
                              : notification.severity === "high"
                                ? "border-orange-500/30 text-orange-300"
                                : notification.severity === "medium"
                                  ? "border-amber-500/30 text-amber-300"
                                  : "border-cyan-500/30 text-cyan-300"
                          }
                        >
                          {notification.module}
                        </Badge>
                      </div>
                      <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">{notification.description}</p>
                      <div className="flex w-full items-center justify-between text-[11px] text-muted-foreground">
                        <span>{notification.module}</span>
                        <span>{notification.read ? "read" : "unread"}</span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </div>
              ) : (
                <div className="px-3 py-6 text-sm text-muted-foreground">Şu anda bekleyen bildirim yok.</div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Avatar className="size-6">
                  <AvatarFallback>{currentUser?.avatarInitials ?? "HC"}</AvatarFallback>
                </Avatar>
                <span className="max-w-[140px] truncate">{currentUser?.name ?? "Oturum"}</span>
                <ChevronDownIcon className="size-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[70] w-72">
              <DropdownMenuLabel>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">{currentUser?.name}</p>
                  <p className="text-xs text-muted-foreground">{currentUser?.role}</p>
                  <p className="text-xs text-muted-foreground">{currentOrganization.name}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {currentUser?.isSystemOwner ? (
                <DropdownMenuItem onClick={() => router.push("/admin")}>
                  <ShieldCheckIcon />
                  Admin Console
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem onClick={() => router.push("/settings")}>
                <UserCircle2Icon />
                Profil ve ayarlar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleTheme}>
                {theme === "dark" ? <SunMediumIcon /> : <MoonStarIcon />}
                Tema değiştir
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/verify-2fa")}>
                <ShieldCheckIcon />
                Güvenlik doğrulaması
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/settings")}>
                <HelpCircleIcon />
                Destek ve yapılandırma
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  void logout().finally(() => {
                    router.replace("/login")
                  })
                }}
              >
                <LogOutIcon />
                Çıkış yap
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
