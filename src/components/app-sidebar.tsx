"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BadgeCheckIcon,
  BookOpenIcon,
  DatabaseIcon,
  FileChartColumnIcon,
  FlaskConicalIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  NetworkIcon,
  PresentationIcon,
  RadarIcon,
  Settings2Icon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  ShieldIcon,
  SirenIcon,
  WaypointsIcon,
} from "lucide-react"

import { useDemo } from "@/components/layout/demo-provider"
import { Badge } from "@/components/ui/badge"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

const workspaceItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboardIcon },
  { title: "Cloud Map", href: "/cloud-map", icon: NetworkIcon },
  { title: "Data Assets", href: "/data-assets", icon: DatabaseIcon },
  { title: "Access Requests", href: "/access-requests", icon: ShieldCheckIcon },
  { title: "Policy Engine", href: "/policy-engine", icon: ShieldIcon },
  { title: "Deception", href: "/deception", icon: RadarIcon },
  { title: "Events", href: "/events", icon: SirenIcon },
  { title: "Compliance", href: "/compliance", icon: BadgeCheckIcon },
  { title: "Threat Matrix", href: "/threat-matrix", icon: WaypointsIcon },
  { title: "Reports", href: "/reports", icon: FileChartColumnIcon },
  { title: "Simulations", href: "/simulations", icon: FlaskConicalIcon },
  { title: "Presentation Mode", href: "/presentation", icon: PresentationIcon },
] as const

const systemItems = [
  { title: "Final Checklist", href: "/final-checklist", icon: ListChecksIcon },
  { title: "Settings", href: "/final-checklist", icon: Settings2Icon },
  { title: "Documentation", href: "/presentation", icon: BookOpenIcon },
] as const

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { environment, dashboard } = useDemo()
  const criticalCount = environment.events.filter((event) => event.severity === "critical").length
  const deceptionCount = environment.deceptions.filter((entry) => entry.status === "triggered").length

  return (
    <Sidebar collapsible="icon" variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              tooltip="Hybrid Cloud Security Console"
              className="rounded-xl border border-transparent bg-transparent group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:hover:bg-transparent"
            >
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-xl border border-sidebar-border/70 bg-sidebar-accent/40 text-primary shadow-[inset_0_0_0_1px_hsl(var(--sidebar-border)/0.35)] transition-colors group-hover/menu-button:bg-sidebar-accent/55 group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:shadow-none">
                  <ShieldAlertIcon className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Hybrid Cloud Security Console</span>
                  <span className="truncate text-xs text-muted-foreground">Active Defense Prototype</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {workspaceItems.map((item) => {
                const active = pathname === item.href || (pathname === "/" && item.href === "/dashboard")
                const badge =
                  item.href === "/events"
                    ? String(criticalCount)
                    : item.href === "/deception"
                      ? String(deceptionCount)
                      : null

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      className="group-data-[collapsible=icon]:rounded-xl"
                    >
                      <Link href={item.href}>
                        <span
                          className={cn(
                            "flex size-8 shrink-0 items-center justify-center rounded-xl border border-transparent text-sidebar-foreground/80 transition-all duration-200",
                            "group-data-[collapsible=icon]:rounded-xl group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:ring-0 group-data-[collapsible=icon]:shadow-none",
                            active
                              ? "group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:text-sidebar-accent-foreground"
                              : "group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:text-sidebar-foreground/72 group-data-[collapsible=icon]:hover:text-sidebar-accent-foreground"
                          )}
                        >
                          <item.icon />
                        </span>
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                    {badge ? <SidebarMenuBadge>{badge}</SidebarMenuBadge> : null}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemItems.map((item) => {
                const active = pathname === item.href

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      className="group-data-[collapsible=icon]:rounded-xl"
                    >
                      <Link href={item.href}>
                        <span
                          className={cn(
                            "flex size-8 shrink-0 items-center justify-center rounded-xl border border-transparent text-sidebar-foreground/80 transition-all duration-200",
                            "group-data-[collapsible=icon]:rounded-xl group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:ring-0 group-data-[collapsible=icon]:shadow-none",
                            active
                              ? "group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:text-sidebar-accent-foreground"
                              : "group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:text-sidebar-foreground/72 group-data-[collapsible=icon]:hover:text-sidebar-accent-foreground"
                          )}
                        >
                          <item.icon />
                        </span>
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="group-data-[collapsible=icon]:hidden rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-sidebar-foreground/80">Security Score</span>
            <Badge variant="outline">{dashboard.securityScore}/100</Badge>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div className="rounded-lg border border-sidebar-border bg-background/70 px-2 py-1.5">
              <div>Critical</div>
              <div className="mt-1 font-semibold text-foreground">{criticalCount}</div>
            </div>
            <div className="rounded-lg border border-sidebar-border bg-background/70 px-2 py-1.5">
              <div>Deception</div>
              <div className="mt-1 font-semibold text-foreground">{deceptionCount}</div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Prototype</span>
            <span>v0.1</span>
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
