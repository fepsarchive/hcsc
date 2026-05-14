"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRightIcon, ShieldCheckIcon } from "lucide-react";

import { AuthLinks, AuthMessage, AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useDemo } from "@/components/layout/demo-provider";
import { mockAuthAccounts } from "@/lib/auth-mock-data";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useDemo();
  const isDevelopment = process.env.NODE_ENV === "development";
  const registeredEmail = searchParams.get("email");
  const registrationCompleted = searchParams.get("registered") === "1";

  const [email, setEmail] = useState(registeredEmail ?? (isDevelopment ? (mockAuthAccounts[0]?.email ?? "") : ""));
  const [password, setPassword] = useState(isDevelopment ? "demo123" : "");
  const [rememberSession, setRememberSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showcasedAccounts = useMemo(() => (isDevelopment ? mockAuthAccounts.slice(0, 3) : []), [isDevelopment]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError("Lütfen e-posta ve şifre alanlarını doldur.");
      return;
    }

    setIsSubmitting(true);
    const result = await login(email, password);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error ?? "Giriş başarısız.");
      return;
    }

    if (!rememberSession && typeof window !== "undefined") {
      window.sessionStorage.removeItem("hcsc-auth-session");
    }

    setError(null);
    router.replace("/verify-2fa");
  };

  return (
    <AuthShell
      eyebrow="Secure Login"
      title="Oturum aç"
      description="HCSC çalışma alanına erişmek için hesabınla giriş yap. Parola doğrulamasından sonra ikinci faktör adımıyla oturum tamamlanır."
      sideTitle={
        <>
          Active Defense &amp; Zero Trust
          <br />
          Cloud Security Platform
        </>
      }
      sideDescription="Hibrit bulut veri varlıklarını sınıflandıran, erişim taleplerini Zero Trust ile değerlendiren, deception varlıklarını yöneten ve SIEM/SOAR olaylarını aynı konsolda birleştiren güvenli tez prototipi."
      sideFooter={
        <div className="grid max-w-[42rem] gap-4 sm:grid-cols-2">
          <div className="rounded-[28px] border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-elevated)_88%,transparent)] px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
              Zero Trust Flow
            </p>
            <p className="mt-4 text-sm leading-8 text-[var(--text-secondary)]">
              Erişim talepleri, risk skoru ve policy kontrolleriyle doğrulanır.
            </p>
          </div>
          <div className="rounded-[28px] border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-elevated)_88%,transparent)] px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
              Deception &amp; SOAR
            </p>
            <p className="mt-4 text-sm leading-8 text-[var(--text-secondary)]">
              Sahte varlık sinyalleri olay yönetimi ve müdahale akışlarına bağlanır.
            </p>
          </div>
        </div>
      }
      footer={
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <AuthLinks
              primaryHref="/register"
              primaryLabel="Yeni hesap oluştur"
              secondaryHref="/forgot-password"
              secondaryLabel="Şifremi unuttum"
            />
            {isDevelopment ? <Badge variant="outline">Hazır erişim profilleri</Badge> : null}
          </div>

          {isDevelopment ? (
            <div className="grid gap-2">
              {showcasedAccounts.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => {
                    setEmail(account.email);
                    setPassword(account.password);
                    setError(null);
                  }}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3 text-left transition hover:bg-[var(--surface)]"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--text-primary)]">{account.name}</p>
                      <p className="truncate text-xs text-[var(--text-secondary)]">{account.role}</p>
                    </div>
                    <Badge variant="outline" className="max-w-full truncate">
                      {account.email}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      }
    >
      <div className="space-y-4">
        {registrationCompleted ? (
          <AuthMessage
            tone="success"
            title="Kayıt tamamlandı"
            description="Hesabın oluşturuldu. Giriş yaparak doğrulama adımını tamamlayabilir ve çalışma alanına geçebilirsin."
          />
        ) : null}

        {error ? (
          <AuthMessage
            tone="critical"
            title="Giriş yapılamadı"
            description={error}
          />
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">E-posta adresi</Label>
            <Input
              id="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError(null);
              }}
              placeholder="name@company.com"
              autoComplete="email"
              className="h-11 rounded-xl px-3.5"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="password">Şifre</Label>
              <Link href="/forgot-password" className="text-xs font-medium text-cyan-300 transition hover:text-cyan-200">
                Şifremi unuttum
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError(null);
              }}
              placeholder="Şifreni gir"
              autoComplete="current-password"
              className="h-11 rounded-xl px-3.5"
            />
          </div>

          <label className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3">
            <div className="flex items-center gap-3">
              <Checkbox checked={rememberSession} onCheckedChange={(checked) => setRememberSession(Boolean(checked))} />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Oturumu hatırla</p>
                <p className="text-xs text-[var(--text-muted)]">Bu cihazda güvenli oturumu açık tut.</p>
              </div>
            </div>
            <ShieldCheckIcon className="size-4 text-cyan-300" />
          </label>

          <Button type="submit" className="h-11 w-full rounded-xl" disabled={isSubmitting}>
            {isSubmitting ? "Giriş yapılıyor..." : "Giriş yap"}
            {!isSubmitting ? <ArrowRightIcon /> : null}
          </Button>
        </form>
      </div>
    </AuthShell>
  );
}
