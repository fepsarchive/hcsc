"use client";

import { useState } from "react";
import { ActionButton } from "@/components/ui/action-button";
import { StatusBadge } from "@/components/ui/status-badge";

export function ViewToolbar({
  title,
  count,
  primaryActionLabel,
  onPrimaryAction,
  extra,
}: {
  title: string;
  count: number;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  extra?: React.ReactNode;
}) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortMode, setSortMode] = useState<"default" | "alphabetic" | "priority">("default");
  const [density, setDensity] = useState<"standard" | "compact">("standard");

  return (
    <div className="flex flex-col gap-2 border-b border-[var(--border)] px-3 py-2.5 lg:flex-row lg:items-center lg:justify-between lg:px-4">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="truncate text-[15px] font-medium text-[var(--text-primary)]">{title}</h2>
            <StatusBadge label={`${count}`} tone="neutral" />
          </div>
        </div>
        {filterOpen ? <StatusBadge label="Filter On" tone="info" /> : null}
        {sortMode !== "default" ? (
          <StatusBadge label={sortMode === "alphabetic" ? "Sort A-Z" : "Sort Priority"} tone="policy" />
        ) : null}
        {density === "compact" ? <StatusBadge label="Compact" tone="neutral" /> : null}
        {extra}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <ActionButton variant={filterOpen ? "secondary" : "ghost"} onClick={() => setFilterOpen((current) => !current)}>
          Filtre
        </ActionButton>
        <ActionButton
          variant={sortMode === "default" ? "ghost" : "secondary"}
          onClick={() =>
            setSortMode((current) =>
              current === "default" ? "alphabetic" : current === "alphabetic" ? "priority" : "default"
            )
          }
        >
          Sırala
        </ActionButton>
        <ActionButton
          variant={density === "compact" ? "secondary" : "ghost"}
          onClick={() => setDensity((current) => (current === "standard" ? "compact" : "standard"))}
        >
          Seçenekler
        </ActionButton>
        {primaryActionLabel ? (
          <ActionButton onClick={onPrimaryAction}>{primaryActionLabel}</ActionButton>
        ) : null}
      </div>
    </div>
  );
}
