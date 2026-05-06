import { Button } from "@/components/ui/button";

export function PageIntro({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick?: () => void;
  };
}) {
  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="font-mono text-[10px] font-medium tracking-[0.06em] text-[var(--text-muted)]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-0.5 text-balance text-[18px] font-semibold tracking-tight text-[var(--text-primary)] md:text-[19px]">
          {title}
        </h1>
        <p className="mt-1 max-w-4xl text-pretty text-[13px] leading-5 text-[var(--text-muted)]">{description}</p>
      </div>
      {action ? <Button onClick={action.onClick}>{action.label}</Button> : null}
    </div>
  );
}
