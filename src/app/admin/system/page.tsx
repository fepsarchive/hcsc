import { ActivityIcon, DatabaseIcon, HardDriveIcon, KeyRoundIcon, ServerIcon, ShieldCheckIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminSystemHealth } from "@/server/admin/admin-service";

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(value));
}

export default async function AdminSystemPage() {
  const health = await getAdminSystemHealth();
  const checks = [
    {
      label: "Database status",
      status: health.database.status,
      detail: `${health.database.latencyMs}ms query latency`,
      icon: DatabaseIcon,
    },
    {
      label: "API status",
      status: health.api.status,
      detail: health.api.message,
      icon: ServerIcon,
    },
    {
      label: "Auth status",
      status: health.auth.status,
      detail: health.auth.message,
      icon: KeyRoundIcon,
    },
    {
      label: "Storage status",
      status: health.storage.status,
      detail: health.storage.message,
      icon: HardDriveIcon,
    },
    {
      label: "Prisma status",
      status: health.prisma.status,
      detail: health.prisma.message,
      icon: ShieldCheckIcon,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Operations</p>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">System Health</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Canlı health check endpoint’i: GET /api/admin/system-health
          </p>
        </div>
        <Badge variant="outline">{health.environment}</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {checks.map((check) => (
          <Card key={check.label} size="sm">
            <CardHeader className="grid-cols-[1fr_auto]">
              <div>
                <CardDescription>{check.label}</CardDescription>
                <CardTitle className="mt-2 capitalize">{check.status}</CardTitle>
              </div>
              <div className="flex size-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] text-cyan-300">
                <check.icon className="size-5" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs leading-5 text-[var(--text-muted)]">{check.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Runtime</CardTitle>
          <CardDescription>Deployment ve çalışma zamanı bilgileri.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3">
              <div className="text-muted-foreground">Health score</div>
              <div className="mt-1 font-medium">{health.healthScore}/100</div>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3">
              <div className="text-muted-foreground">Response time</div>
              <div className="mt-1 font-medium">{health.responseTimeMs}ms</div>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3">
              <div className="text-muted-foreground">Application</div>
              <div className="mt-1 font-medium">{health.applicationName}</div>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3">
              <div className="text-muted-foreground">Last checked</div>
              <div className="mt-1 font-medium">{formatDate(health.lastChecked)}</div>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3">
              <div className="text-muted-foreground">Uptime</div>
              <div className="mt-1 font-medium">{health.uptimeSeconds}s</div>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3">
              <div className="text-muted-foreground">Build</div>
              <div className="mt-1 flex items-center gap-2 font-medium">
                <ActivityIcon className="size-4 text-cyan-300" />
                {health.buildInfo}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Required Environment</CardTitle>
          <CardDescription>Secret değerleri gösterilmez; sadece configured veya missing durumu görünür.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {health.envChecks.map((check) => (
              <div key={check.key} className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3">
                <div className="truncate text-sm font-medium">{check.key}</div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <Badge
                    variant="outline"
                    className={check.configured ? "border-emerald-500/30 text-emerald-300" : "border-amber-500/30 text-amber-300"}
                  >
                    {check.configured ? "configured" : "missing"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{check.required ? "required" : "optional"}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
