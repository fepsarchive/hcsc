"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheckIcon } from "lucide-react";

import { mockAuthAccounts } from "@/lib/auth-mock-data";
import { useDemo } from "@/components/layout/demo-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useDemo();
  const [email, setEmail] = useState(mockAuthAccounts[0]?.email ?? "");
  const [password, setPassword] = useState("demo123");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = login(email, password);

    if (!result.success) {
      setError(result.error ?? "Giriş başarısız.");
      return;
    }

    setError(null);
    router.replace("/verify-2fa");
  };

  return (
    <main className="h-svh overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.1),transparent_20%),var(--background)]">
      <div className="mx-auto grid h-full w-full max-w-[1560px] min-w-0 lg:grid-cols-[minmax(0,1fr)_minmax(380px,460px)] lg:gap-10 lg:px-8">
        <section className="hidden min-w-0 overflow-hidden px-8 py-10 lg:flex lg:flex-col lg:justify-between">
          <div className="min-w-0 max-w-3xl">
            <Badge variant="outline" className="gap-2">
              <ShieldCheckIcon className="size-4" />
              Hybrid Cloud Security Console
            </Badge>
            <h1 className="mt-8 max-w-4xl text-balance text-5xl font-semibold tracking-tight text-[var(--text-primary)] xl:text-6xl">
              Active Defense &amp; Zero Trust Cloud Security Platform
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-9 text-[var(--text-secondary)]">
              Hibrit bulut veri varlıklarını sınıflandıran, erişim taleplerini Zero Trust ile değerlendiren,
              deception varlıklarını yöneten ve SIEM/SOAR olaylarını aynı konsolda birleştiren güvenli tez prototipi.
            </p>
          </div>

          <div className="grid max-w-2xl gap-4 xl:grid-cols-2">
            <div className="rounded-3xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_86%,transparent)] p-5 shadow-[var(--panel-shadow)] backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Demo Flow</p>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                Güvenli demo akışı: Access Request → Zero Trust → Event → SOAR → Deception → Compliance → Report
              </p>
            </div>
            <div className="rounded-3xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_86%,transparent)] p-5 shadow-[var(--panel-shadow)] backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Ethics</p>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                Tüm tehditler güvenli simülasyondur. Uygulama gerçek saldırı, exploit veya hack-back içermez.
              </p>
            </div>
          </div>
        </section>

        <section className="flex min-h-0 min-w-0 items-center justify-center px-4 py-5 sm:px-6 lg:px-0 lg:py-8">
          <div className="flex max-h-[calc(100svh-5rem)] w-full max-w-[440px] flex-col overflow-hidden rounded-[30px] border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.24)] backdrop-blur xl:p-6">
            <div className="lg:hidden">
              <Badge variant="outline" className="gap-2">
                <ShieldCheckIcon className="size-4" />
                Hybrid Cloud Security Console
              </Badge>
              <h1 className="mt-5 text-balance text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
                Active Defense &amp; Zero Trust Cloud Security Platform
              </h1>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                Güvenli mock kimlik doğrulama ile HCSC v1 prototipine giriş yap.
              </p>
            </div>

            <div className="mt-0 shrink-0 lg:mt-1">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">Secure Login</p>
              <h2 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">Oturum aç</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Demo kullanıcılarından biriyle giriş yap ve 2FA doğrulamasıyla konsolu aç.
              </p>
            </div>

            <form className="mt-5 shrink-0 space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email">E-posta</Label>
                <Input
                  id="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="security.admin@hcsc.local"
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Parola</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="demo123"
                  autoComplete="current-password"
                />
              </div>

              {error ? (
                <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                  {error}
                </div>
              ) : null}

              <Button type="submit" className="w-full">
                Giriş yap
              </Button>
            </form>

            <div className="mt-5 min-h-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">Demo kullanıcılar</p>
                <Badge variant="outline">Parola: demo123</Badge>
              </div>

              <div className="hcsc-scrollbar mt-3 grid max-h-full gap-2 overflow-y-auto pr-1">
                {mockAuthAccounts.slice(0, 2).map((account) => (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => {
                      setEmail(account.email);
                      setPassword(account.password);
                      setError(null);
                    }}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-3 text-left transition hover:bg-[var(--surface)]"
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
            </div>

            <div className="mt-5 shrink-0 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3 text-xs leading-6 text-[var(--text-muted)]">
              Güvenlik notu: Bu ekran yalnızca mock/session tabanlı demo kimlik doğrulaması için tasarlanmıştır. Tüm
              doğrulama ve 2FA adımları güvenli simülasyon mantığında çalışır.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
