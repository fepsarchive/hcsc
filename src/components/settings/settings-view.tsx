"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  BellRingIcon,
  BlocksIcon,
  Building2Icon,
  CopyIcon,
  KeyRoundIcon,
  LifeBuoyIcon,
  MailPlusIcon,
  Paintbrush2Icon,
  RotateCwIcon,
  ShieldCheckIcon,
  UserCircle2Icon,
  UserMinusIcon,
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
import {
  createTeamInvite,
  disableTeamMember,
  getRecoveryCodeStatus,
  getTeamInvites,
  getTeamMembers,
  HcscApiError,
  regenerateRecoveryCodes,
  revokeTeamInvite,
  type RecoveryCodeStatusPayload,
  updateTeamMemberRole,
} from "@/lib/hcsc-api";
import { rolePermissions } from "@/lib/permissions";
import type { TeamInviteRecord, TeamMemberRecord, TeamRoleKey } from "@/types";

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
              <TeamManagementPanel
                className="mt-5"
                canManageSettings={canManageSettings}
                currentUserId={currentUser?.id ?? null}
              />
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
              <RecoveryCodesPanel className="mt-5" disabled={!canManageSettings || !auth.is2FAVerified} />
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

function TeamManagementPanel({
  className,
  canManageSettings,
  currentUserId,
}: {
  className?: string;
  canManageSettings: boolean;
  currentUserId: string | null;
}) {
  const [members, setMembers] = useState<TeamMemberRecord[]>([]);
  const [invites, setInvites] = useState<TeamInviteRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamRoleKey>("cloud_security_analyst");

  const loadTeamData = async () => {
    setIsLoading(true);

    try {
      const [{ members: nextMembers }, nextInvitesResponse] = await Promise.all([
        getTeamMembers(),
        canManageSettings ? getTeamInvites() : Promise.resolve({ invites: [] }),
      ]);

      setMembers(nextMembers);
      setInvites(nextInvitesResponse.invites);
      setError(null);
    } catch (teamError) {
      setError(
        teamError instanceof HcscApiError
          ? teamError.message
          : "Takım bilgileri şu anda yüklenemedi.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const [{ members: nextMembers }, nextInvitesResponse] = await Promise.all([
          getTeamMembers(),
          canManageSettings ? getTeamInvites() : Promise.resolve({ invites: [] }),
        ]);

        if (!cancelled) {
          setMembers(nextMembers);
          setInvites(nextInvitesResponse.invites);
          setError(null);
          setIsLoading(false);
        }
      } catch (teamError) {
        if (!cancelled) {
          setError(
            teamError instanceof HcscApiError
              ? teamError.message
              : "Takım bilgileri şu anda yüklenemedi.",
          );
          setIsLoading(false);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [canManageSettings]);

  const handleInviteSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!inviteEmail.trim()) {
      setError("Davet göndermek için bir e-posta adresi gir.");
      return;
    }

    setIsSubmittingInvite(true);

    try {
      const result = await createTeamInvite({
        email: inviteEmail.trim(),
        role: inviteRole,
      });

      setInviteEmail("");
      setInvites((current) => [result.invite, ...current.filter((invite) => invite.id !== result.invite.id)]);
      setError(null);
      toast.success(
        result.delivery === "sent"
          ? "Davet gönderildi."
          : result.delivery === "failed"
            ? "Davet oluşturuldu, ancak e-posta teslimatı doğrulanamadı."
            : "Davet oluşturuldu.",
      );

      if (result.inviteUrl) {
        void navigator.clipboard
          .writeText(result.inviteUrl)
          .then(() => toast.success("Development davet bağlantısı panoya kopyalandı."))
          .catch(() => undefined);
      }
    } catch (inviteError) {
      setError(
        inviteError instanceof HcscApiError
          ? inviteError.message
          : "Davet gönderimi tamamlanamadı.",
      );
    } finally {
      setIsSubmittingInvite(false);
    }
  };

  const handleRoleUpdate = async (userId: string, role: TeamRoleKey) => {
    setActiveActionId(`role:${userId}`);

    try {
      const { members: nextMembers } = await updateTeamMemberRole(userId, role);
      setMembers(nextMembers);
      setError(null);
      toast.success("Rol güncellendi.");
    } catch (roleError) {
      setError(
        roleError instanceof HcscApiError
          ? roleError.message
          : "Rol güncellenemedi.",
      );
    } finally {
      setActiveActionId(null);
    }
  };

  const handleDisable = async (userId: string) => {
    setActiveActionId(`disable:${userId}`);

    try {
      const { members: nextMembers } = await disableTeamMember(userId);
      setMembers(nextMembers);
      setError(null);
      toast.success("Üyelik kaldırıldı.");
    } catch (disableError) {
      setError(
        disableError instanceof HcscApiError
          ? disableError.message
          : "Üyelik kaldırılamadı.",
      );
    } finally {
      setActiveActionId(null);
    }
  };

  const handleRevoke = async (inviteId: string) => {
    setActiveActionId(`revoke:${inviteId}`);

    try {
      await revokeTeamInvite(inviteId);
      setInvites((current) =>
        current.map((invite) =>
          invite.id === inviteId
            ? {
                ...invite,
                status: "revoked",
              }
            : invite,
        ),
      );
      setError(null);
      toast.success("Davet iptal edildi.");
    } catch (revokeError) {
      setError(
        revokeError instanceof HcscApiError
          ? revokeError.message
          : "Davet iptal edilemedi.",
      );
    } finally {
      setActiveActionId(null);
    }
  };

  const pendingInvites = invites.filter((invite) => invite.status === "pending");

  return (
    <div className={`space-y-4 ${className ?? ""}`}>
      {error ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm leading-6 text-rose-200">
          {error}
        </div>
      ) : null}

      {canManageSettings ? (
        <form onSubmit={handleInviteSubmit} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)]">
              <MailPlusIcon className="size-4 text-cyan-300" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[var(--text-primary)]">Takım daveti gönder</p>
              <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                Yeni üyeyi e-posta ile davet et, rolünü belirle ve kabul akışını güvenli bağlantı üzerinden tamamla.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto]">
            <Input
              value={inviteEmail}
              onChange={(event) => {
                setInviteEmail(event.target.value);
                setError(null);
              }}
              type="email"
              placeholder="ornek@kurum.com"
              autoComplete="email"
              className="h-11 rounded-xl px-3.5"
            />
            <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as TeamRoleKey)}>
              <SelectTrigger className="h-11 w-full rounded-xl px-3.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="security_admin">Security Admin</SelectItem>
                <SelectItem value="cloud_security_analyst">Cloud Security Analyst</SelectItem>
                <SelectItem value="compliance_officer">Compliance Officer</SelectItem>
                <SelectItem value="auditor">Auditor</SelectItem>
                <SelectItem value="executive">Executive</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" className="h-11 rounded-xl" disabled={isSubmittingInvite}>
              {isSubmittingInvite ? "Gönderiliyor..." : "Davet gönder"}
            </Button>
          </div>
        </form>
      ) : null}

      <div className="grid gap-3">
        {isLoading ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-5 text-sm text-[var(--text-secondary)]">
            Takım görünümü hazırlanıyor...
          </div>
        ) : members.length > 0 ? (
          members.map((member) => (
          <div key={member.membershipId} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <AvatarToken label={member.name} subtitle={`${member.email} • ${member.department}`} />
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{member.roleLabel}</Badge>
                <Badge variant="outline">{member.status}</Badge>
                {member.isProtectedAdmin ? <Badge variant="outline">Protected owner</Badge> : null}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {rolePermissions[member.roleLabel].slice(0, 6).map((permission) => (
                <Badge key={permission} variant="outline">
                  {permission}
                </Badge>
              ))}
            </div>

            {canManageSettings ? (
              <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  Katılım: {new Date(member.joinedAt).toLocaleDateString("tr-TR")} • Son giriş:{" "}
                  {member.lastLoginAt ? new Date(member.lastLoginAt).toLocaleString("tr-TR") : "Henüz yok"}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Select
                    value={member.role}
                    onValueChange={(value) => void handleRoleUpdate(member.userId, value as TeamRoleKey)}
                    disabled={
                      activeActionId === `role:${member.userId}` ||
                      (member.isProtectedAdmin && member.userId === currentUserId)
                    }
                  >
                    <SelectTrigger className="h-10 w-full min-w-[220px] rounded-xl px-3 text-sm sm:w-[220px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="security_admin">Security Admin</SelectItem>
                      <SelectItem value="cloud_security_analyst">Cloud Security Analyst</SelectItem>
                      <SelectItem value="compliance_officer">Compliance Officer</SelectItem>
                      <SelectItem value="auditor">Auditor</SelectItem>
                      <SelectItem value="executive">Executive</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-xl"
                    disabled={
                      activeActionId === `disable:${member.userId}` ||
                      member.isProtectedAdmin ||
                      member.userId === currentUserId
                    }
                    onClick={() => void handleDisable(member.userId)}
                  >
                    <UserMinusIcon className="size-4" />
                    Üyeliği kaldır
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-5 text-sm leading-6 text-[var(--text-secondary)]">
            Bu çalışma alanında henüz ek ekip üyesi görünmüyor.
          </div>
        )}
      </div>

      {canManageSettings ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Bekleyen davetler</p>
              <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                Kabul edilmemiş veya yeni gönderilmiş takım davetlerini buradan izleyebilir ve iptal edebilirsin.
              </p>
            </div>
            <Button type="button" variant="outline" className="h-10 rounded-xl" onClick={() => void loadTeamData()}>
              <RotateCwIcon className="size-4" />
              Yenile
            </Button>
          </div>

          <div className="mt-4 space-y-3">
            {pendingInvites.length > 0 ? (
              pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{invite.email}</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                      {invite.roleLabel} • Son geçerlilik: {new Date(invite.expiresAt).toLocaleString("tr-TR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{invite.status}</Badge>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 rounded-xl"
                      disabled={activeActionId === `revoke:${invite.id}`}
                      onClick={() => void handleRevoke(invite.id)}
                    >
                      Daveti iptal et
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-5 text-sm leading-6 text-[var(--text-secondary)]">
                Bekleyen ekip daveti bulunmuyor.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RecoveryCodesPanel({
  className,
  disabled,
}: {
  className?: string;
  disabled: boolean;
}) {
  const [status, setStatus] = useState<RecoveryCodeStatusPayload | null>(null);
  const [isLoading, setIsLoading] = useState(() => !disabled);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (disabled) {
      return;
    }

    let cancelled = false;

    async function loadStatus() {
      if (!cancelled) {
        setIsLoading(true);
      }

      try {
        const nextStatus = await getRecoveryCodeStatus();

        if (!cancelled) {
          setStatus(nextStatus);
          setError(null);
        }
      } catch (statusError) {
        if (!cancelled) {
          setError(
            statusError instanceof HcscApiError
              ? statusError.message
              : "Recovery code durumu şu anda yüklenemedi.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadStatus();

    return () => {
      cancelled = true;
    };
  }, [disabled]);

  const handleRegenerate = async () => {
    setIsRegenerating(true);

    try {
      const result = await regenerateRecoveryCodes();
      setRecoveryCodes(result.recoveryCodes);
      setStatus(result.status);
      setError(null);
      toast.success("Yeni recovery code seti üretildi.");
    } catch (regenerationError) {
      setError(
        regenerationError instanceof HcscApiError
          ? regenerationError.message
          : "Recovery code seti yenilenemedi.",
      );
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!recoveryCodes?.length) {
      return;
    }

    try {
      await navigator.clipboard.writeText(recoveryCodes.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Recovery code listesi panoya kopyalanamadı.");
    }
  };

  return (
    <div className={`rounded-3xl border border-[var(--border)] bg-[var(--surface)] px-4 py-5 ${className ?? ""}`}>
      <div className="flex items-start gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)]">
          <KeyRoundIcon className="size-5 text-cyan-300" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Recovery Codes</p>
          <p className="text-sm leading-6 text-[var(--text-secondary)]">
            Authenticator uygulamasına erişemediğinde tek kullanımlık kurtarma kodlarıyla hesabına güvenli şekilde dönebilirsin.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant="outline">{status?.remainingCodes ?? 0} kullanılmamış kod</Badge>
        <Badge variant="outline">
          {status?.lastGeneratedAt
            ? `Son üretim ${new Date(status.lastGeneratedAt).toLocaleDateString("tr-TR")}`
            : "Henüz üretilmedi"}
        </Badge>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm leading-6 text-rose-100">
          {error}
        </div>
      ) : null}

      <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-4">
        {disabled ? (
          <p className="text-sm text-[var(--text-secondary)]">
            Recovery code yönetimi için doğrulanmış 2FA oturumu ve ayar düzenleme yetkisi gerekir.
          </p>
        ) : isLoading ? (
          <p className="text-sm text-[var(--text-secondary)]">Recovery code durumu yükleniyor...</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label="Toplam set" value={String(status?.totalCodes ?? 0)} />
            <Metric label="Kalan" value={String(status?.remainingCodes ?? 0)} />
            <Metric label="Kullanılan" value={String(status?.usedCodes ?? 0)} />
          </div>
        )}
      </div>

      {recoveryCodes?.length ? (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-[var(--text-primary)]">Yeni recovery code setin hazır</p>
            <Button type="button" variant="outline" className="rounded-xl" onClick={handleCopy}>
              <CopyIcon />
              {copied ? "Kopyalandı" : "Kopyala"}
            </Button>
          </div>
          <Textarea readOnly value={recoveryCodes.join("\n")} className="min-h-[220px] rounded-2xl font-mono text-sm leading-7" />
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-100">
            Bu kodlar sadece şimdi gösterilir. Eski kullanılmamış kodlar iptal edildi; yeni seti güvenli bir kasada sakla.
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex justify-end">
        <Button type="button" disabled={disabled || isRegenerating} onClick={() => void handleRegenerate()}>
          <RotateCwIcon className={isRegenerating ? "animate-spin" : ""} />
          {isRegenerating ? "Yeni set üretiliyor..." : "Yeni recovery code üret"}
        </Button>
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
