"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import "./globals.css";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <html lang="tr">
      <body className="flex min-h-svh items-center justify-center bg-background px-4 text-foreground">
        <div className="w-full max-w-xl rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-[0_22px_60px_rgba(0,0,0,0.18)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">Global Error</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">Platform şu anda yanıt veremiyor</h1>
          <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
            Beklenmeyen bir uygulama hatası oluştu. Birkaç saniye sonra yeniden dene veya ana sayfaya geri dön.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button className="h-11 rounded-xl" onClick={() => unstable_retry()}>
              Tekrar dene
            </Button>
            <Button asChild variant="outline" className="h-11 rounded-xl">
              <Link href="/login">Giriş ekranına dön</Link>
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
