"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, MailCheckIcon } from "lucide-react";

import { AuthLinks, AuthMessage, AuthShell } from "@/components/auth/auth-shell";
import { useDemo } from "@/components/layout/demo-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const { requestPasswordReset } = useDemo();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const submittedEmail = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();

    if (!submittedEmail) {
      setError("Lütfen e-posta adresini gir.");
      return;
    }

    setIsSubmitting(true);
    const result = await requestPasswordReset(submittedEmail);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error ?? "Şifre sıfırlama isteği tamamlanamadı.");
      return;
    }

    setError(null);
    setSuccess(
      result.message ??
        "Eğer bu e-posta ile bir hesap varsa sıfırlama bağlantısı gönderilecektir.",
    );
  };

  return (
    <AuthShell
      eyebrow="Password Recovery"
      title="Şifreni yenile"
      description="Hesabına yeniden erişmek için e-posta adresini paylaş. Platform, kullanıcı dostu ama güvenli bir geri bildirim üretir."
      footer={<AuthLinks primaryHref="/login" primaryLabel="Giriş ekranına dön" secondaryHref="/register" secondaryLabel="Yeni hesap oluştur" />}
    >
      <div className="space-y-4">
        {error ? <AuthMessage tone="critical" title="İstek alınamadı" description={error} /> : null}
        {success ? <AuthMessage tone="success" title="Talep kaydedildi" description={success} /> : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="forgot-email">E-posta adresi</Label>
            <Input
              id="forgot-email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError(null);
                setSuccess(null);
              }}
              placeholder="name@company.com"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="h-11 rounded-xl px-3.5"
            />
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3 text-sm leading-6 text-[var(--text-secondary)]">
            Hesap varlığını ifşa etmemek için bu akış, kayıtlı e-posta olsa da olmasa da aynı güvenli geri bildirimi verir.
          </div>

          <Button type="submit" className="h-11 w-full rounded-xl" disabled={isSubmitting}>
            {isSubmitting ? "Bağlantı hazırlanıyor..." : "Sıfırlama bağlantısı gönder"}
            {!isSubmitting ? <MailCheckIcon /> : null}
          </Button>

          <Button asChild variant="ghost" className="h-11 w-full rounded-xl">
            <Link href="/login">
              <ArrowLeftIcon />
              Giriş ekranına dön
            </Link>
          </Button>
        </form>
      </div>
    </AuthShell>
  );
}
