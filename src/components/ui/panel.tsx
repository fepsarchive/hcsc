import { cn } from "@/lib/utils";

export function Panel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "hcsc-panel min-w-0 rounded-[14px] p-4 text-[var(--text-primary)] backdrop-blur lg:p-4",
        className,
      )}
    >
      {children}
    </section>
  );
}
