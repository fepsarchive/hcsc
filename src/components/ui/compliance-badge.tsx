import { Badge } from "@/components/ui/badge";

export function ComplianceBadge({
  status,
}: {
  status: "compliant" | "partial" | "non_compliant" | "not_applicable";
}) {
  const tone =
    status === "compliant"
      ? "low"
      : status === "partial"
        ? "medium"
        : status === "non_compliant"
          ? "critical"
          : "neutral";

  return <Badge label={status} tone={tone} />;
}
