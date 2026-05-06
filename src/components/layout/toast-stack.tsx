"use client";

import { useEffect } from "react";
import { useDemo } from "@/components/layout/demo-provider";
import { ActionButton } from "@/components/ui/action-button";

const toneMap = {
  success: "border-emerald-500/24 bg-emerald-500/8 text-emerald-200",
  info: "border-sky-500/24 bg-sky-500/8 text-sky-200",
  warning: "border-amber-500/24 bg-amber-500/8 text-amber-200",
  critical: "border-rose-500/24 bg-rose-500/8 text-rose-200",
  deception: "border-violet-500/24 bg-violet-500/8 text-violet-200",
  policy: "border-blue-500/24 bg-blue-500/8 text-blue-200",
  compliance: "border-cyan-500/24 bg-cyan-500/8 text-cyan-200",
} as const;

export function ToastStack() {
  const { toasts, dismissToast } = useDemo();

  useEffect(() => {
    const ids = toasts.map((toast) =>
      window.setTimeout(() => dismissToast(toast.id), 4500),
    );

    return () => {
      ids.forEach((id) => window.clearTimeout(id));
    };
  }, [dismissToast, toasts]);

  return (
    <div
      className="pointer-events-none fixed top-[calc(var(--header-height)+0.75rem)] right-3 z-[90] flex w-[min(100vw-1.5rem,380px)] flex-col gap-2 md:right-4"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto animate-[toast-in_180ms_ease-out] rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3.5 shadow-[0_18px_40px_rgba(0,0,0,0.22)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 inline-flex h-9 w-1.5 shrink-0 rounded-full ${toneMap[toast.tone]}`} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)] break-words">{toast.title}</p>
                  <p className="mt-1 text-[13px] leading-5 text-[var(--text-secondary)] break-words">
                    {toast.description}
                  </p>
                </div>
              </div>
              {toast.actionLabel ? (
                <div className="mt-3 pl-[1.65rem]">
                  <ActionButton variant="ghost" className="h-7 px-2.5 text-xs">
                    {toast.actionLabel}
                  </ActionButton>
                </div>
              ) : null}
            </div>
            <ActionButton
              variant="ghost"
              className="h-7 shrink-0 px-2 text-xs"
              onClick={() => dismissToast(toast.id)}
              aria-label="Toast mesajını kapat"
            >
              ×
            </ActionButton>
          </div>
        </div>
      ))}
    </div>
  );
}
