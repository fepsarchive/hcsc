"use client";

import { AlertTriangleIcon, RefreshCwIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <EmptyState
      variant="warning"
      icon={<AlertTriangleIcon className="size-5" />}
      title="Admin verileri alınamadı"
      description="Yetki veya sistem verisi kontrolünde beklenmeyen bir hata oluştu."
      primaryAction={
        <Button onClick={reset}>
          <RefreshCwIcon />
          Yeniden dene
        </Button>
      }
    />
  );
}
