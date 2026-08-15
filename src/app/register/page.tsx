"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, CheckCircle2Icon } from "lucide-react";

import { AuthLinks, AuthMessage, AuthShell } from "@/components/auth/auth-shell";
import { useDemo } from "@/components/layout/demo-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useDemo();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!fullName.trim() || !email.trim() || !companyName.trim() || !password.trim() || !confirmPassword.trim()) {
      setError("Lütfen tüm zorunlu alanları doldur.");
      return;
    }

    if (password.length < 8) {
      setError("Şifre en az 8 karakter olmalı.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Şifreler birbiriyle eşleşmiyor.");
      return;
    }

    if (!acceptedTerms) {
      setError("Devam etmek için kullanım şartlarını kabul etmelisin.");
      return;
    }

    setIsSubmitting(true);
    const result = await register({
      fullName,
      email,
      companyName,
      password,
    });
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error ?? "Kayıt oluşturulamadı.");
      return;
    }

    setError(null);
    setSuccess(result.message ?? "Kayıt tamamlandı.");
    router.replace("/verify-2fa");
  };

  return (
    <AuthShell
      eyebrow="Create Workspace"
      title="Yeni hesap oluştur"
      description="Birkaç temel alanla çalışma alanını oluştur, ilk kurulum akışını tamamla ve dashboard’a geç."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <AuthLinks primaryHref="/login" primaryLabel="Zaten hesabın var mı? Giriş yap" />
          <Badge variant="outline">Starter Workspace</Badge>
        </div>
      }
    >
      <div className="space-y-4">
        {error ? <AuthMessage tone="critical" title="Kayıt oluşturulamadı" description={error} /> : null}
        {success ? <AuthMessage tone="success" title="Kayıt başarıyla tamamlandı" description={success} /> : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="full-name">Ad soyad</Label>
              <Input
                id="full-name"
                value={fullName}
                onChange={(event) => {
                  setFullName(event.target.value);
                  setError(null);
                }}
                placeholder="Eyşan Yıldırım"
                className="h-11 rounded-xl px-3.5"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company-name">İşletme / şirket adı</Label>
              <Input
                id="company-name"
                value={companyName}
                onChange={(event) => {
                  setCompanyName(event.target.value);
                  setError(null);
                }}
                placeholder="AstraSec Labs"
                className="h-11 rounded-xl px-3.5"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="register-email">E-posta adresi</Label>
            <Input
              id="register-email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError(null);
              }}
              placeholder="founder@astrasec.io"
              className="h-11 rounded-xl px-3.5"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="register-password">Şifre</Label>
              <Input
                id="register-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError(null);
                }}
                placeholder="En az 8 karakter"
                className="h-11 rounded-xl px-3.5"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-password-confirm">Şifre tekrar</Label>
              <Input
                id="register-password-confirm"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  setError(null);
                }}
                placeholder="Şifreni tekrar gir"
                className="h-11 rounded-xl px-3.5"
              />
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3">
            <Checkbox checked={acceptedTerms} onCheckedChange={(checked) => setAcceptedTerms(Boolean(checked))} />
            <div className="space-y-1">
              <p className="text-sm font-medium text-[var(--text-primary)]">Kullanım şartlarını kabul ediyorum</p>
              <p className="auth-compact-hide text-xs leading-5 text-[var(--text-muted)]">
                Platform yalnızca savunma, görünürlük ve güvenli operasyon akışları sunar; saldırı veya hack-back içermez.
              </p>
            </div>
          </label>

          <div className="auth-compact-hide rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
            <div className="flex items-start gap-3">
              <CheckCircle2Icon className="mt-0.5 size-4 shrink-0" />
              <p className="leading-6">
                Kayıt tamamlandığında ilk kurulum ekranına yönlendirilirsin. Ardından çalışma alanın hazır hale gelir
                ve güvenlik modüllerini doğrudan kullanmaya başlayabilirsin.
              </p>
            </div>
          </div>

          <Button type="submit" className="h-11 w-full rounded-xl" disabled={isSubmitting}>
            {isSubmitting ? "Çalışma alanı hazırlanıyor..." : "Kayıt ol"}
            {!isSubmitting ? <ArrowRightIcon /> : null}
          </Button>
        </form>
      </div>
    </AuthShell>
  );
}
