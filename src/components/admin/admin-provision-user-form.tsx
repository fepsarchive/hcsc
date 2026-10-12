"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdminProvisionUserForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ message: string; warning: boolean } | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    setPending(true);
    setResult(null);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: fields.get("fullName"), email: fields.get("email"), companyName: fields.get("companyName") }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.data) throw new Error(payload.error?.message ?? "Kullanıcı oluşturulamadı.");
      setResult({ message: payload.data.message, warning: payload.data.activationDelivery !== "accepted_by_provider" });
      form.reset();
      router.refresh();
    } catch (error) {
      setResult({ message: error instanceof Error ? error.message : "İşlem sonucu alınamadı. Yeniden denemeden önce kullanıcı listesini kontrol edin.", warning: true });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-[var(--border)] p-4">
      <div>
        <h3 className="font-medium">Yeni müşteri hesabı</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Boş ve ayrı bir çalışma alanı açılır. Kullanıcı e-postayla parolasını belirler ve 2FA kurar.
          Çalışma alanı yöneticisi olur; platform admin yetkisi verilmez.
        </p>
      </div>
      <fieldset disabled={pending} className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="provision-name">Ad soyad</Label>
          <Input id="provision-name" name="fullName" required minLength={2} maxLength={120} autoComplete="off" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="provision-email">E-posta</Label>
          <Input id="provision-email" name="email" type="email" required maxLength={254} autoComplete="off" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="provision-company">Çalışma alanı / şirket adı</Label>
          <Input id="provision-company" name="companyName" required minLength={2} maxLength={120} autoComplete="off" />
        </div>
      </fieldset>
      {result ? <p role="status" className={result.warning ? "text-sm text-amber-300" : "text-sm text-emerald-300"}>{result.message}</p> : null}
      <Button type="submit" disabled={pending}>{pending ? "Oluşturuluyor…" : "Hesap oluştur ve kurulum e-postası gönder"}</Button>
    </form>
  );
}
