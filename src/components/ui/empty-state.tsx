export function EmptyState({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  variant = "default",
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  variant?: "default" | "warning" | "critical";
}) {
  return (
    <div
      className={`rounded-2xl border p-8 text-center ${
        variant === "critical"
          ? "border-rose-500/20 bg-rose-500/[0.05]"
          : variant === "warning"
            ? "border-amber-500/20 bg-amber-500/[0.05]"
            : "border-[var(--border)] bg-[var(--surface)]"
      }`}
    >
      {icon ? (
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] text-base text-[var(--text-secondary)] shadow-sm">
          {icon}
        </div>
      ) : null}
      <h3 className="text-base font-semibold text-[var(--text-primary)] break-words">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)] break-words">{description}</p>
      {primaryAction || secondaryAction ? (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {primaryAction}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  );
}
