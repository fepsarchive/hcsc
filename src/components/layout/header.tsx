"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { useDemo } from "@/components/layout/demo-provider";
import { useTheme } from "@/components/layout/theme-provider";
import { ActionButton } from "@/components/ui/action-button";
import { SearchInput } from "@/components/ui/search-input";
import { StatusBadge } from "@/components/ui/status-badge";

const pageMeta: Record<string, { title: string; description: string; primaryAction: string }> = {
  "/": {
    title: "Dashboard",
    description: "Genel güvenlik, risk ve operasyon akışı görünümü",
    primaryAction: "Yeni görünüm",
  },
  "/dashboard": {
    title: "Dashboard",
    description: "Genel güvenlik, risk ve operasyon akışı görünümü",
    primaryAction: "Yeni görünüm",
  },
  "/cloud-map": {
    title: "Cloud Map",
    description: "Hibrit bulut mimarisi ve ilişkiler",
    primaryAction: "Yeni node",
  },
  "/data-assets": {
    title: "Data Assets",
    description: "Veri varlıkları, sınıflandırma ve risk kayıtları",
    primaryAction: "Yeni varlık",
  },
  "/access-requests": {
    title: "Access Requests",
    description: "Zero Trust erişim talepleri ve karar akışı",
    primaryAction: "Yeni talep",
  },
  "/policy-engine": {
    title: "Policy Engine",
    description: "Zero Trust kuralları ve enforcement mantığı",
    primaryAction: "Yeni kural",
  },
  "/deception": {
    title: "Deception",
    description: "Sahte depolama alanları ve aktif savunma görünümü",
    primaryAction: "Yeni trap",
  },
  "/events": {
    title: "Event Center",
    description: "SIEM / SOAR olay listesi ve playbook akışları",
    primaryAction: "Yeni olay",
  },
  "/compliance": {
    title: "Compliance",
    description: "NIST, ISO, KVKK ve GDPR görünürlüğü",
    primaryAction: "Yeni kontrol",
  },
  "/threat-matrix": {
    title: "Threat Matrix",
    description: "Tehdit-kontrol kapsama tablosu",
    primaryAction: "Yeni eşleşme",
  },
  "/reports": {
    title: "Reports",
    description: "Raporlar ve çıktı katmanı",
    primaryAction: "Yeni rapor",
  },
  "/simulations": {
    title: "Simulations",
    description: "Operasyon ve tehdit senaryoları",
    primaryAction: "Yeni senaryo",
  },
  "/presentation": {
    title: "Executive Briefing",
    description: "Yönetim için akış odaklı görünüm",
    primaryAction: "Briefing’i başlat",
  },
  "/final-checklist": {
    title: "Platform Status",
    description: "Ürün hazırlık ve operasyon kontrolü",
    primaryAction: "Yeni kontrol",
  },
};

const quickTargets = [
  { href: "/presentation", label: "Executive Briefing" },
  { href: "/reports", label: "Reports" },
  { href: "/simulations", label: "Scenarios" },
  { href: "/cloud-map", label: "Cloud Map" },
  { href: "/events", label: "Events" },
  { href: "/data-assets", label: "Data Assets" },
];

export function Header({
  onMenu,
  sidebarCollapsed,
  onToggleSidebar,
}: {
  onMenu?: () => void;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}) {
  const pathname = usePathname();
  const { dashboard, startDemoScenario, environment } = useDemo();
  const { theme, toggleTheme } = useTheme();
  const [query, setQuery] = useState("");

  const meta = pageMeta[pathname] ?? pageMeta["/dashboard"];

  const matches = useMemo(() => {
    if (!query.trim()) {
      return [];
    }

    const q = query.toLowerCase();
    const pageMatches = quickTargets.filter((item) => item.label.toLowerCase().includes(q));
    const assetMatches = environment.assets
      .filter((asset) => `${asset.name} ${asset.path}`.toLowerCase().includes(q))
      .slice(0, 4)
      .map((asset) => ({ href: "/data-assets", label: `Asset: ${asset.name}` }));

    return [...pageMatches, ...assetMatches].slice(0, 6);
  }, [environment.assets, query]);

  return (
    <header className="hcsc-glass sticky top-0 z-30 rounded-[12px] px-3 py-2.5 backdrop-blur lg:px-4">
      <div className="flex flex-col gap-2.5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="xl:hidden">
                <ActionButton variant="ghost" onClick={onMenu} aria-label="Mobil menüyü aç">
                  Menu
                </ActionButton>
              </div>
              <div className="hidden xl:block">
                <ActionButton
                  variant="ghost"
                  onClick={onToggleSidebar}
                  aria-label={sidebarCollapsed ? "Sol paneli genişlet" : "Sol paneli daralt"}
                >
                  {sidebarCollapsed ? "»" : "«"}
                </ActionButton>
              </div>
            </div>
            <Breadcrumbs />
            <div className="mt-1">
              <h1 className="truncate text-[17px] font-medium text-white">{meta.title}</h1>
              <p className="truncate text-[13px] text-slate-500">{meta.description}</p>
            </div>
          </div>

          <div className="hidden items-center gap-1.5 xl:flex">
            <StatusBadge label={`Score ${dashboard.securityScore}`} tone="info" />
            <StatusBadge
              label={`Critical ${environment.events.filter((event) => event.severity === "critical").length}`}
              tone="critical"
            />
            <ActionButton variant="secondary" onClick={toggleTheme}>
              {theme === "dark" ? "Light" : "Dark"}
            </ActionButton>
            <ActionButton onClick={startDemoScenario}>Operasyon Akışını Başlat</ActionButton>
            <ActionButton variant="secondary">{meta.primaryAction}</ActionButton>
          </div>
        </div>

        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative max-w-[620px] flex-1">
            <SearchInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Global search: sayfa, varlık, olay veya rapor"
              aria-label="Global arama"
            />

            {matches.length ? (
              <div className="hcsc-glass absolute left-0 top-10 z-50 w-full rounded-xl p-1.5">
                {matches.map((match) => (
                  <Link
                    key={`${match.href}-${match.label}`}
                    href={match.href}
                    onClick={() => setQuery("")}
                    className="block rounded-md px-2.5 py-2 text-[13px] text-slate-200 transition hover:bg-white/[0.05]"
                  >
                    {match.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 xl:hidden">
            <StatusBadge label={`Score ${dashboard.securityScore}`} tone="info" />
            <StatusBadge
              label={`Critical ${environment.events.filter((event) => event.severity === "critical").length}`}
              tone="critical"
            />
            <ActionButton variant="secondary" onClick={toggleTheme}>
              {theme === "dark" ? "Light" : "Dark"}
            </ActionButton>
            <ActionButton onClick={startDemoScenario}>Akış</ActionButton>
          </div>
        </div>
      </div>
    </header>
  );
}
