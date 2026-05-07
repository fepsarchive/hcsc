"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  BellIcon,
  ChevronDownIcon,
  FileTextIcon,
  LogOutIcon,
  MoonStarIcon,
  PlayIcon,
  SearchIcon,
  ShieldCheckIcon,
  SunMediumIcon,
  UserCircle2Icon,
} from "lucide-react"

import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import { useDemo } from "@/components/layout/demo-provider"
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

const pageMeta: Record<string, { title: string; description: string }> = {
  "/": {
    title: "Dashboard",
    description: "Genel güvenlik, risk ve demo akışı görünümü",
  },
  "/dashboard": {
    title: "Dashboard",
    description: "Genel güvenlik, risk ve demo akışı görünümü",
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
    description: "Sahte depolama alanları ve active defense görünümü",
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
    title: "Simulations",
    description: "Demo ve tehdit senaryoları",
  },
  "/presentation": {
    title: "Presentation Mode",
    description: "Tez savunması için akış odaklı görünüm",
  },
  "/final-checklist": {
    title: "Final Checklist",
    description: "Teslim ve savunma gereksinim kontrolü",
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
  { href: "/reports", label: "Reports" },
  { href: "/simulations", label: "Simulations" },
  { href: "/data-assets", label: "Data Assets" },
] as const

export function SiteHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const {
    environment,
    dashboard,
    startDemoScenario,
    generateReport,
    currentUser,
    currentOrganization,
    logout,
    can,
    notifications,
    markNotificationRead,
    clearNotifications,
  } =
    useDemo()
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
    <header className="sticky top-0 z-20 flex h-(--header-height) shrink-0 items-center border-b bg-background/95 backdrop-blur">
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

        <div className="hidden items-center gap-2 lg:flex">
          <Badge variant="outline">Score {dashboard.securityScore}</Badge>
          <Badge variant="outline">Critical {environment.events.filter((event) => event.severity === "critical").length}</Badge>
          <Button variant="outline" size="sm" onClick={toggleTheme}>
            {theme === "dark" ? <SunMediumIcon /> : <MoonStarIcon />}
            {theme === "dark" ? "Light" : "Dark"}
          </Button>
          <Button
            size="sm"
            onClick={startDemoScenario}
            disabled={!can("run_simulation")}
            title={!can("run_simulation") ? "Bu aksiyon için uygun rol gerekir." : undefined}
          >
            <PlayIcon />
            Demo Senaryosu Başlat
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Hızlı rapor üret"
            onClick={() => generateReport()}
            disabled={!can("generate_report")}
            title={!can("generate_report") ? "Bu aksiyon için rapor üretme yetkisi gerekir." : undefined}
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
            <DropdownMenuContent align="end" className="w-96">
              <DropdownMenuLabel className="flex items-center justify-between gap-2">
                <span>Notification Center</span>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => clearNotifications()}>
                  Clear all
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
                        markNotificationRead(notification.id)
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
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">{currentUser?.name}</p>
                  <p className="text-xs text-muted-foreground">{currentUser?.role}</p>
                  <p className="text-xs text-muted-foreground">{currentOrganization.name}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/settings")}>
                <UserCircle2Icon />
                Profil ve ayarlar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/verify-2fa")}>
                <ShieldCheckIcon />
                Güvenlik doğrulaması
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
