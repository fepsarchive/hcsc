"use client";

import { type ReactNode, useMemo, useState } from "react";
import {
  BellRingIcon,
  BlocksIcon,
  Building2Icon,
  LifeBuoyIcon,
  Paintbrush2Icon,
  ShieldCheckIcon,
  UserCircle2Icon,
  Users2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { useDemo } from "@/components/layout/demo-provider";
import { AvatarToken } from "@/components/ui/avatar-token";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Panel } from "@/components/ui/panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { getAvailableMockAuthAccounts } from "@/lib/demo-auth-storage";
import { rolePermissions } from "@/lib/permissions";

const SETTINGS_PREFERENCES_KEY = "hcsc-settings-preferences";

type WorkspacePreferences = {
  displayName: string;
  title: string;
  locale: string;
  timezone: string;
  emailAlerts: boolean;
  inAppAlerts: boolean;
  criticalOnly: boolean;
  digestFrequency: "instant" | "hourly" | "daily";
  sessionTimeout: "30m" | "4h" | "8h";
  trustedDevicePrompt: boolean;
  stepUpOnPrivilegedActions: boolean;
  supportChannel: "email" | "slack" | "teams";
  themeDensity: "comfortable" | "compact";
  reducedMotion: boolean;
  accentMode: "system" | "cyan" | "emerald";
};

const defaultWorkspacePreferences: WorkspacePreferences = {
  displayName: "",
  title: "Platform Owner",
  locale: "tr-TR",
  timezone: "Europe/Istanbul",
  emailAlerts: true,
  inAppAlerts: true,
  criticalOnly: false,
  digestFrequency: "instant",
  sessionTimeout: "4h",
  trustedDevicePrompt: true,
  stepUpOnPrivilegedActions: true,
  supportChannel: "email",
  themeDensity: "comfortable",
  reducedMotion: false,
  accentMode: "system",
};

function getStoredWorkspacePreferences(displayName?: string): WorkspacePreferences {
  const fallback = {
    ...defaultWorkspacePreferences,
    displayName: displayName ?? "",
  };

  if (typeof window === "undefined") {
    return fallback;
  }

  const raw = window.localStorage.getItem(SETTINGS_PREFERENCES_KEY);

  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<WorkspacePreferences>;

    return {
      ...defaultWorkspacePreferences,
      ...parsed,
      displayName: parsed.displayName ?? displayName ?? "",
    };
  } catch {
    return fallback;
  }
}

export function SettingsView() {
  const {
    currentUser,
    currentOrganization,
    auth,
    can,
    settingsBundle,
    operationLoading,
    updateRiskPolicy,
    updateReportBranding,
    updateOrganizationSettings,
  } = useDemo();

  const canManageSettings = can("manage_settings");
  const isSaving = Boolean(operationLoading.settings);
  const [workspacePreferences, setWorkspacePreferences] = useState<WorkspacePreferences>(() =>
    getStoredWorkspacePreferences(currentUser?.name),
  );
  const normalizedConfidentialityLabel =
    settingsBundle?.reportBranding?.confidentialityLabel === "Internal / Thesis Prototype"
      ? "Internal / Confidential"
      : settingsBundle?.reportBranding?.confidentialityLabel;
  const teamMembers = useMemo(() => {
    const members = getAvailableMockAuthAccounts();

    if (members.length > 0) {
      return members;
    }

    if (!currentUser) {
      return [];
    }

    return [
      {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
        department: currentUser.department,
        status: currentUser.status,
      },
    ];
  }, [currentUser]);
  const effectiveWorkspacePreferences = useMemo(
    () => ({
      ...workspacePreferences,
      displayName: workspacePreferences.displayName || currentUser?.name || "",
    }),
    [currentUser?.name, workspacePreferences],
  );

  const persistWorkspacePreferences = (next: WorkspacePreferences, message: string) => {
    setWorkspacePreferences(next);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(SETTINGS_PREFERENCES_KEY, JSON.stringify(next));
    }

    toast.success(message);
  };

  const organizationInitial = useMemo(
    () => ({
      name: settingsBundle?.organization.name ?? currentOrganization.name,
      plan: settingsBundle?.organization.plan ?? currentOrganization.plan,
      region: settingsBundle?.organization.region ?? currentOrganization.region,
      cloudMode: settingsBundle?.organizationSettings?.cloudMode ?? "hybrid_cloud",
      complianceFrameworks: (
        settingsBundle?.organizationSettings?.complianceFrameworks ??
        settingsBundle?.organization.complianceFrameworks ??
        currentOrganization.complianceFrameworks
      ).join(", "),
    }),
    [
      currentOrganization.complianceFrameworks,
      currentOrganization.name,
      currentOrganization.plan,
      currentOrganization.region,
      settingsBundle,
    ],
  );
  const riskPolicyInitial = useMemo(
    () => ({
      criticalClassificationWeight: settingsBundle?.riskPolicy?.criticalClassificationWeight ?? 24,
      missingEncryptionWeight: settingsBundle?.riskPolicy?.missingEncryptionWeight ?? 18,
      publicCloudSensitiveWeight: settingsBundle?.riskPolicy?.publicCloudSensitiveWeight ?? 16,
      missingBackupWeight: settingsBundle?.riskPolicy?.missingBackupWeight ?? 10,
      noKmsWeight: settingsBundle?.riskPolicy?.noKmsWeight ?? 12,
      openCriticalEventWeight: settingsBundle?.riskPolicy?.openCriticalEventWeight ?? 14,
      deceptionTriggerWeight: settingsBundle?.riskPolicy?.deceptionTriggerWeight ?? 20,
    }),
    [settingsBundle],
  );
  const brandingInitial = useMemo(
    () => ({
      companyName: settingsBundle?.reportBranding?.companyName ?? currentOrganization.name,
      reportFooter:
        settingsBundle?.reportBranding?.reportFooter ?? "Generated by Hybrid Cloud Security Console",
      preparedByLabel: settingsBundle?.reportBranding?.preparedByLabel ?? "Prepared by HCSC",
      confidentialityLabel:
        normalizedConfidentialityLabel ?? "Internal / Confidential",
    }),
    [currentOrganization.name, normalizedConfidentialityLabel, settingsBundle],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Workspace Settings"
        title="Ayarlar ve çalışma alanı yapılandırması"
        description="Profil, organizasyon, güvenlik tercihleri ve rapor görünümü tek yerden yönetilir. Henüz merkezi servise bağlanmayan alanlar yerel çalışma alanı tercihleri olarak güvenle korunur."
        actions={
          <>
            <Badge variant="outline">{canManageSettings ? "Security Admin" : "Read only"}</Badge>
            <Badge variant="outline">{auth.is2FAVerified ? "2FA active" : "2FA pending"}</Badge>
          </>
        }
      />

      {!canManageSettings ? (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-4 text-sm leading-6 text-amber-200">
          Bu alanı düzenlemek için <span className="font-semibold">Security Admin</span> rolü gerekir. Aşağıdaki
          paneller görünür kalır, ancak değişiklikler kaydedilemez.
        </div>
      ) : null}

      <Tabs defaultValue="profile" className="gap-4">
        <TabsList variant="line" className="flex w-full flex-wrap justify-start gap-2 overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2">
          <TabsTrigger value="profile">Profil</TabsTrigger>
          <TabsTrigger value="workspace">İşletme</TabsTrigger>
          <TabsTrigger value="security">Güvenlik</TabsTrigger>
          <TabsTrigger value="experience">Tema ve bildirimler</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[0.95fr,1.05fr]">
            <Panel>
              <SectionHeader icon={<UserCircle2Icon className="size-5 text-[var(--text-secondary)]" />} eyebrow="Profile" title={currentUser?.name ?? "Kullanıcı profili"} description="Temel oturum ve hesap görünürlüğü." />
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Metric label="E-posta" value={currentUser?.email ?? "—"} />
                <Metric label="Rol" value={currentUser?.role ?? "—"} />
                <Metric label="Departman" value={currentUser?.department ?? "—"} />
                <Metric label="Son giriş" value={auth.lastLoginAt ?? "—"} />
              </div>
              <ProfileWorkspaceEditor
                key={JSON.stringify(effectiveWorkspacePreferences)}
                className="mt-5"
                value={effectiveWorkspacePreferences}
                disabled={!canManageSettings}
                onSave={(next) => persistWorkspacePreferences(next, "Profil tercihleri güncellendi.")}
              />
            </Panel>

            <Panel>
              <SectionHeader icon={<Users2Icon className="size-5 text-cyan-300" />} eyebrow="Users & Roles" title="Kullanıcılar ve roller" description="Mevcut çalışma alanı üyeleri, rol kapsamı ve erişim çerçevesi burada görünür." />
              <TeamAccessOverview className="mt-5" members={teamMembers} />
            </Panel>
          </div>
        </TabsContent>

        <TabsContent value="workspace" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[1.02fr,0.98fr]">
            <Panel>
              <SectionHeader icon={<Building2Icon className="size-5 text-cyan-300" />} eyebrow="Organization" title={currentOrganization.name} description="İşletme bilgileri, bulut modu ve compliance çerçeveleri." />
              <OrganizationEditor
                key={JSON.stringify(organizationInitial)}
                initial={organizationInitial}
                isSaving={isSaving}
                disabled={!canManageSettings}
                onSave={updateOrganizationSettings}
              />
            </Panel>

            <div className="grid gap-4">
              <Panel>
                <SectionHeader icon={<BlocksIcon className="size-5 text-[var(--text-secondary)]" />} eyebrow="Report Branding" title="Rapor görünümü" description="Kapak, hazırlayan etiketi ve gizlilik alt bilgisini düzenle." />
                <ReportBrandingEditor
                  key={JSON.stringify(brandingInitial)}
                  initial={brandingInitial}
                  isSaving={isSaving}
                  disabled={!canManageSettings}
                  onSave={updateReportBranding}
                />
              </Panel>

              <Panel>
                <SectionHeader icon={<BlocksIcon className="size-5 text-[var(--text-secondary)]" />} eyebrow="API & Integrations" title="API ve entegrasyonlar" description="Hazır bağlantı yüzeyleri, erişim modeli ve devreye alma sırası burada yönetilir." />
                <IntegrationWorkbench className="mt-5" />
              </Panel>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[1fr,1fr]">
            <Panel>
              <SectionHeader icon={<ShieldCheckIcon className="size-5 text-cyan-300" />} eyebrow="Security" title="Oturum ve güvenlik" description="2FA, MFA ve varsayılan koruma görünürlüğü." />
              <div className="mt-5 flex flex-wrap gap-2">
                <Badge variant="outline">{auth.isAuthenticated ? "Authenticated" : "Signed out"}</Badge>
                <Badge variant="outline">{auth.is2FAVerified ? "2FA verified" : "2FA pending"}</Badge>
                <Badge variant="outline">{currentUser?.mfaEnabled ? "MFA enabled" : "MFA disabled"}</Badge>
              </div>
              <SecurityPreferencesEditor
                key={`security-${JSON.stringify(effectiveWorkspacePreferences)}`}
                className="mt-5"
                value={effectiveWorkspacePreferences}
                disabled={!canManageSettings}
                onSave={(next) => persistWorkspacePreferences(next, "Güvenlik tercihleri güncellendi.")}
              />
            </Panel>

            <Panel>
              <SectionHeader icon={<ShieldCheckIcon className="size-5 text-[var(--text-secondary)]" />} eyebrow="Risk Policy" title="Risk ağırlıkları" description="Backend risk engine’in kullandığı temel skor ağırlıkları." />
              <RiskPolicyEditor
                key={JSON.stringify(riskPolicyInitial)}
                initial={riskPolicyInitial}
                isSaving={isSaving}
                disabled={!canManageSettings}
                onSave={updateRiskPolicy}
              />
            </Panel>
          </div>
        </TabsContent>

        <TabsContent value="experience" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[0.95fr,1.05fr]">
            <Panel>
              <SectionHeader icon={<BellRingIcon className="size-5 text-cyan-300" />} eyebrow="Notifications" title="Bildirim tercihleri" description="Bildirim merkezi canlı, teslimat ve özet tercihleri burada yönetilir." />
              <NotificationPreferencesEditor
                key={`notifications-${JSON.stringify(effectiveWorkspacePreferences)}`}
                className="mt-5"
                value={effectiveWorkspacePreferences}
                disabled={!canManageSettings}
                onSave={(next) => persistWorkspacePreferences(next, "Bildirim tercihleri güncellendi.")}
              />
            </Panel>

            <Panel>
              <SectionHeader icon={<Paintbrush2Icon className="size-5 text-[var(--text-secondary)]" />} eyebrow="Appearance" title="Tema ve görünüm" description="Görsel yoğunluk, hareket ve destek kanalı tercihleri yerel olarak korunur." />
              <AppearancePreferencesEditor
                key={`appearance-${JSON.stringify(effectiveWorkspacePreferences)}`}
                className="mt-5"
                value={effectiveWorkspacePreferences}
                disabled={!canManageSettings}
                onSave={(next) => persistWorkspacePreferences(next, "Görünüm tercihleri güncellendi.")}
              />
            </Panel>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SectionHeader({
  icon,
  eyebrow,
  title,
  description,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-11 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">{eyebrow}</p>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</p>
      {children}
    </label>
  );
}

function ProfileWorkspaceEditor({
  value,
  disabled,
  onSave,
  className,
}: {
  value: WorkspacePreferences;
  disabled: boolean;
  onSave: (next: WorkspacePreferences) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState(value);

  return (
    <div className={`space-y-4 ${className ?? ""}`}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Görünen ad">
          <Input disabled={disabled} className="h-11 rounded-xl px-3.5" value={draft.displayName} onChange={(event) => setDraft((current) => ({ ...current, displayName: event.target.value }))} />
        </Field>
        <Field label="Unvan">
          <Input disabled={disabled} className="h-11 rounded-xl px-3.5" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Dil / locale">
          <Select disabled={disabled} value={draft.locale} onValueChange={(value) => setDraft((current) => ({ ...current, locale: value }))}>
            <SelectTrigger className="h-11 w-full rounded-xl px-3.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tr-TR">Türkçe (TR)</SelectItem>
              <SelectItem value="en-US">English (US)</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Saat dilimi">
          <Select disabled={disabled} value={draft.timezone} onValueChange={(value) => setDraft((current) => ({ ...current, timezone: value }))}>
            <SelectTrigger className="h-11 w-full rounded-xl px-3.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Europe/Istanbul">Europe/Istanbul</SelectItem>
              <SelectItem value="Europe/London">Europe/London</SelectItem>
              <SelectItem value="America/New_York">America/New_York</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
      <div className="flex justify-end">
        <Button disabled={disabled} onClick={() => onSave(draft)}>
          Profil tercihlerini kaydet
        </Button>
      </div>
    </div>
  );
}

function TeamAccessOverview({
  members,
  className,
}: {
  members: Array<{
    id: string;
    name: string;
    email: string;
    role: keyof typeof rolePermissions;
    department: string;
    status: string;
  }>;
  className?: string;
}) {
  return (
    <div className={`space-y-4 ${className ?? ""}`}>
      <div className="grid gap-3">
        {members.map((member) => (
          <div key={member.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <AvatarToken label={member.name} subtitle={`${member.email} • ${member.department}`} />
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{member.role}</Badge>
                <Badge variant="outline">{member.status}</Badge>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {rolePermissions[member.role].slice(0, 6).map((permission) => (
                <Badge key={permission} variant="outline">
                  {permission}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Takım daveti akışı</p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Çoklu kullanıcı ve rol yönetimi altyapısı hazır. Sonraki adımda davet, üyelik ve self-service provisioning akışı eklenebilir.
            </p>
          </div>
          <Badge variant="outline">Hazır</Badge>
        </div>
      </div>
    </div>
  );
}

function SecurityPreferencesEditor({
  value,
  disabled,
  onSave,
  className,
}: {
  value: WorkspacePreferences;
  disabled: boolean;
  onSave: (next: WorkspacePreferences) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState(value);

  return (
    <div className={`space-y-4 ${className ?? ""}`}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Session timeout">
          <Select disabled={disabled} value={draft.sessionTimeout} onValueChange={(value) => setDraft((current) => ({ ...current, sessionTimeout: value as WorkspacePreferences["sessionTimeout"] }))}>
            <SelectTrigger className="h-11 w-full rounded-xl px-3.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30m">30 dakika</SelectItem>
              <SelectItem value="4h">4 saat</SelectItem>
              <SelectItem value="8h">8 saat</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Destek kanalı">
          <Select disabled={disabled} value={draft.supportChannel} onValueChange={(value) => setDraft((current) => ({ ...current, supportChannel: value as WorkspacePreferences["supportChannel"] }))}>
            <SelectTrigger className="h-11 w-full rounded-xl px-3.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email">E-posta</SelectItem>
              <SelectItem value="slack">Slack</SelectItem>
              <SelectItem value="teams">Teams</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
      <PreferenceChecklist
        items={[
          {
            key: "trustedDevicePrompt",
            title: "Güvenilir cihaz onayı iste",
            description: "Yeni cihazlarda ek güven doğrulaması göster.",
          },
          {
            key: "stepUpOnPrivilegedActions",
            title: "Yetkili aksiyonlarda step-up auth zorunlu olsun",
            description: "Yüksek etkili işlemler için ikinci doğrulama iste.",
          },
        ]}
        draft={draft}
        disabled={disabled}
        onToggle={(key, checked) => setDraft((current) => ({ ...current, [key]: checked }))}
      />
      <div className="flex justify-end">
        <Button disabled={disabled} onClick={() => onSave(draft)}>
          Güvenlik tercihlerini kaydet
        </Button>
      </div>
    </div>
  );
}

function NotificationPreferencesEditor({
  value,
  disabled,
  onSave,
  className,
}: {
  value: WorkspacePreferences;
  disabled: boolean;
  onSave: (next: WorkspacePreferences) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState(value);

  return (
    <div className={`space-y-4 ${className ?? ""}`}>
      <Field label="Özet sıklığı">
        <Select disabled={disabled} value={draft.digestFrequency} onValueChange={(value) => setDraft((current) => ({ ...current, digestFrequency: value as WorkspacePreferences["digestFrequency"] }))}>
          <SelectTrigger className="h-11 w-full rounded-xl px-3.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="instant">Anlık</SelectItem>
            <SelectItem value="hourly">Saatlik</SelectItem>
            <SelectItem value="daily">Günlük</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <PreferenceChecklist
        items={[
          { key: "emailAlerts", title: "E-posta uyarıları", description: "Kritik olayları ve raporları e-posta ile ilet." },
          { key: "inAppAlerts", title: "Uygulama içi bildirimler", description: "Bildirim merkezinde anlık görünürlük sağla." },
          { key: "criticalOnly", title: "Yalnızca kritik olaylar", description: "Düşük öncelikli bildirimleri özetten çıkar." },
        ]}
        draft={draft}
        disabled={disabled}
        onToggle={(key, checked) => setDraft((current) => ({ ...current, [key]: checked }))}
      />
      <div className="flex justify-end">
        <Button disabled={disabled} onClick={() => onSave(draft)}>
          Bildirim tercihlerini kaydet
        </Button>
      </div>
    </div>
  );
}

function AppearancePreferencesEditor({
  value,
  disabled,
  onSave,
  className,
}: {
  value: WorkspacePreferences;
  disabled: boolean;
  onSave: (next: WorkspacePreferences) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState(value);

  return (
    <div className={`space-y-4 ${className ?? ""}`}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Arayüz yoğunluğu">
          <Select disabled={disabled} value={draft.themeDensity} onValueChange={(value) => setDraft((current) => ({ ...current, themeDensity: value as WorkspacePreferences["themeDensity"] }))}>
            <SelectTrigger className="h-11 w-full rounded-xl px-3.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="comfortable">Comfortable</SelectItem>
              <SelectItem value="compact">Compact</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Accent modu">
          <Select disabled={disabled} value={draft.accentMode} onValueChange={(value) => setDraft((current) => ({ ...current, accentMode: value as WorkspacePreferences["accentMode"] }))}>
            <SelectTrigger className="h-11 w-full rounded-xl px-3.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="cyan">Cyan</SelectItem>
              <SelectItem value="emerald">Emerald</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
      <PreferenceChecklist
        items={[
          { key: "reducedMotion", title: "Hareketi azalt", description: "Geçiş ve animasyon yoğunluğunu düşür." },
        ]}
        draft={draft}
        disabled={disabled}
        onToggle={(key, checked) => setDraft((current) => ({ ...current, [key]: checked }))}
      />
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="flex size-9 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)]">
            <LifeBuoyIcon className="size-4 text-[var(--text-secondary)]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Destek hazırlığı</p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Seçilen destek kanalı, yardım merkezi ve incident coordination akışında varsayılan temas noktası olarak kullanılacak.
            </p>
          </div>
        </div>
      </div>
      <div className="flex justify-end">
        <Button disabled={disabled} onClick={() => onSave(draft)}>
          Görünüm tercihlerini kaydet
        </Button>
      </div>
    </div>
  );
}

function IntegrationWorkbench({ className }: { className?: string }) {
  const [requested, setRequested] = useState<string | null>(null);

  return (
    <div className={`space-y-3 ${className ?? ""}`}>
      {[
        {
          id: "webhooks",
          title: "Webhook çıkışları",
          description: "SOAR, SIEM ve external workflow araçlarına olay ve rapor çıktıları göndermek için hazır yüzey.",
          status: "ready",
        },
        {
          id: "connectors",
          title: "Connector kataloğu",
          description: "Ticketing, messaging ve observability araçları için bağlantı modeli hazırlandı.",
          status: "planned",
        },
        {
          id: "api-keys",
          title: "API erişim anahtarları",
          description: "Scoped access ve read-only token modeli sonraki güvenlik sprintinde açılacak.",
          status: "planned",
        },
      ].map((item) => (
        <div key={item.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">{item.title}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{item.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{item.status === "ready" ? "Hazır" : "Planlandı"}</Badge>
              <Button
                variant="outline"
                onClick={() => {
                  setRequested(item.id);
                  toast.success(`${item.title} çalışma listesine eklendi.`);
                }}
              >
                {requested === item.id ? "Eklendi" : "İstek oluştur"}
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PreferenceChecklist({
  items,
  draft,
  disabled,
  onToggle,
}: {
  items: Array<{ key: keyof WorkspacePreferences; title: string; description: string }>;
  draft: WorkspacePreferences;
  disabled: boolean;
  onToggle: (key: keyof WorkspacePreferences, checked: boolean) => void;
}) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <label key={String(item.key)} className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4">
          <Checkbox disabled={disabled} checked={Boolean(draft[item.key])} onCheckedChange={(checked) => onToggle(item.key, Boolean(checked))} />
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">{item.title}</p>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{item.description}</p>
          </div>
        </label>
      ))}
    </div>
  );
}

function OrganizationEditor({
  initial,
  isSaving,
  disabled,
  onSave,
}: {
  initial: {
    name: string;
    plan: string;
    region: string;
    cloudMode: "private_cloud" | "public_cloud" | "hybrid_cloud";
    complianceFrameworks: string;
  };
  isSaving: boolean;
  disabled: boolean;
  onSave: (payload: {
    name?: string;
    plan?: string;
    region?: string;
    cloudMode?: "private_cloud" | "public_cloud" | "hybrid_cloud";
    complianceFrameworks?: string[];
  }) => Promise<void>;
}) {
  const [form, setForm] = useState(initial);
  const frameworkPreview = useMemo(
    () =>
      form.complianceFrameworks
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean),
    [form.complianceFrameworks],
  );

  return (
    <div className="mt-5 space-y-4">
      <Field label="İşletme adı">
        <Input disabled={disabled} className="h-11 rounded-xl px-3.5" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Plan">
          <Input disabled={disabled} className="h-11 rounded-xl px-3.5" value={form.plan} onChange={(event) => setForm((current) => ({ ...current, plan: event.target.value }))} />
        </Field>
        <Field label="Bölge / şehir">
          <Input disabled={disabled} className="h-11 rounded-xl px-3.5" value={form.region} onChange={(event) => setForm((current) => ({ ...current, region: event.target.value }))} />
        </Field>
      </div>
      <Field label="Cloud mode">
        <Select disabled={disabled} value={form.cloudMode} onValueChange={(value) => setForm((current) => ({ ...current, cloudMode: value as typeof current.cloudMode }))}>
          <SelectTrigger className="h-11 w-full rounded-xl px-3.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="private_cloud">Private Cloud</SelectItem>
            <SelectItem value="public_cloud">Public Cloud</SelectItem>
            <SelectItem value="hybrid_cloud">Hybrid Cloud</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Uyumluluk çerçeveleri">
        <Textarea disabled={disabled} value={form.complianceFrameworks} onChange={(event) => setForm((current) => ({ ...current, complianceFrameworks: event.target.value }))} />
      </Field>
      <div className="flex flex-wrap gap-2">
        {frameworkPreview.map((framework) => (
          <Badge key={framework} variant="outline">
            {framework}
          </Badge>
        ))}
      </div>
      <div className="flex justify-end">
        <Button
          disabled={disabled || isSaving}
          onClick={() =>
            void onSave({
              name: form.name,
              plan: form.plan,
              region: form.region,
              cloudMode: form.cloudMode,
              complianceFrameworks: frameworkPreview,
            })
          }
        >
          {isSaving ? "Kaydediliyor..." : "İşletme bilgilerini kaydet"}
        </Button>
      </div>
    </div>
  );
}

function RiskPolicyEditor({
  initial,
  isSaving,
  disabled,
  onSave,
}: {
  initial: {
    criticalClassificationWeight: number;
    missingEncryptionWeight: number;
    publicCloudSensitiveWeight: number;
    missingBackupWeight: number;
    noKmsWeight: number;
    openCriticalEventWeight: number;
    deceptionTriggerWeight: number;
  };
  isSaving: boolean;
  disabled: boolean;
  onSave: (payload: {
    criticalClassificationWeight: number;
    missingEncryptionWeight: number;
    publicCloudSensitiveWeight: number;
    missingBackupWeight: number;
    noKmsWeight: number;
    openCriticalEventWeight: number;
    deceptionTriggerWeight: number;
  }) => Promise<void>;
}) {
  const [form, setForm] = useState(initial);

  return (
    <div className="mt-5 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {Object.entries(form).map(([key, value]) => (
          <Field key={key} label={key}>
            <Input
              disabled={disabled}
              type="number"
              min={0}
              max={100}
              className="h-11 rounded-xl px-3.5"
              value={value}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  [key]: Number(event.target.value),
                }))
              }
            />
          </Field>
        ))}
      </div>

      <div className="flex justify-end">
        <Button disabled={disabled || isSaving} onClick={() => void onSave(form)}>
          {isSaving ? "Kaydediliyor..." : "Risk politikasını kaydet"}
        </Button>
      </div>
    </div>
  );
}

function ReportBrandingEditor({
  initial,
  isSaving,
  disabled,
  onSave,
}: {
  initial: {
    companyName: string;
    reportFooter: string;
    preparedByLabel: string;
    confidentialityLabel: string;
  };
  isSaving: boolean;
  disabled: boolean;
  onSave: (payload: {
    companyName: string;
    reportFooter: string;
    preparedByLabel: string;
    confidentialityLabel: string;
  }) => Promise<void>;
}) {
  const [form, setForm] = useState(initial);

  return (
    <div className="mt-5 space-y-4">
      <Field label="Şirket adı">
        <Input disabled={disabled} className="h-11 rounded-xl px-3.5" value={form.companyName} onChange={(event) => setForm((current) => ({ ...current, companyName: event.target.value }))} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Hazırlayan etiketi">
          <Input disabled={disabled} className="h-11 rounded-xl px-3.5" value={form.preparedByLabel} onChange={(event) => setForm((current) => ({ ...current, preparedByLabel: event.target.value }))} />
        </Field>
        <Field label="Gizlilik etiketi">
          <Input disabled={disabled} className="h-11 rounded-xl px-3.5" value={form.confidentialityLabel} onChange={(event) => setForm((current) => ({ ...current, confidentialityLabel: event.target.value }))} />
        </Field>
      </div>
      <Field label="Rapor alt bilgisi">
        <Textarea disabled={disabled} value={form.reportFooter} onChange={(event) => setForm((current) => ({ ...current, reportFooter: event.target.value }))} />
      </Field>

      <div className="flex justify-end">
        <Button disabled={disabled || isSaving} onClick={() => void onSave(form)}>
          {isSaving ? "Kaydediliyor..." : "Rapor görünümünü kaydet"}
        </Button>
      </div>
    </div>
  );
}
