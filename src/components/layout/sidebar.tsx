"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDemo } from "@/components/layout/demo-provider";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

type SidebarItem = {
  href: string;
  label: string;
  description: string;
  icon: string;
  badge?: string;
};

const workspaceItems: SidebarItem[] = [
  { href: "/dashboard", label: "Dashboard", description: "Genel güvenlik görünümü", icon: "◫" },
  { href: "/cloud-map", label: "Cloud Map", description: "Mimari ve akış topolojisi", icon: "◎" },
  { href: "/data-assets", label: "Data Assets", description: "Veri varlıkları ve risk", icon: "▣" },
  { href: "/access-requests", label: "Access Requests", description: "Zero Trust talepleri", icon: "⇢" },
  { href: "/policy-engine", label: "Policy Engine", description: "PE / PA / PEP kuralları", icon: "⌘" },
  { href: "/deception", label: "Deception", description: "Aldatma ve active defense", icon: "◈" },
  { href: "/events", label: "Events", description: "SIEM / SOAR olay merkezi", icon: "☰" },
  { href: "/compliance", label: "Compliance", description: "NIST, ISO, KVKK, GDPR", icon: "▤" },
  { href: "/threat-matrix", label: "Threat Matrix", description: "Tehdit-kontrol kapsaması", icon: "▦" },
  { href: "/reports", label: "Reports", description: "Raporlar ve çıktı katmanı", icon: "≣" },
  { href: "/simulations", label: "Simulations", description: "Demo ve senaryo merkezi", icon: "▷" },
  { href: "/presentation", label: "Presentation Mode", description: "Jüri sunum akışı", icon: "▸" },
];

const systemItems: SidebarItem[] = [
  { href: "/final-checklist", label: "Final Checklist", description: "Teslim gereksinim görünümü", icon: "✓" },
  { href: "/final-checklist", label: "Settings", description: "Demo ve görünüm ayarları", icon: "⚙" },
  { href: "/presentation", label: "Documentation", description: "Sunum ve açıklama akışı", icon: "?" },
];

export function Sidebar({
  onNavigate,
  collapsed = false,
  onToggleCollapse,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const pathname = usePathname();
  const { environment, dashboard } = useDemo();

  const renderItem = (item: SidebarItem) => {
    const active = pathname === item.href || (pathname === "/" && item.href === "/dashboard");
    const dynamicBadge =
      item.href === "/events"
        ? `${dashboard.activeIncidentCount}`
        : item.href === "/deception"
          ? `${environment.deceptions.filter((entry) => entry.status === "triggered").length}`
          : item.badge;

    return (
      <Link
        key={item.href + item.label}
        href={item.href}
        onClick={onNavigate}
        title={item.description}
        className={cn(
          "group flex items-center gap-3 rounded-lg px-2.5 py-2 transition",
          active
            ? "bg-[#232327] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
            : "text-slate-400 hover:bg-[#1d1d21] hover:text-slate-100",
          collapsed && "justify-center px-2",
        )}
      >
        <div
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border font-mono text-[11px] font-semibold",
            active
              ? "border-[#3b3b43] bg-[#1a1a1f] text-cyan-200"
              : "border-[#2f2f34] bg-[#1a1a1d] text-slate-500 group-hover:text-slate-200",
          )}
        >
          {item.icon}
        </div>

        <div className={cn("min-w-0 flex-1", collapsed && "hidden")}>
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[13px] font-medium">{item.label}</span>
            {dynamicBadge ? <StatusBadge label={dynamicBadge} tone={active ? "info" : "neutral"} /> : null}
          </div>
          <p className="truncate text-[11px] text-slate-500 group-hover:text-slate-400">
            {item.description}
          </p>
        </div>
      </Link>
    );
  };

  return (
    <aside className="hcsc-glass flex h-full flex-col rounded-[14px] px-3 py-3">
      <div className="border-b border-[var(--border)] px-1 pb-3">
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#10b981,#0f3d91)] text-sm font-bold text-white shadow-[0_10px_30px_rgba(15,61,145,0.25)]">
            HC
          </div>
          <div className={cn("min-w-0", collapsed && "hidden")}>
            <p className="truncate text-[13px] font-semibold text-white">
              Hybrid Cloud Security Console
            </p>
            <p className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
              Active Defense Prototype
            </p>
          </div>
        </div>
      </div>

      <div className={cn("mt-3 flex items-center gap-2 px-1", collapsed && "justify-center")}>
        <button aria-label="Anasayfa kısayolu" className="flex h-8 w-8 items-center justify-center rounded-full border border-[#2f2f34] bg-[#1a1a1d] text-slate-300">
          ⌂
        </button>
        {!collapsed ? (
          <>
            <button aria-label="Arama kısayolu" className="flex h-8 w-8 items-center justify-center rounded-full border border-[#2f2f34] bg-[#1a1a1d] text-slate-300">
              ◌
            </button>
            <button className="ml-auto inline-flex h-8 items-center rounded-full border border-[#2f2f34] bg-[#1a1a1d] px-3 text-[13px] text-slate-300">
              + Yeni
            </button>
          </>
        ) : null}
      </div>

      {!collapsed ? (
        <div className="mt-3 grid grid-cols-2 gap-2 px-1">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-2.5 py-2">
            <p className="font-mono text-[10px] tracking-[0.06em] text-slate-500">Score</p>
            <p className="mt-1 text-base font-semibold text-white">{dashboard.securityScore}</p>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-2.5 py-2">
            <p className="font-mono text-[10px] tracking-[0.06em] text-slate-500">Critical</p>
            <p className="mt-1 text-base font-semibold text-white">
              {environment.events.filter((event) => event.severity === "critical").length}
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex justify-center px-1">
          <button
            onClick={onToggleCollapse}
            aria-label="Sol paneli genişlet"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#2f2f34] bg-[#1a1a1d] text-slate-300 transition hover:bg-[#222227]"
          >
            »
          </button>
        </div>
      )}

      <div className="hcsc-scrollbar mt-4 min-h-0 flex-1 overflow-y-auto px-1">
        <div className={cn("px-1 pb-2", collapsed && "text-center")}>
          <p className="font-mono text-[10px] font-medium tracking-[0.06em] text-slate-500">
            Workspace
          </p>
        </div>
        <nav className="space-y-1">{workspaceItems.map(renderItem)}</nav>

        <div className={cn("mt-5 px-1 pb-2", collapsed && "text-center")}>
          <p className="font-mono text-[10px] font-medium tracking-[0.06em] text-slate-500">
            System
          </p>
        </div>
        <nav className="space-y-1">{systemItems.map(renderItem)}</nav>
      </div>

      <div className={cn("mt-3 rounded-lg border border-violet-400/18 bg-violet-500/10 px-3 py-3", collapsed && "px-2 py-2 text-center")}>
        {!collapsed ? (
          <>
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-violet-200">
              Deception Watch
            </p>
            <p className="mt-2 text-[13px] leading-5 text-violet-100/85">
              {environment.deceptions.filter((entry) => entry.status === "triggered").length} deception
              varlığı alarm üretmiş durumda.
            </p>
            <div className="mt-3 flex items-center justify-between text-[11px] text-violet-100/75">
              <span>Demo Mode</span>
              <span>v0.1 prototype</span>
            </div>
            {onToggleCollapse ? (
              <button
                onClick={onToggleCollapse}
                className="mt-3 inline-flex h-8 w-full items-center justify-center rounded-md border border-violet-400/18 bg-black/10 text-xs text-violet-100/85 transition hover:bg-black/20"
                aria-label="Sol paneli daralt"
              >
                Paneli Daralt
              </button>
            ) : null}
          </>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <span className="text-violet-200">◈</span>
            <span className="font-mono text-[10px] text-violet-100/80">
              {environment.deceptions.filter((entry) => entry.status === "triggered").length}
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}
