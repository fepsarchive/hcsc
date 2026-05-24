import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4">
      <div className="w-full max-w-xl rounded-[28px] border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-[0_22px_60px_rgba(0,0,0,0.18)]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">404</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">Aradığın sayfa bulunamadı</h1>
        <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
          Bağlantı süresi dolmuş, taşınmış veya yazım hatası içeriyor olabilir. Güvenli şekilde ana akışa geri dönebilirsin.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild className="h-11 rounded-xl">
            <Link href="/dashboard">Ana panele dön</Link>
          </Button>
          <Button asChild variant="outline" className="h-11 rounded-xl">
            <Link href="/login">Giriş ekranına dön</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
