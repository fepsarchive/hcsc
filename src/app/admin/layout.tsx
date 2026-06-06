import { AdminShell } from "@/components/admin/admin-shell";
import { getAdminAccessMode, requireSystemOwnerPageSession } from "@/server/admin/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSystemOwnerPageSession();
  const accessMode = getAdminAccessMode();

  return (
    <AdminShell
      user={{
        name: session.user.name,
        email: session.user.email,
        avatarInitials: session.user.avatarInitials,
      }}
      accessMode={accessMode}
    >
      {children}
    </AdminShell>
  );
}
