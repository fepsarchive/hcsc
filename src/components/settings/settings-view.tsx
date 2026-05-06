"use client";

import { Settings2Icon, ShieldCheckIcon, UserCircle2Icon } from "lucide-react";

import { useDemo } from "@/components/layout/demo-provider";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";

export function SettingsView() {
  const { currentUser, currentOrganization, auth, can } = useDemo();

  if (!can("manage_settings")) {
    return (
      <Panel>
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-4 text-sm leading-6 text-amber-200">
          Bu aksiyon için <span className="font-semibold">Security Admin</span> rolü gerekir. Ayarlar sayfası şu anda
          salt okunur erişim dışında kapalıdır.
        </div>
      </Panel>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[0.95fr,1.05fr]">
      <Panel>
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
            <UserCircle2Icon className="size-5 text-[var(--text-secondary)]" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Profile</p>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">{currentUser?.name}</h1>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">E-posta</p>
            <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">{currentUser?.email}</p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Rol</p>
            <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">{currentUser?.role}</p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Departman</p>
            <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">{currentUser?.department}</p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Son giriş</p>
            <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">{auth.lastLoginAt ?? "—"}</p>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4">
        <Panel>
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
              <ShieldCheckIcon className="size-5 text-cyan-300" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Security</p>
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">Oturum güvenliği</h2>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Badge variant="outline">{auth.isAuthenticated ? "Authenticated" : "Signed out"}</Badge>
            <Badge variant="outline">{auth.is2FAVerified ? "2FA verified" : "2FA pending"}</Badge>
            <Badge variant="outline">{currentUser?.mfaEnabled ? "MFA enabled" : "MFA disabled"}</Badge>
          </div>
        </Panel>

        <Panel>
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
              <Settings2Icon className="size-5 text-[var(--text-secondary)]" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Organization</p>
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">{currentOrganization.name}</h2>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Plan</p>
              <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">{currentOrganization.plan}</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Bölge</p>
              <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">{currentOrganization.region}</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:col-span-2">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Uyumluluk çerçeveleri</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {currentOrganization.complianceFrameworks.map((framework) => (
                  <Badge key={framework} variant="outline">
                    {framework}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
