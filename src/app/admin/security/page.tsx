import { AlertTriangleIcon, CheckCircle2Icon, DatabaseIcon, ShieldAlertIcon, ShieldCheckIcon } from "lucide-react";

import { SecuritySummaryCopy } from "@/components/admin/security-summary-copy";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminSecurityPosture } from "@/server/admin/admin-security";

export const dynamic = "force-dynamic";

function tone(status: string) {
  if (status === "critical") return "border-rose-500/30 text-rose-300";
  if (status === "warning") return "border-amber-500/30 text-amber-300";
  return "border-emerald-500/30 text-emerald-300";
}

export default async function AdminSecurityPage() {
  const security = await getAdminSecurityPosture();

  const overview = [
    ["Overall security score", `${security.overallScore}/100`],
    ["Admin access model", security.adminAccessModel],
    ["Auth protection", security.authProtection],
    ["2FA status", security.twoFactorStatus],
    ["API guard status", security.apiGuardStatus],
    ["Database protection", security.databaseProtectionStatus],
    ["Audit logging", security.auditLoggingStatus],
    ["Environment safety", security.environmentSafetyStatus],
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Security Posture</p>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Security</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            System-owner modeli, database koruması, env güvenliği ve audit kapsamı.
          </p>
        </div>
        <SecuritySummaryCopy summary={security.thesisSummary} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {overview.map(([label, value]) => (
          <Card key={label} size="sm">
            <CardHeader>
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-lg">{value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DatabaseIcon className="size-5 text-cyan-300" />
              Database Protection
            </CardTitle>
            <CardDescription>Sunum için teknik koruma özeti.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-7 text-[var(--text-secondary)]">{security.databaseProtection.summary}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {security.databaseProtection.controls.map((control) => (
                <div key={control} className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3 text-sm">
                  <CheckCircle2Icon className="size-4 shrink-0 text-emerald-300" />
                  {control}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Owner</CardTitle>
            <CardDescription>Root admin erişimi env kontrollü tekil owner modelinde.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Owner source</span>
              <Badge variant="outline">{security.owner.source}</Badge>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Owner found</span>
              <Badge variant="outline" className={security.owner.found ? "border-emerald-500/30 text-emerald-300" : "border-rose-500/30 text-rose-300"}>
                {security.owner.found ? "yes" : "no"}
              </Badge>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Owner 2FA</span>
              <Badge variant="outline" className={security.owner.mfaEnabled ? "border-emerald-500/30 text-emerald-300" : "border-amber-500/30 text-amber-300"}>
                {security.owner.mfaEnabled ? "enabled" : "missing"}
              </Badge>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Platform role</span>
              <Badge variant="outline">{security.owner.platformRole}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlertIcon className="size-5 text-cyan-300" />
            Risk Checks
          </CardTitle>
          <CardDescription>Production hazırlığında izlenmesi gereken güvenlik sinyalleri.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {security.riskChecks.map((check) => (
              <div key={check.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium">{check.label}</p>
                  <Badge variant="outline" className={tone(check.status)}>{check.status}</Badge>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{check.detail}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangleIcon className="size-5 text-amber-300" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {security.recommendations.map((item) => (
                <div key={item} className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3 text-sm">
                  {item}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheckIcon className="size-5 text-emerald-300" />
              Thesis Summary
            </CardTitle>
            <CardDescription>Copy butonu ile sunum metnine alınabilir.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-7 text-[var(--text-secondary)]">{security.thesisSummary}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
