import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const variants = {
  primary:
    "hcsc-button-primary border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--text-primary)] hover:bg-[color-mix(in_srgb,var(--surface-elevated)_82%,white_6%)]",
  secondary:
    "hcsc-button-secondary border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[color-mix(in_srgb,var(--surface)_86%,white_5%)] hover:text-[var(--text-primary)]",
  ghost:
    "hcsc-button-ghost text-[var(--text-secondary)] hover:bg-[color-mix(in_srgb,var(--surface-elevated)_65%,transparent)] hover:text-[var(--text-primary)]",
};

export function ActionButton({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
}) {
  return (
    <button
      className={cn(
        "inline-flex h-8 items-center justify-center rounded-md px-2.5 text-[13px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]/40",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
