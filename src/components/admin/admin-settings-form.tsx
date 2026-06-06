"use client";

import { useState } from "react";
import { SaveIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AdminSettingsPayload } from "@/server/admin/admin-service";

type ApiEnvelope<T> = {
  data: T | null;
  error?: { message?: string } | null;
};

async function readSettingsResponse(response: Response) {
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<AdminSettingsPayload> | null;

  if (!response.ok || payload?.error) {
    throw new Error(payload?.error?.message ?? "Ayarlar güncellenemedi.");
  }

  if (!payload?.data) {
    throw new Error("Admin settings API boş yanıt döndürdü.");
  }

  return payload.data;
}

export function AdminSettingsForm({ settings }: { settings: AdminSettingsPayload }) {
  const [form, setForm] = useState(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    setError(null);

    try {
      const updated = await readSettingsResponse(
        await fetch("/api/admin/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(form),
        }),
      );
      setForm(updated);
      setMessage("Ayarlar kaydedildi.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ayarlar kaydedilemedi.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="applicationName">Application name</Label>
          <Input
            id="applicationName"
            value={form.applicationName}
            onChange={(event) => setForm((current) => ({ ...current, applicationName: event.target.value }))}
            placeholder="HCSC.space"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="adminContactEmail">Admin contact email</Label>
          <Input
            id="adminContactEmail"
            type="email"
            value={form.adminContactEmail}
            onChange={(event) => setForm((current) => ({ ...current, adminContactEmail: event.target.value }))}
            placeholder="security.admin@hcsc.local"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3">
          <Checkbox
            checked={form.maintenanceMode}
            onCheckedChange={(checked) => setForm((current) => ({ ...current, maintenanceMode: checked === true }))}
            aria-label="Maintenance mode"
          />
          <span>
            <span className="block text-sm font-medium text-[var(--text-primary)]">Maintenance mode</span>
            <span className="block text-xs leading-5 text-[var(--text-secondary)]">Operasyonel bakım durumunu admin ayarına işler.</span>
          </span>
        </label>

        <label className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3">
          <Checkbox
            checked={form.registrationEnabled}
            onCheckedChange={(checked) => setForm((current) => ({ ...current, registrationEnabled: checked === true }))}
            aria-label="Registration enabled"
          />
          <span>
            <span className="block text-sm font-medium text-[var(--text-primary)]">Registration enabled</span>
            <span className="block text-xs leading-5 text-[var(--text-secondary)]">Yeni hesap kayıt politikasını platform ayarı olarak saklar.</span>
          </span>
        </label>

        <label className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3">
          <Checkbox
            checked={form.securityScanVisibility}
            onCheckedChange={(checked) => setForm((current) => ({ ...current, securityScanVisibility: checked === true }))}
            aria-label="Security scan visibility"
          />
          <span>
            <span className="block text-sm font-medium text-[var(--text-primary)]">Security scan visibility</span>
            <span className="block text-xs leading-5 text-[var(--text-secondary)]">Security posture widget ve rapor görünürlüğünü kontrol eder.</span>
          </span>
        </label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="systemNoticeMessage">System notice message</Label>
        <Input
          id="systemNoticeMessage"
          value={form.systemNoticeMessage}
          onChange={(event) => setForm((current) => ({ ...current, systemNoticeMessage: event.target.value }))}
          placeholder="Operational notice"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="publicStatusMessage">Public status message</Label>
        <Input
          id="publicStatusMessage"
          value={form.publicStatusMessage}
          onChange={(event) => setForm((current) => ({ ...current, publicStatusMessage: event.target.value }))}
          placeholder="HCSC.space systems operational."
        />
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          {message}
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={isSaving}>
          <SaveIcon />
          {isSaving ? "Kaydediliyor" : "Save settings"}
        </Button>
      </div>
    </form>
  );
}
