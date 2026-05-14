"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, KeyRoundIcon, QrCodeIcon, ShieldCheckIcon } from "lucide-react";
import QRCode from "qrcode";

import { AuthLinks, AuthMessage, AuthShell } from "@/components/auth/auth-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import { confirmTwoFactorSetup, getTwoFactorSetup, HcscApiError, type TwoFactorSetupPayload } from "@/lib/hcsc-api";
import { useSecurityConsoleStore } from "@/store/security-console-store";

function formatManualSecret(secret: string) {
  return secret.match(/.{1,4}/g)?.join(" ") ?? secret;
}

export default function VerifyTwoFactorPage() {
  const router = useRouter();
  const verify2FA = useSecurityConsoleStore((state) => state.verify2FA);
  const hydrateAuthSession = useSecurityConsoleStore((state) => state.hydrateAuthSession);
  const currentUser = useSecurityConsoleStore((state) => state.currentUser);

  const [mode, setMode] = useState<"loading" | "setup" | "verify">("loading");
  const [setupData, setSetupData] = useState<TwoFactorSetupPayload | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const maskedEmail = useMemo(
    () => currentUser?.email ?? "hesabın",
    [currentUser?.email],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadSetupState() {
      try {
        const payload = await getTwoFactorSetup();

        if (cancelled) {
          return;
        }

        setSetupData(payload);
        setMode(payload.mode);
        setError(null);

        if (payload.mode === "setup") {
          try {
            const qr = await QRCode.toDataURL(payload.otpauthUrl, {
              width: 220,
              margin: 1,
              color: {
                dark: "#0f172a",
                light: "#ffffff",
              },
            });

            if (!cancelled) {
              setQrCodeDataUrl(qr);
            }
          } catch {
            if (!cancelled) {
              setQrCodeDataUrl(null);
            }
          }
        } else {
          setQrCodeDataUrl(null);
        }
      } catch (setupError) {
        if (cancelled) {
          return;
        }

        if (setupError instanceof HcscApiError && setupError.code === "UNAUTHENTICATED") {
          router.replace("/login");
          return;
        }

        setMode("verify");
        setQrCodeDataUrl(null);
        setError(
          setupError instanceof HcscApiError
            ? setupError.message
            : "2FA durumu yüklenemedi. Doğrulama kodunu girmeyi tekrar deneyebilirsin.",
        );
      }
    }

    void loadSetupState();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedCode = code.replace(/\D/g, "").slice(0, 6);

    if (normalizedCode.length !== 6) {
      setError("Lütfen authenticator uygulamandaki 6 haneli kodu gir.");
      return;
    }

    setIsSubmitting(true);

    if (mode === "setup") {
      try {
        const result = await confirmTwoFactorSetup(normalizedCode);
        await hydrateAuthSession();
        setError(null);
        router.replace(result.nextPath ?? (result.onboardingCompleted ? "/dashboard" : "/onboarding"));
      } catch (setupError) {
        setError(
          setupError instanceof HcscApiError
            ? setupError.message
            : "Kurulum tamamlanamadı. Lütfen doğrulama kodunu kontrol et.",
        );
      } finally {
        setIsSubmitting(false);
      }

      return;
    }

    const result = await verify2FA(normalizedCode);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error ?? "Kod doğrulanamadı.");
      return;
    }

    setError(null);
    router.replace(result.redirectTo ?? "/dashboard");
  };

  const handleCopySecret = async () => {
    if (setupData?.mode !== "setup") {
      return;
    }

    try {
      await navigator.clipboard.writeText(setupData.manualSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Kurulum anahtarı panoya kopyalanamadı. Elle kopyalamayı deneyebilirsin.");
    }
  };

  return (
    <AuthShell
      eyebrow={mode === "setup" ? "Two Factor Setup" : "Two Factor Verification"}
      title={mode === "setup" ? "İki Aşamalı Doğrulamayı Kur" : "İki Aşamalı Doğrulama"}
      description={
        mode === "setup"
          ? "Google Authenticator, Authy veya 1Password ile QR kodunu okut. Ardından uygulamadaki 6 haneli kodu girerek kurulumu tamamla."
          : `${maskedEmail} hesabı için authenticator uygulamandaki 6 haneli kodu girerek güvenli oturumu tamamla.`
      }
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">
              {mode === "setup" ? "Authenticator Enrollment" : "Verified Sign-In"}
            </Badge>
            {setupData?.mode === "setup" ? (
              <Badge variant="outline">{setupData.issuer}</Badge>
            ) : null}
          </div>
          <AuthLinks primaryHref="/login" primaryLabel="Farklı hesapla giriş yap" />
        </div>
      }
    >
      {mode === "loading" ? (
        <LoadingState
          title="2FA durumu hazırlanıyor"
          description="Kurulum veya doğrulama adımı yükleniyor. Lütfen kısa bir an bekleyin."
          className="min-h-[320px]"
        />
      ) : (
        <div className="space-y-4">
          {error ? <AuthMessage tone="critical" title="2FA işlemi tamamlanamadı" description={error} /> : null}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {mode === "setup" && setupData?.mode === "setup" ? (
              <div className="grid gap-4 lg:grid-cols-[240px,1fr]">
                <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                    <QrCodeIcon className="size-4 text-cyan-300" />
                    QR ile kur
                  </div>
                  <div className="mt-4 flex min-h-[220px] items-center justify-center rounded-2xl bg-white p-4">
                    {qrCodeDataUrl ? (
                      <Image
                        src={qrCodeDataUrl}
                        alt="Authenticator uygulaması için QR kodu"
                        width={220}
                        height={220}
                        unoptimized
                        className="size-[220px] rounded-xl object-contain"
                      />
                    ) : (
                      <p className="max-w-[180px] text-center text-xs leading-6 text-slate-500">
                        QR üretilemezse aşağıdaki manuel anahtarı uygulamana girerek kurulumu tamamlayabilirsin.
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-4 rounded-3xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex size-11 items-center justify-center rounded-2xl border border-cyan-500/25 bg-cyan-500/10 text-cyan-300">
                      <ShieldCheckIcon className="size-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        Authenticator Setup
                      </p>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        Uygulamanda yeni bir TOTP hesabı oluştur ve aşağıdaki anahtarı manuel olarak da ekleyebilirsin.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Manuel kurulum anahtarı</p>
                      <Button type="button" variant="outline" className="h-8 rounded-lg px-3 text-xs" onClick={handleCopySecret}>
                        {copied ? "Kopyalandı" : "Kopyala"}
                      </Button>
                    </div>
                    <p className="mt-2 break-all font-mono text-base font-semibold tracking-[0.18em] text-[var(--text-primary)]">
                      {formatManualSecret(setupData.manualSecret)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
                    QR kodunu okuttuktan sonra uygulamadaki 6 haneli kodu aşağıya gir. Secret yalnızca kurulum sırasında gösterilir.
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl border border-cyan-500/25 bg-cyan-500/10 text-cyan-300">
                    <ShieldCheckIcon className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                      Secure Session
                    </p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Authenticator uygulamandaki doğrulama koduyla oturumunu tamamla.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-5">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl border border-cyan-500/25 bg-cyan-500/10 text-cyan-300">
                  <KeyRoundIcon className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    6 Haneli Kod
                  </p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {mode === "setup"
                      ? "Kurulumu tamamlamak için authenticator uygulamandaki ilk geçerli kodu gir."
                      : "Güvenli oturumu tamamlamak için geçerli TOTP kodunu gir."}
                  </p>
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
                placeholder="000000"
                className="mt-5 h-14 rounded-2xl text-center text-2xl tracking-[0.45em]"
                aria-label="2FA kodu"
              />
            </div>

            <Button type="submit" className="h-11 w-full rounded-xl" disabled={isSubmitting}>
              {isSubmitting
                ? mode === "setup"
                  ? "Kurulum tamamlanıyor..."
                  : "Doğrulanıyor..."
                : mode === "setup"
                  ? "Kurulumu tamamla"
                  : "Doğrula"}
              {!isSubmitting ? <ArrowRightIcon /> : null}
            </Button>
          </form>
        </div>
      )}
    </AuthShell>
  );
}
