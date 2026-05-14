import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1 text-balance text-[20px] font-semibold text-[var(--text-primary)] sm:text-2xl">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-3xl text-pretty text-[13px] leading-6 text-[var(--text-secondary)] sm:text-sm">
            {description}
          </p>
        ) : null}
      </div>

      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
