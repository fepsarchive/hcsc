"use client";

import { useEffect } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[app-error]", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4">
      <div className="w-full max-w-xl rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-[0_22px_60px_rgba(0,0,0,0.18)]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">Application Error</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">Bir sorun oluştu</h1>
        <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
          İstek işlenirken beklenmeyen bir hata oluştu. Sayfayı yenileyebilir veya ana panele geri dönebilirsin.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button className="h-11 rounded-xl" onClick={() => unstable_retry()}>
            Tekrar dene
          </Button>
          <Button asChild variant="outline" className="h-11 rounded-xl">
            <Link href="/dashboard">Ana panele dön</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
