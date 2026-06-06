import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, ClockIcon, ShieldCheckIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAdminUserDetail } from "@/server/admin/admin-service";

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getAdminUserDetail(id);

  if (!detail) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
            <Link href="/admin/users">
              <ArrowLeftIcon />
              Users
            </Link>
          </Button>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">{detail.user.name}</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{detail.user.email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{detail.user.productRole}</Badge>
          <Badge variant="outline" className="border-cyan-500/30 text-cyan-300">{detail.user.platformRole}</Badge>
          <Badge
            variant="outline"
            className={detail.user.status === "active" ? "border-emerald-500/30 text-emerald-300" : "border-amber-500/30 text-amber-300"}
          >
            {detail.user.status}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Temel hesap ve organizasyon bilgisi.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Department</span>
              <span>{detail.user.department ?? "Security"}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Organization</span>
              <span>{detail.user.organizationName ?? "No organization"}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Created</span>
              <span>{formatDate(detail.user.createdAt)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Last login</span>
              <span>{detail.user.lastLoginAt ? formatDate(detail.user.lastLoginAt) : "Never"}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Memberships</CardTitle>
            <CardDescription>Organization-scoped ürün rolleri.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.memberships.map((membership) => (
                  <TableRow key={membership.id}>
                    <TableCell>{membership.organizationName}</TableCell>
                    <TableCell><Badge variant="outline">{membership.role}</Badge></TableCell>
                    <TableCell>{formatDate(membership.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Sessions</CardTitle>
            <CardDescription>Son oturum hareketleri.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {detail.sessions.map((session) => (
                <div key={session.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant="outline">{session.status}</Badge>
                    <span className="text-xs text-muted-foreground">{formatDate(session.lastSeenAt)}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <ShieldCheckIcon className="size-3.5" />
                    2FA {session.twoFactorVerified ? "verified" : "pending"} / {session.ipAddress ?? "unknown ip"}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Audit</CardTitle>
            <CardDescription>Bu kullanıcıya ait son audit kayıtları.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {detail.auditLogs.map((log) => (
                <div key={log.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{log.action}</p>
                    <Badge variant="outline">{log.result}</Badge>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <ClockIcon className="size-3.5" />
                    {log.target} / {formatDate(log.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
