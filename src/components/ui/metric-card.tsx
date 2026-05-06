import { StatusBadge } from "@/components/ui/status-badge";

const toneLabelMap = {
  neutral: "Stable",
  info: "Tracked",
  critical: "Critical",
  high: "High",
  medium: "Attention",
  low: "Healthy",
  deception: "Deception",
  policy: "Policy",
  compliance: "Aligned",
} as const;

export function MetricCard({
  label,
  value,
  tone = "neutral",
  hint,
}: {
  label: string;
  value: string | number;
  tone?: Parameters<typeof StatusBadge>[0]["tone"];
  hint?: string;
}) {
  const toneLabel = toneLabelMap[tone ?? "neutral"] ?? "Tracked";

  return (
    <div className="flex min-h-[132px] flex-col justify-between rounded-[12px] border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 max-w-[60%] text-pretty font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">
          {label}
        </p>
        <StatusBadge label={toneLabel} tone={tone} />
      </div>
      <p className="mt-4 break-words text-[24px] font-semibold text-[var(--text-primary)]">{value}</p>
      {hint ? <p className="mt-1.5 text-pretty text-[11px] leading-5 text-[var(--text-muted)]">{hint}</p> : null}
    </div>
  );
}
