"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheckIcon } from "lucide-react";

import { useDemo } from "@/components/layout/demo-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function VerifyTwoFactorPage() {
  const router = useRouter();
  const { verify2FA, currentUser, onboardingCompleted } = useDemo();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const maskedEmail = useMemo(() => currentUser?.email ?? "security.admin@hcsc.local", [currentUser?.email]);

  const handleVerify = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = verify2FA(code);

    if (!result.success) {
      setError(result.error ?? "Kod doğrulanamadı.");
      return;
    }

    setError(null);
    router.replace(onboardingCompleted ? "/dashboard" : "/onboarding");
  };

  return (
    <main className="flex h-svh items-center justify-center overflow-hidden bg-background px-6 py-10">
      <div className="w-full max-w-md rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl border border-cyan-500/25 bg-cyan-500/10 text-cyan-300">
            <ShieldCheckIcon className="size-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Two Factor Verification</p>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">2FA doğrulaması</h1>
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-[var(--text-secondary)]">
          <span className="font-medium text-[var(--text-primary)]">{maskedEmail}</span> hesabı için güvenli oturumu tamamlamak üzere 6 haneli kodu gir.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleVerify}>
          <Input
            value={code}
            onChange={(event) => {
              const next = event.target.value.replace(/\D/g, "").slice(0, 6);
              setCode(next);
              setError(null);
            }}
            inputMode="numeric"
            placeholder="123456"
            className="h-14 text-center text-2xl tracking-[0.45em]"
            aria-label="2FA kodu"
          />

          {error ? (
            <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              {error}
            </div>
          ) : null}

          <Button type="submit" className="w-full">
            Doğrula
          </Button>
        </form>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Badge variant="outline">Demo code: 123456</Badge>
          <Button variant="outline" size="sm" onClick={() => setCode("123456")}>
            Kodu otomatik doldur
          </Button>
          <Button variant="ghost" size="sm">
            Kodu yeniden gönder
          </Button>
        </div>

        <p className="mt-5 text-xs leading-5 text-[var(--text-muted)]">
          Bu doğrulama ekranı gerçek SMS/e-posta göndermez. Tez savunması için güvenli oturum ve MFA akışını simüle eder.
        </p>
      </div>
    </main>
  );
}
