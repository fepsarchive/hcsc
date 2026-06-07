"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ActivityIcon,
  ArrowLeftIcon,
  DatabaseIcon,
  HeartPulseIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  LogsIcon,
  SettingsIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { TooltipProvider } from "@/components/ui/tooltip";

type AdminShellUser = {
  name: string;
  email: string;
  avatarInitials?: string | null;
};

type AdminAccessMode = {
  mode: string;
  ownerSource: string;
  envConfigured: boolean;
};

const navItems = [
  { title: "Overview", href: "/admin", icon: LayoutDashboardIcon },
  { title: "Users", href: "/admin/users", icon: UsersIcon },
  { title: "Records", href: "/admin/records", icon: DatabaseIcon },
  { title: "Logs", href: "/admin/logs", icon: LogsIcon },
  { title: "System Health", href: "/admin/system", icon: HeartPulseIcon },
  { title: "Security", href: "/admin/security", icon: ShieldAlertIcon },
  { title: "Settings", href: "/admin/settings", icon: SettingsIcon },
] as const;

function initialsFromName(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function AdminShell({
  children,
  user,
  accessMode,
}: {
  children: React.ReactNode;
  user: AdminShellUser;
  accessMode: AdminAccessMode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const initials = user.avatarInitials || initialsFromName(user.name);

  async function logout() {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    }).catch(() => null);
    router.replace("/login");
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
        <Sidebar collapsible="icon" variant="inset">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  size="lg"
                  tooltip="HCSC.space Admin"
                  className="rounded-xl"
                >
                  <Link href="/admin">
                    <div className="flex aspect-square size-8 items-center justify-center rounded-xl text-primary">
                      <ShieldCheckIcon className="size-4" />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">HCSC.space</span>
                      <span className="truncate text-xs text-muted-foreground">Admin Console</span>
                    </div>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Administration</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => {
                    const active = item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);

                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                          <Link href={item.href}>
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl text-sidebar-foreground/80">
                              <item.icon />
                            </span>
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="mt-auto">
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Back to App">
                      <Link href="/dashboard">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl text-sidebar-foreground/80">
                          <ArrowLeftIcon />
                        </span>
                        <span>Back to App</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter>
            <div className="group-data-[collapsible=icon]:hidden rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-3">
              <div className="flex items-center gap-3">
                <Avatar className="size-9">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-sidebar-foreground">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => void logout()}>
                <LogOutIcon />
                Logout
              </Button>
            </div>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        <SidebarInset className="h-svh min-h-svh overflow-hidden">
          <header className="sticky top-0 z-20 flex h-(--header-height) shrink-0 items-center border-b bg-background/95 backdrop-blur">
            <div className="flex w-full items-center gap-3 px-4 lg:px-6">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="data-[orientation=vertical]:h-4" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <ActivityIcon className="size-4 text-cyan-300" />
                  <h1 className="truncate text-sm font-semibold">Admin Console</h1>
                </div>
                <p className="truncate text-xs text-muted-foreground">Platform operations, users, logs, health and security</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Badge variant="outline" className="hidden border-cyan-500/30 text-cyan-300 sm:inline-flex">
                  System Owner
                </Badge>
                <Badge variant="outline" className="hidden lg:inline-flex">
                  {accessMode.envConfigured ? accessMode.ownerSource : "seed fallback"}
                </Badge>
                <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
                  <Link href="/dashboard">
                    <ArrowLeftIcon />
                    Back to App
                  </Link>
                </Button>
              </div>
            </div>
          </header>
          <main className="hcsc-scrollbar min-h-0 min-w-0 flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
            <div className="@container/main flex min-h-0 min-w-0 flex-1 flex-col gap-4 px-3 py-3 lg:px-4 lg:py-4">
              {children}
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
