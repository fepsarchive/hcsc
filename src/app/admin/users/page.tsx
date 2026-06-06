import { UsersIcon } from "lucide-react";

import { AdminUsersTable } from "@/components/admin/admin-users-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdminPageSession } from "@/server/admin/admin-auth";
import { getAdminUsers } from "@/server/admin/admin-service";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireAdminPageSession();
  const { q = "" } = await searchParams;
  const users = await getAdminUsers(q);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Identity Administration</p>
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Users</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Platform ADMIN/USER yetkileri ve aktif/pasif hesap durumu.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>Admin aksiyonları server-side guard ve audit log ile korunur.</CardDescription>
        </CardHeader>
        <CardContent>
          {users.length ? (
            <AdminUsersTable users={users} currentUserId={session.userId} query={q} />
          ) : (
            <EmptyState
              icon={<UsersIcon className="size-5" />}
              title="Kullanıcı bulunamadı"
              description="Arama kriterini değiştir veya seed verisinin yüklü olduğundan emin ol."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
