import { cn } from "@/lib/utils";

export function RelationPill({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "info" | "policy" | "deception";
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.06em]",
        tone === "neutral" && "border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--text-secondary)]",
        tone === "info" && "border-sky-500/22 bg-sky-500/10 text-sky-700 dark:text-sky-200",
        tone === "policy" && "border-blue-500/22 bg-blue-500/10 text-blue-700 dark:text-blue-200",
        tone === "deception" && "border-violet-500/22 bg-violet-500/10 text-violet-700 dark:text-violet-200",
      )}
      title={label}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      <span className="truncate">{label}</span>
    </span>
  );
}
