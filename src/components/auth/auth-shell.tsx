"use client";

import Link from "next/link";
import { ShieldCheckIcon, SparklesIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type AuthShellProps = {
  badge?: string;
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  eyebrow?: string;
  sideTitle?: string;
  sideDescription?: string;
};

const platformHighlights = [
  "Zero Trust kararları ve erişim talepleri",
  "Deception, olay yönetimi ve SOAR akışları",
  "Uyumluluk, raporlama ve executive briefing görünümü",
];

export function AuthShell({
  badge = "Hybrid Cloud Security Console",
  title,
  description,
  children,
  footer,
  eyebrow = "Secure Access",
  sideTitle = "Gerçek SaaS paneli akışı için güvenli başlangıç",
  sideDescription = "HCSC; kimlik doğrulama, onboarding, aktif savunma ve operasyon görünürlüğünü aynı deneyimde birleştirir.",
}: AuthShellProps) {
  return (
    <main className="min-h-svh bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.12),transparent_24%),var(--background)] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100svh-2.5rem)] w-full max-w-[1480px] gap-5 xl:grid-cols-[1.05fr_minmax(420px,520px)]">
        <section className="hidden min-w-0 overflow-hidden rounded-[32px] border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_82%,transparent)] p-8 shadow-[var(--panel-shadow)] backdrop-blur xl:flex xl:flex-col xl:justify-between">
          <div>
            <Badge variant="outline" className="gap-2">
              <ShieldCheckIcon className="size-4" />
              {badge}
            </Badge>
            <h1 className="mt-8 max-w-3xl text-balance text-5xl font-semibold tracking-tight text-[var(--text-primary)]">
              {sideTitle}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-9 text-[var(--text-secondary)]">{sideDescription}</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {platformHighlights.map((item) => (
              <div
                key={item}
                className="rounded-3xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-elevated)_82%,transparent)] p-5"
              >
                <div className="flex size-10 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-300">
                  <SparklesIcon className="size-4" />
                </div>
                <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex min-w-0 items-center justify-center">
          <div className="w-full rounded-[32px] border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] p-5 shadow-[0_26px_90px_rgba(0,0,0,0.22)] backdrop-blur sm:p-6 lg:p-7">
            <Badge variant="outline" className="gap-2 xl:hidden">
              <ShieldCheckIcon className="size-4" />
              {badge}
            </Badge>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">{eyebrow}</p>
            <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-4xl">
              {title}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">{description}</p>

            <div className="mt-6">{children}</div>

            {footer ? <div className="mt-6 border-t border-[var(--border)] pt-5">{footer}</div> : null}
          </div>
        </section>
      </div>
    </main>
  );
}

export function AuthLinks({
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  className,
}: {
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)]", className)}>
      <Link href={primaryHref} className="font-medium text-[var(--text-primary)] transition hover:text-cyan-300">
        {primaryLabel}
      </Link>
      {secondaryHref && secondaryLabel ? (
        <Link href={secondaryHref} className="transition hover:text-[var(--text-primary)]">
          {secondaryLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function AuthMessage({
  tone = "info",
  title,
  description,
}: {
  tone?: "info" | "success" | "warning" | "critical";
  title: string;
  description: string;
}) {
  const toneClassName =
    tone === "success"
      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
      : tone === "warning"
        ? "border-amber-500/25 bg-amber-500/10 text-amber-200"
        : tone === "critical"
          ? "border-rose-500/25 bg-rose-500/10 text-rose-200"
          : "border-cyan-500/20 bg-cyan-500/10 text-cyan-100";

  return (
    <div className={cn("rounded-2xl border px-4 py-3 text-sm", toneClassName)}>
      <p className="font-medium">{title}</p>
      <p className="mt-1 leading-6 opacity-90">{description}</p>
    </div>
  );
}
