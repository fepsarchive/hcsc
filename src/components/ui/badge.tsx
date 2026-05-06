import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const toneMap = {
  low: "border-emerald-500/24 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
  medium: "border-amber-500/24 bg-amber-500/10 text-amber-700 dark:text-amber-200",
  high: "border-orange-500/24 bg-orange-500/10 text-orange-700 dark:text-orange-200",
  critical: "border-rose-500/24 bg-rose-500/10 text-rose-700 dark:text-rose-200",
  info: "border-sky-500/24 bg-sky-500/10 text-sky-700 dark:text-sky-200",
  deception: "border-violet-500/24 bg-violet-500/10 text-violet-700 dark:text-violet-200",
  neutral: "border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--text-secondary)]",
  policy: "border-blue-500/24 bg-blue-500/10 text-blue-700 dark:text-blue-200",
  compliance: "border-cyan-500/24 bg-cyan-500/10 text-cyan-700 dark:text-cyan-200",
} as const

export type BadgeTone = keyof typeof toneMap

function Badge({
  className,
  variant = "default",
  asChild = false,
  tone,
  label,
  children,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    asChild?: boolean
    tone?: BadgeTone
    label?: string
  }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      data-tone={tone}
      className={cn(
        tone
          ? "inline-flex max-w-full items-center rounded-md border px-2 py-0.5 font-mono text-[10px] font-medium tracking-[0.04em]"
          : badgeVariants({ variant }),
        tone ? toneMap[tone] : "",
        className
      )}
      {...props}
    >
      {label ?? children}
    </Comp>
  )
}

export { Badge, badgeVariants }
