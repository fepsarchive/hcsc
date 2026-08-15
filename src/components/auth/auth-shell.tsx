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
  sideTitle?: React.ReactNode;
  sideDescription?: string;
  sideHighlights?: Array<{
    title: string;
    description: string;
  }>;
  sideFooter?: React.ReactNode;
};

const defaultPlatformHighlights = [
  {
    title: "Zero Trust Operations",
    description: "Kimlik, cihaz güveni ve veri sınıfı aynı karar akışında birleşir.",
  },
  {
    title: "Active Defense",
    description: "Deception, olay yönetimi ve yanıt otomasyonları tek panelde toplanır.",
  },
  {
    title: "Reporting & Audit",
    description: "Uyumluluk, rapor çıktıları ve denetim izleri sürekli görünür kalır.",
  },
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
  sideHighlights = defaultPlatformHighlights,
  sideFooter,
}: AuthShellProps) {
  return (
    <main className="h-svh overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.12),transparent_24%),var(--background)] p-3 sm:p-4 lg:p-5">
      <div className="auth-layout mx-auto grid h-full w-full max-w-[1500px] gap-4">
        <section className="auth-side hidden min-h-0 min-w-0 overflow-hidden p-8 2xl:px-10 2xl:py-11">
          <div>
            <Badge variant="outline" className="gap-2">
              <ShieldCheckIcon className="size-4" />
              {badge}
            </Badge>
            <h1 className="mt-8 max-w-[50rem] text-balance text-[clamp(3rem,4.3vw,4.25rem)] font-semibold leading-[0.98] tracking-tight text-[var(--text-primary)]">
              {sideTitle}
            </h1>
            <p className="mt-6 max-w-[44rem] text-base leading-8 text-[var(--text-secondary)]">{sideDescription}</p>
          </div>

          {sideFooter ? (
            <div className="pt-10">{sideFooter}</div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-3">
              {sideHighlights.map((item) => (
                <div
                  key={item.title}
                  className="rounded-[26px] border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-elevated)_86%,transparent)] p-4"
                >
                  <div className="flex size-10 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-300">
                    <SparklesIcon className="size-4" />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{item.description}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="flex min-h-0 min-w-0 items-center justify-center">
          <div className="auth-shell-card w-full max-w-[560px] rounded-[28px] border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] p-4 shadow-[0_26px_90px_rgba(0,0,0,0.22)] backdrop-blur sm:p-5 lg:p-6">
            <Badge variant="outline" className="auth-mobile-badge gap-2">
              <ShieldCheckIcon className="size-4" />
              {badge}
            </Badge>
            <p className="auth-eyebrow mt-3 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">{eyebrow}</p>
            <h2 className="auth-title mt-3 text-balance text-3xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-4xl">
              {title}
            </h2>
            <p className="auth-description mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">{description}</p>

            <div className="auth-content mt-5">{children}</div>

            {footer ? <div className="auth-footer mt-5 border-t border-[var(--border)] pt-4">{footer}</div> : null}
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
