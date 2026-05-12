"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, ShieldCheckIcon } from "lucide-react";

import { AuthLinks, AuthMessage, AuthShell } from "@/components/auth/auth-shell";
import { useDemo } from "@/components/layout/demo-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function VerifyTwoFactorPage() {
  const router = useRouter();
  const { verify2FA, currentUser, onboardingCompleted } = useDemo();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const maskedEmail = useMemo(() => currentUser?.email ?? "security.admin@hcsc.local", [currentUser?.email]);

  const handleVerify = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    const result = await verify2FA(code);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error ?? "Kod doğrulanamadı.");
      return;
    }

    setError(null);
    router.replace(onboardingCompleted ? "/dashboard" : "/onboarding");
  };

  return (
    <AuthShell
      eyebrow="Two Factor Verification"
      title="2FA doğrulamasını tamamla"
      description={`${maskedEmail} hesabı için güvenli oturumu tamamlamak üzere 6 haneli doğrulama kodunu gir.`}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge variant="outline">Doğrulama kodu: 123456</Badge>
          <AuthLinks primaryHref="/login" primaryLabel="Farklı hesapla giriş yap" />
        </div>
      }
    >
      <div className="space-y-4">
        {error ? <AuthMessage tone="critical" title="Kod doğrulanamadı" description={error} /> : null}

        <form className="space-y-4" onSubmit={handleVerify}>
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-5">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl border border-cyan-500/25 bg-cyan-500/10 text-cyan-300">
                <ShieldCheckIcon className="size-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Secure Session</p>
                <p className="text-sm text-[var(--text-secondary)]">MFA adımı tamamlandıktan sonra rol bazlı görünüm yüklenir.</p>
              </div>
            </div>

            <Input
              value={code}
              onChange={(event) => {
                const next = event.target.value.replace(/\D/g, "").slice(0, 6);
                setCode(next);
                setError(null);
              }}
              inputMode="numeric"
              placeholder="123456"
              className="mt-5 h-14 rounded-2xl text-center text-2xl tracking-[0.45em]"
              aria-label="2FA kodu"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setCode("123456")}>
              Kodu otomatik doldur
            </Button>
            <Button type="button" variant="ghost" className="rounded-xl">
              Kodu yeniden gönder
            </Button>
          </div>

          <Button type="submit" className="h-11 w-full rounded-xl" disabled={isSubmitting}>
            {isSubmitting ? "Doğrulanıyor..." : "Doğrula ve devam et"}
            {!isSubmitting ? <ArrowRightIcon /> : null}
          </Button>
        </form>
      </div>
    </AuthShell>
  );
}
