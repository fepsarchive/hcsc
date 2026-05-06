const palette = [
  "bg-emerald-500/18 text-emerald-300 dark:text-emerald-200",
  "bg-sky-500/18 text-sky-300 dark:text-sky-200",
  "bg-violet-500/18 text-violet-300 dark:text-violet-200",
  "bg-amber-500/18 text-amber-300 dark:text-amber-200",
  "bg-rose-500/18 text-rose-300 dark:text-rose-200",
];

export function AvatarToken({
  label,
  subtitle,
}: {
  label: string;
  subtitle?: string;
}) {
  const initials = label
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const tone = palette[label.length % palette.length];

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md font-mono text-[11px] font-semibold ${tone}`}>
        {initials}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium text-[var(--text-primary)]" title={label}>{label}</p>
        {subtitle ? <p className="truncate text-[11px] text-[var(--text-muted)]" title={subtitle}>{subtitle}</p> : null}
      </div>
    </div>
  );
}
