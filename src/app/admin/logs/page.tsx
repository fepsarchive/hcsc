import { LogsIcon } from "lucide-react";

import { AdminLogsTable } from "@/components/admin/admin-logs-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getAdminLogs } from "@/server/admin/admin-service";

export const dynamic = "force-dynamic";

export default async function AdminLogsPage() {
  const logs = await getAdminLogs();

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Audit Trail</p>
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Logs</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Kimlik, admin, karar ve sistem olaylarının denetlenebilir izi.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Audit Logs</CardTitle>
          <CardDescription>Action, user, timestamp, status, source ve error alanları.</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length ? (
            <AdminLogsTable logs={logs} />
          ) : (
            <EmptyState
              icon={<LogsIcon className="size-5" />}
              title="Log bulunamadı"
              description="Audit log kayıtları oluştukça bu listede görünecek."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
