import { Badge } from "@/components/ui/badge";

export function ActionBadge({ label }: { label: string }) {
  return <Badge label={label} tone="policy" />;
}
