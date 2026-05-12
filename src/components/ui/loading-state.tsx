import { LoaderCircleIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function LoadingState({
  title = "Yükleniyor",
  description = "Veriler hazırlanıyor, lütfen bekleyin.",
  className,
}: {
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[240px] flex-col items-center justify-center rounded-3xl border border-[var(--border)] bg-[var(--surface)] px-6 py-10 text-center",
        className,
      )}
    >
      <div className="flex size-14 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-300">
        <LoaderCircleIcon className="size-5 animate-spin" />
      </div>
      <h3 className="mt-5 text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
      <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
    </div>
  );
}
