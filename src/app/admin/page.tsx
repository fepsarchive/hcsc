import {
  AlertTriangleIcon,
  ActivityIcon,
  DatabaseIcon,
  HeartPulseIcon,
  KeyRoundIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "lucide-react";

import { AdminOverviewCharts } from "@/components/admin/admin-overview-charts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAdminOverviewData } from "@/server/admin/admin-service";

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function AdminOverviewPage() {
  const overview = await getAdminOverviewData();
  const cards = [
    { label: "Total Users", value: overview.totalUsers, icon: UsersIcon, detail: "Registered platform accounts" },
    { label: "Active Users", value: overview.activeUsers, icon: ShieldCheckIcon, detail: "Currently enabled accounts" },
    { label: "New Users Today", value: overview.newUsersToday, icon: UsersIcon, detail: "Created since local midnight" },
    { label: "Total Records", value: overview.totalRecords, icon: DatabaseIcon, detail: "Primary data asset records" },
    { label: "Today Activity", value: overview.todayActivity, icon: ActivityIcon, detail: "Audit events since midnight" },
    { label: "Failed Logins", value: overview.failedLoginAttempts, icon: AlertTriangleIcon, detail: "Authentication failures today" },
    { label: "Admin Actions", value: overview.adminActions, icon: KeyRoundIcon, detail: "System-owner actions today" },
    { label: "Health Score", value: overview.healthScore, icon: HeartPulseIcon, detail: "Computed operational readiness" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Platform Admin</p>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Overview</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Kullanıcılar, kayıt hacmi, audit aktivitesi ve sistem durumu.
          </p>
        </div>
        <Badge variant="outline" className="w-fit border-emerald-500/30 text-emerald-300">
          {overview.systemStatus}
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label} size="sm">
            <CardHeader className="grid-cols-[1fr_auto]">
              <div>
                <CardDescription>{card.label}</CardDescription>
                <CardTitle className="mt-2 text-2xl">{card.value}</CardTitle>
              </div>
              <div className="flex size-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] text-cyan-300">
                <card.icon className="size-5" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-[var(--text-muted)]">{card.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <AdminOverviewCharts
        userGrowth={overview.charts.userGrowth}
        activity={overview.charts.activity}
        recordsByStatus={overview.charts.recordsByStatus}
        authEvents={overview.charts.authEvents}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Risk / Security Snapshot</CardTitle>
            <CardDescription>Admin access mode, env readiness ve son güvenlik sinyalleri.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3">
                <div className="text-xs text-muted-foreground">Admin access mode</div>
                <div className="mt-1 font-medium">{overview.health.accessMode.mode}</div>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3">
                <div className="text-xs text-muted-foreground">Passive users</div>
                <div className="mt-1 font-medium">{overview.lockedUsers}</div>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3">
                <div className="text-xs text-muted-foreground">Missing env warnings</div>
                <div className="mt-1 font-medium">{overview.health.warnings.length}</div>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3">
                <div className="text-xs text-muted-foreground">Last security scan</div>
                <div className="mt-1 font-medium">{formatDate(overview.health.lastChecked)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Canlı operasyon durumu.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              ["Database", overview.health.database.status],
              ["API", overview.health.api.status],
              ["Auth", overview.health.auth.status],
              ["Storage", overview.health.storage.status],
              ["Environment", overview.health.environment],
              ["Build", overview.health.buildInfo],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">{label}</span>
                <Badge variant="outline">{value}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
            <CardDescription>Son admin, auth ve ürün audit olayları.</CardDescription>
          </CardHeader>
          <CardContent>
            {overview.recentActivities.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.recentActivities.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell>
                        <div className="font-medium">{activity.action}</div>
                        <div className="text-xs text-muted-foreground">{activity.module} / {activity.target}</div>
                      </TableCell>
                      <TableCell>{activity.actorName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{activity.result}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(activity.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                title="Aktivite bulunamadı"
                description="Audit log oluştuğunda son aktiviteler burada listelenecek."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Errors</CardTitle>
            <CardDescription>Failure, blocked veya yüksek önem seviyeli son kayıtlar.</CardDescription>
          </CardHeader>
          <CardContent>
            {overview.recentErrors.length ? (
              <div className="space-y-3">
                {overview.recentErrors.map((error) => (
                  <div key={error.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--text-primary)]">{error.action}</p>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--text-secondary)]">{error.details}</p>
                      </div>
                      <Badge variant="outline" className="shrink-0 border-amber-500/30 text-amber-300">
                        {error.result}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                      <AlertTriangleIcon className="size-3.5" />
                      {error.actorName} / {formatDate(error.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<ShieldCheckIcon className="size-5" />}
                title="Hata yok"
                description="Son failure veya blocked audit kaydı bulunmuyor."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Operational Control</CardTitle>
          <CardDescription>
            HCSC admin console provides centralized visibility over users, records, system health, audit events, and security posture.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
