"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, CopyIcon, KeyRoundIcon, QrCodeIcon, ShieldCheckIcon } from "lucide-react";
import QRCode from "qrcode";

import { AuthMessage, AuthShell } from "@/components/auth/auth-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import { Textarea } from "@/components/ui/textarea";
import { confirmTwoFactorSetup, getTwoFactorSetup, HcscApiError, type TwoFactorSetupPayload } from "@/lib/hcsc-api";
import { useSecurityConsoleStore } from "@/store/security-console-store";

function formatManualSecret(secret: string) {
  return secret.match(/.{1,4}/g)?.join(" ") ?? secret;
}

export default function VerifyTwoFactorPage() {
  const router = useRouter();
  const verify2FA = useSecurityConsoleStore((state) => state.verify2FA);
  const hydrateAuthSession = useSecurityConsoleStore((state) => state.hydrateAuthSession);
  const logout = useSecurityConsoleStore((state) => state.logout);
  const currentUser = useSecurityConsoleStore((state) => state.currentUser);

  const [mode, setMode] = useState<"loading" | "setup" | "verify">("loading");
  const [setupData, setSetupData] = useState<TwoFactorSetupPayload | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedRecoveryCodes, setCopiedRecoveryCodes] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationMethod, setVerificationMethod] = useState<"totp" | "recovery">("totp");
  const [generatedRecoveryCodes, setGeneratedRecoveryCodes] = useState<string[] | null>(null);
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null);
  const [recoveryCodesAcknowledged, setRecoveryCodesAcknowledged] = useState(false);
  const [isSwitchingAccount, setIsSwitchingAccount] = useState(false);

  const maskedEmail = useMemo(
    () => currentUser?.email ?? "hesabın",
    [currentUser?.email],
  );
  const formattedRecoveryCodes = useMemo(
    () => (generatedRecoveryCodes ? generatedRecoveryCodes.join("\n") : ""),
    [generatedRecoveryCodes],
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

    if (verificationMethod === "totp") {
      if (normalizedCode.length !== 6) {
        setError("Lütfen authenticator uygulamandaki 6 haneli kodu gir.");
        return;
      }
    } else if (code.trim().length < 8) {
      setError("Lütfen geçerli bir recovery code gir.");
      return;
    }

    setIsSubmitting(true);

    if (mode === "setup") {
      try {
        const result = await confirmTwoFactorSetup(normalizedCode);
        await hydrateAuthSession();
        setError(null);
        if (result.recoveryCodes?.length) {
          setGeneratedRecoveryCodes(result.recoveryCodes);
          setPendingRedirect(result.nextPath ?? (result.onboardingCompleted ? "/dashboard" : "/onboarding"));
          setRecoveryCodesAcknowledged(false);
          setCode("");
        } else {
          router.replace(result.nextPath ?? (result.onboardingCompleted ? "/dashboard" : "/onboarding"));
        }
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

    const result = await verify2FA(verificationMethod === "totp" ? normalizedCode : code.trim(), verificationMethod);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error ?? "Kod doğrulanamadı.");
      return;
    }

    setError(null);
    router.replace(result.redirectTo ?? "/dashboard");
  };

  const handleCopyRecoveryCodes = async () => {
    if (!generatedRecoveryCodes?.length) {
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedRecoveryCodes.join("\n"));
      setCopiedRecoveryCodes(true);
      setTimeout(() => setCopiedRecoveryCodes(false), 2000);
    } catch {
      setError("Recovery code listesi panoya kopyalanamadı. Elle kaydetmeyi deneyebilirsin.");
    }
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

  const handleSwitchAccount = async () => {
    if (isSwitchingAccount) {
      return;
    }

    setIsSwitchingAccount(true);
    setError(null);

    try {
      await logout();
    } finally {
      router.replace("/login");
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
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-sm font-medium text-[var(--text-primary)] hover:text-cyan-300"
            disabled={isSwitchingAccount}
            onClick={() => void handleSwitchAccount()}
          >
            {isSwitchingAccount ? "Oturum temizleniyor..." : "Farklı hesapla giriş yap"}
          </Button>
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
          {generatedRecoveryCodes?.length ? (
            <div className="space-y-4">
              <AuthMessage
                tone="success"
                title="Recovery code setin hazır"
                description="Bu kodları şimdi kaydet. Güvenlik nedeniyle aynı düz metin hali tekrar gösterilmeyecek."
              />
              <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                      Recovery Codes
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                      Authenticator uygulamana erişemediğinde bu tek kullanımlık kodlardan birini kullanarak güvenli giriş yapabilirsin.
                    </p>
                  </div>
                  <Button type="button" variant="outline" className="rounded-xl" onClick={handleCopyRecoveryCodes}>
                    <CopyIcon />
                    {copiedRecoveryCodes ? "Kopyalandı" : "Kopyala"}
                  </Button>
                </div>
                <Textarea
                  readOnly
                  value={formattedRecoveryCodes}
                  className="mt-4 min-h-[220px] rounded-2xl font-mono text-sm leading-7"
                />
                <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-100">
                  Bu kodların her biri yalnızca bir kez kullanılabilir. Kodları parola yöneticinde veya güvenli bir çevrimdışı kasada sakla.
                </div>
                <label className="mt-4 flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm leading-6 text-[var(--text-secondary)]">
                  <Checkbox
                    checked={recoveryCodesAcknowledged}
                    onCheckedChange={(checked) => setRecoveryCodesAcknowledged(Boolean(checked))}
                    className="mt-1"
                  />
                  <span>Recovery code setini güvenli bir yere kaydettiğimi onaylıyorum.</span>
                </label>
              </div>
              <Button
                type="button"
                className="h-11 w-full rounded-xl"
                disabled={!recoveryCodesAcknowledged}
                onClick={() => router.replace(pendingRedirect ?? "/dashboard")}
              >
                Kodları kaydettim, devam et
                <ArrowRightIcon />
              </Button>
            </div>
          ) : (
            <>
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
                      Authenticator uygulamandaki doğrulama koduyla veya recovery code ile oturumunu tamamla.
                    </p>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={verificationMethod === "totp" ? "default" : "outline"}
                    className="rounded-xl"
                    onClick={() => {
                      setVerificationMethod("totp");
                      setCode("");
                      setError(null);
                    }}
                  >
                    Authenticator kodu
                  </Button>
                  <Button
                    type="button"
                    variant={verificationMethod === "recovery" ? "default" : "outline"}
                    className="rounded-xl"
                    onClick={() => {
                      setVerificationMethod("recovery");
                      setCode("");
                      setError(null);
                    }}
                  >
                    Recovery code kullan
                  </Button>
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
                    {verificationMethod === "totp" ? "6 Haneli Kod" : "Recovery Code"}
                  </p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {mode === "setup"
                      ? "Kurulumu tamamlamak için authenticator uygulamandaki ilk geçerli kodu gir."
                      : verificationMethod === "totp"
                        ? "Güvenli oturumu tamamlamak için geçerli TOTP kodunu gir."
                        : "Authenticator uygulamana erişimin yoksa daha önce kaydettiğin tek kullanımlık recovery code gir."}
                  </p>
                </div>
              </div>

              <Input
                value={code}
                onChange={(event) => {
                  const next =
                    verificationMethod === "totp"
                      ? event.target.value.replace(/\D/g, "").slice(0, 6)
                      : event.target.value.toUpperCase();
                  setCode(next);
                  setError(null);
                }}
                inputMode={verificationMethod === "totp" ? "numeric" : "text"}
                placeholder={verificationMethod === "totp" ? "000000" : "HCSC-ABCD-1234"}
                className={`mt-5 h-14 rounded-2xl ${verificationMethod === "totp" ? "text-center text-2xl tracking-[0.45em]" : "font-mono text-base tracking-[0.2em]"}`}
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
                  : verificationMethod === "totp"
                    ? "Doğrula"
                    : "Recovery code ile devam et"}
              {!isSubmitting ? <ArrowRightIcon /> : null}
            </Button>
          </form>
            </>
          )}
        </div>
      )}
    </AuthShell>
  );
}
