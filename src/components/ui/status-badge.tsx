import { Badge } from "@/components/ui/badge";

export function StatusBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: Parameters<typeof Badge>[0]["tone"];
}) {
  return <Badge label={label} tone={tone} />;
}
