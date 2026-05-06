import { Badge } from "@/components/ui/badge";
import { RiskLevel } from "@/types";

export function RiskBadge({ level }: { level: RiskLevel }) {
  const tone =
    level === "critical"
      ? "critical"
      : level === "high"
        ? "high"
        : level === "medium"
          ? "medium"
          : "low";

  return <Badge label={level} tone={tone} />;
}
