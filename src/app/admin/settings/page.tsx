import { SettingsIcon } from "lucide-react";

import { AdminSettingsForm } from "@/components/admin/admin-settings-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getAdminSettings } from "@/server/admin/admin-service";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getAdminSettings();

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Configuration</p>
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Settings</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Uygulama adı, bakım modu, kayıt politikası ve admin iletişim bilgisi.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Application Settings</CardTitle>
          <CardDescription>Key-value AppSetting modeli üzerinden güvenli şekilde saklanır.</CardDescription>
        </CardHeader>
        <CardContent>
          {settings ? (
            <AdminSettingsForm settings={settings} />
          ) : (
            <EmptyState
              icon={<SettingsIcon className="size-5" />}
              title="Ayarlar yüklenemedi"
              description="AppSetting kayıtları oluştuğunda bu form otomatik beslenecek."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
