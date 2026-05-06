import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  tone = "emerald",
}: {
  value: number;
  tone?: "emerald" | "amber" | "rose" | "sky" | "violet";
}) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/6">
      <div
        className={cn(
          "h-full rounded-full transition-all",
          tone === "emerald" && "bg-emerald-400",
          tone === "amber" && "bg-amber-400",
          tone === "rose" && "bg-rose-400",
          tone === "sky" && "bg-sky-400",
          tone === "violet" && "bg-violet-400",
        )}
        style={{ width: `${Math.max(4, Math.min(value, 100))}%` }}
      />
    </div>
  );
}
