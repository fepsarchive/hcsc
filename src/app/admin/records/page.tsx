import { DatabaseIcon } from "lucide-react";

import { AdminRecordsTable } from "@/components/admin/admin-records-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getAdminRecords } from "@/server/admin/admin-service";

export const dynamic = "force-dynamic";

export default async function AdminRecordsPage() {
  const records = await getAdminRecords();
  const stats = Array.from(
    records.reduce((map, record) => map.set(record.type, (map.get(record.type) ?? 0) + 1), new Map<string, number>()),
  );

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Data Operations</p>
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Records</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Asset, event ve report snapshot kayıtlarının birleşik admin görünümü.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card size="sm">
          <CardHeader>
            <CardDescription>Total records</CardDescription>
            <CardTitle className="text-2xl">{records.length}</CardTitle>
          </CardHeader>
        </Card>
        {stats.slice(0, 3).map(([type, count]) => (
          <Card key={type} size="sm">
            <CardHeader>
              <CardDescription>{type}</CardDescription>
              <CardTitle className="text-2xl">{count}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Primary Records</CardTitle>
          <CardDescription>İleride yeni entity tipleri aynı listeleme yapısına bağlanabilir.</CardDescription>
        </CardHeader>
        <CardContent>
          {records.length ? (
            <AdminRecordsTable records={records} />
          ) : (
            <EmptyState
              icon={<DatabaseIcon className="size-5" />}
              title="Kayıt bulunamadı"
              description="Asset, event veya report verisi oluştuğunda bu admin listesinde görünecek."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
