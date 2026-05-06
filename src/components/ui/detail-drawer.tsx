"use client";

import { ActionButton } from "@/components/ui/action-button";

export function DetailDrawer({
  open,
  onClose,
  title,
  subtitle,
  badge,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-[2px]"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="hcsc-drawer absolute right-0 top-0 h-full w-full border-l border-[var(--border)] shadow-[0_0_0_1px_rgba(255,255,255,0.02)] transition duration-200 ease-out md:max-w-[560px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-balance text-[17px] font-semibold text-[var(--text-primary)]">{title}</h2>
                {badge}
              </div>
              {subtitle ? (
                <p className="mt-1 text-pretty text-[13px] leading-5 text-[var(--text-secondary)]">{subtitle}</p>
              ) : null}
            </div>
            <ActionButton variant="secondary" onClick={onClose} aria-label="Detay panelini kapat">
              Kapat
            </ActionButton>
          </div>
          <div className="hcsc-scrollbar min-h-0 flex-1 overflow-y-auto bg-[var(--surface-elevated)] px-4 py-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
