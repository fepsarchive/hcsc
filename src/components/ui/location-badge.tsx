import { Badge } from "@/components/ui/badge";
import { locationLabel } from "@/lib/utils";
import { CloudLocation } from "@/types";

export function LocationBadge({ location }: { location: CloudLocation }) {
  const tone =
    location === "deception"
      ? "deception"
      : location === "public_cloud"
        ? "info"
        : location === "private_cloud"
          ? "low"
          : location === "backup"
            ? "medium"
            : "policy";

  return <Badge label={locationLabel(location)} tone={tone} />;
}
