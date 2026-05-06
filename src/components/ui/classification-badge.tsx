import { Badge } from "@/components/ui/badge";
import { classificationLabel } from "@/lib/utils";
import { DataClassification } from "@/types";

export function ClassificationBadge({
  classification,
}: {
  classification: DataClassification;
}) {
  const tone =
    classification === "critical"
      ? "critical"
      : classification === "sensitive"
        ? "high"
        : classification === "confidential"
          ? "medium"
          : classification === "internal"
            ? "policy"
            : "neutral";

  return <Badge label={classificationLabel(classification)} tone={tone} />;
}
