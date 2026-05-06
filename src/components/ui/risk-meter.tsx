import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { RiskAssessment } from "@/types";

export function RiskMeter({ risk }: { risk: RiskAssessment }) {
  const tone =
    risk.level === "critical"
      ? "critical"
      : risk.level === "high"
        ? "high"
        : risk.level === "medium"
          ? "medium"
          : "low";

  const progressTone =
    risk.level === "critical"
      ? "rose"
      : risk.level === "high"
        ? "amber"
        : risk.level === "medium"
          ? "sky"
          : "emerald";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-200">{risk.score}/100</span>
        <Badge label={risk.level} tone={tone} />
      </div>
      <ProgressBar value={risk.score} tone={progressTone} />
    </div>
  );
}
