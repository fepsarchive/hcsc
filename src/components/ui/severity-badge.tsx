import { Badge } from "@/components/ui/badge";
import { EventSeverity } from "@/types";

export function SeverityBadge({ severity }: { severity: EventSeverity }) {
  const tone =
    severity === "critical"
      ? "critical"
      : severity === "high"
        ? "high"
      : severity === "medium"
        ? "medium"
        : severity === "info"
          ? "info"
        : "low";

  return <Badge label={severity} tone={tone} />;
}
