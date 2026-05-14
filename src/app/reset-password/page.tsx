"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeftIcon, CheckCircle2Icon, KeyRoundIcon } from "lucide-react";

import { AuthLinks, AuthMessage, AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword } from "@/lib/hcsc-api";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const hasToken = useMemo(() => token.trim().length > 0, [token]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!hasToken) {
      setError("Şifre yenileme bağlantısı eksik veya geçersiz.");
      return;
    }

    if (password.length < 8) {
      setError("Yeni şifre en az 8 karakter olmalı.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Şifreler birbiriyle eşleşmiyor.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await resetPassword({
        token,
        password,
        confirmPassword,
      });

      setSuccess(result.message);
      setError(null);
      window.setTimeout(() => {
        router.replace("/login");
      }, 1200);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Şifre yenilenemedi.");
      setSuccess(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Password Reset"
      title="Yeni şifreni belirle"
      description="Güvenli bağlantı doğrulandıktan sonra yeni parolan kaydedilir ve mevcut oturumların geçerliliği sona erer."
      footer={<AuthLinks primaryHref="/login" primaryLabel="Giriş ekranına dön" secondaryHref="/forgot-password" secondaryLabel="Yeni bağlantı iste" />}
    >
      <div className="space-y-4">
        {!hasToken ? (
          <AuthMessage
            tone="critical"
            title="Geçersiz bağlantı"
            description="Şifre yenileme bağlantısı eksik veya süresi dolmuş olabilir. Yeni bir bağlantı talep et."
          />
        ) : null}

        {error ? <AuthMessage tone="critical" title="Şifre yenilenemedi" description={error} /> : null}
        {success ? <AuthMessage tone="success" title="Şifre güncellendi" description={success} /> : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="new-password">Yeni şifre</Label>
            <Input
              id="new-password"
              type="password"
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
            <Label htmlFor="confirm-password">Yeni şifre tekrar</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                setError(null);
              }}
              placeholder="Parolayı tekrar gir"
              className="h-11 rounded-xl px-3.5"
            />
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3 text-sm leading-6 text-[var(--text-secondary)]">
            Parola yenileme tamamlandığında mevcut aktif oturumlar kapatılır ve yeniden giriş istenir.
          </div>

          <Button type="submit" className="h-11 w-full rounded-xl" disabled={!hasToken || isSubmitting}>
            {isSubmitting ? "Parola güncelleniyor..." : "Şifreyi yenile"}
            {!isSubmitting ? <KeyRoundIcon /> : null}
          </Button>

          <Button asChild variant="ghost" className="h-11 w-full rounded-xl">
            <Link href="/login">
              <ArrowLeftIcon />
              Giriş ekranına dön
            </Link>
          </Button>
        </form>

        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
          <div className="flex items-start gap-3">
            <CheckCircle2Icon className="mt-0.5 size-4 shrink-0" />
            <p className="leading-6">
              Bu akış yalnızca hesap kurtarma için kullanılır; erişim politikaları, olay kaydı ve oturum iptali otomatik olarak arka planda işlenir.
            </p>
          </div>
        </div>
      </div>
    </AuthShell>
  );
}
