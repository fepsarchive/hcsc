import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";

export function StatCard({
  label,
  value,
  hint,
  tone = "info",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "low" | "medium" | "high" | "critical" | "info" | "deception" | "neutral";
}) {
  return (
    <Panel className="p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
        <Badge label={label} tone={tone} />
      </div>
      <p className="mt-4 text-3xl font-semibold text-white">{value}</p>
      {hint ? <p className="mt-2 text-sm leading-6 text-slate-400">{hint}</p> : null}
    </Panel>
  );
}
