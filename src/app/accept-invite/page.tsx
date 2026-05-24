"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRightIcon, CheckCircle2Icon, ShieldCheckIcon } from "lucide-react";

import { AuthLinks, AuthMessage, AuthShell } from "@/components/auth/auth-shell";
import { useDemo } from "@/components/layout/demo-provider";
import { Button } from "@/components/ui/button";
import { acceptTeamInvite, HcscApiError } from "@/lib/hcsc-api";

const PENDING_INVITE_STORAGE_KEY = "hcsc-pending-invite-token";

export default function AcceptInvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { auth, onboardingCompleted, hydrateAuthSession } = useDemo();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const token = useMemo(() => searchParams.get("token")?.trim() ?? "", [searchParams]);

  const handleStoreAndContinue = () => {
    if (typeof window !== "undefined" && token) {
      window.sessionStorage.setItem(PENDING_INVITE_STORAGE_KEY, token);
    }

    router.push("/login");
  };

  const handleAccept = async () => {
    if (!token) {
      setError("Davet bağlantısı eksik veya bozulmuş görünüyor.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await acceptTeamInvite(token);
      await hydrateAuthSession();

      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(PENDING_INVITE_STORAGE_KEY);
      }

      setSuccess(`${result.organization.name} çalışma alanı hesabına eklendi.`);
      router.replace(onboardingCompleted ? "/dashboard" : "/onboarding");
    } catch (inviteError) {
      if (
        typeof window !== "undefined" &&
        inviteError instanceof HcscApiError &&
        (inviteError.code === "INVITE_INVALID" || inviteError.code === "INVITE_EMAIL_MISMATCH")
      ) {
        window.sessionStorage.removeItem(PENDING_INVITE_STORAGE_KEY);
      }

      setError(
        inviteError instanceof HcscApiError
          ? inviteError.message
          : "Davet kabul edilirken bir sorun oluştu.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <AuthShell
        eyebrow="Team Invite"
        title="Davet bağlantısı eksik"
        description="Takım davetini açmak için geçerli bir bağlantı gerekiyor."
        footer={<AuthLinks primaryHref="/login" primaryLabel="Giriş ekranına dön" secondaryHref="/register" secondaryLabel="Yeni hesap oluştur" />}
      >
        <AuthMessage
          tone="warning"
          title="Geçersiz davet"
          description="Bağlantıdaki davet belirteci bulunamadı. Daveti paylaşan yöneticiden bağlantıyı yeniden istemen gerekir."
        />
      </AuthShell>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <AuthShell
        eyebrow="Team Invite"
        title="Takım davetini kabul et"
        description="Bu çalışma alanına katılmak için önce hesabınla güvenli oturum açman gerekir."
        footer={<AuthLinks primaryHref="/register" primaryLabel="Hesabın yok mu? Yeni hesap oluştur" secondaryHref="/login" secondaryLabel="Giriş ekranına dön" />}
      >
        <div className="space-y-4">
          <AuthMessage
            title="Davetin hazır"
            description="Giriş yaptıktan sonra bu davet otomatik olarak kaldığı yerden devam eder."
          />
          <Button className="h-11 w-full rounded-xl" onClick={handleStoreAndContinue}>
            Giriş yap ve devam et
            <ArrowRightIcon />
          </Button>
        </div>
      </AuthShell>
    );
  }

  if (!auth.is2FAVerified) {
    return (
      <AuthShell
        eyebrow="Team Invite"
        title="Önce 2FA doğrulamasını tamamla"
        description="Takım davetini güvenli şekilde kabul etmek için aktif oturumunda iki aşamalı doğrulama gerekir."
        footer={<AuthLinks primaryHref="/verify-2fa" primaryLabel="2FA ekranına git" secondaryHref="/dashboard" secondaryLabel="Ana panele dön" />}
      >
        <AuthMessage
          tone="warning"
          title="Ek doğrulama gerekli"
          description="Güvenlik nedeniyle davet kabulü yalnızca doğrulanmış oturumlarla tamamlanır."
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Team Invite"
      title="Takım davetini onayla"
      description="Kurumsal çalışma alanına katılmadan önce son kez doğrula. Kabul edildiğinde oturumun yeni organizasyon bağlamına geçirilir."
      footer={<AuthLinks primaryHref="/dashboard" primaryLabel="Ana panele dön" secondaryHref="/settings" secondaryLabel="Ayarları aç" />}
    >
      <div className="space-y-4">
        {error ? <AuthMessage tone="critical" title="Davet kabul edilemedi" description={error} /> : null}
        {success ? <AuthMessage tone="success" title="Davet kabul edildi" description={success} /> : null}

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-4 text-sm leading-6 text-[var(--text-secondary)]">
          <div className="flex items-start gap-3">
            <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-cyan-300" />
            <p>
              Davet kabul edildiğinde rol ataman aktive edilir ve mevcut doğrulanmış oturumun hedef çalışma alanına geçirilir.
            </p>
          </div>
        </div>

        <Button className="h-11 w-full rounded-xl" onClick={handleAccept} disabled={isSubmitting}>
          {isSubmitting ? "Davet işleniyor..." : "Daveti kabul et"}
          {!isSubmitting ? <CheckCircle2Icon /> : null}
        </Button>

        {!onboardingCompleted ? (
          <p className="text-xs leading-6 text-[var(--text-muted)]">
            İlk kurulumun tamamlanmamışsa, davet sonrası otomatik olarak onboarding akışına yönlendirilirsin.
          </p>
        ) : null}
      </div>
    </AuthShell>
  );
}
