"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { FileTextIcon, MoonStarIcon, PlayIcon, SearchIcon, SunMediumIcon } from "lucide-react"

import { Breadcrumbs } from "@/components/layout/breadcrumbs"
import { useDemo } from "@/components/layout/demo-provider"
import { useTheme } from "@/components/layout/theme-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

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
}

const quickTargets = [
  { href: "/events", label: "Events" },
  { href: "/reports", label: "Reports" },
  { href: "/simulations", label: "Simulations" },
  { href: "/data-assets", label: "Data Assets" },
] as const

export function SiteHeader() {
  const pathname = usePathname()
  const { environment, dashboard, startDemoScenario, generateReport } = useDemo()
  const { theme, toggleTheme } = useTheme()
  const [query, setQuery] = useState("")
  const meta = pageMeta[pathname] ?? pageMeta["/dashboard"]

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

  return (
    <header className="sticky top-0 z-20 flex h-(--header-height) shrink-0 items-center border-b bg-background/95 backdrop-blur">
      <div className="flex w-full items-center gap-3 px-4 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="data-[orientation=vertical]:h-4" />

        <div className="min-w-0">
          <Breadcrumbs />
          <div className="mt-0.5">
            <h1 className="truncate text-sm font-semibold">{meta.title}</h1>
            <p className="truncate text-xs text-muted-foreground">{meta.description}</p>
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
          <Button size="sm" onClick={startDemoScenario}>
            <PlayIcon />
            Demo Senaryosu Başlat
          </Button>
          <Button variant="outline" size="icon-sm" aria-label="Hızlı rapor üret" onClick={() => generateReport()}>
            <FileTextIcon />
          </Button>
        </div>
      </div>
    </header>
  )
}
