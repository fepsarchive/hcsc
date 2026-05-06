import { Badge } from "@/components/ui/badge";
import { ZeroTrustDecision } from "@/types";

export function DecisionBadge({ decision }: { decision: ZeroTrustDecision }) {
  const tone =
    decision === "allow"
      ? "low"
      : decision === "limited_allow"
        ? "info"
        : decision === "require_step_up_auth"
          ? "medium"
          : decision === "deny"
            ? "critical"
            : "deception";

  return <Badge label={decision} tone={tone} />;
}
