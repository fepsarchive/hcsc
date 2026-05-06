import { cn } from "@/lib/utils";

export function DataTable({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="hcsc-scrollbar overflow-x-auto">
      <table className={cn("hcsc-database min-w-full border-separate border-spacing-0 text-left text-sm", className)}>
        {children}
      </table>
    </div>
  );
}

export function DataTableHead({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <thead className="sticky top-0 z-10 bg-[var(--surface)] backdrop-blur">
      {children}
    </thead>
  );
}

export function DataTableHeaderRow({
  children,
}: {
  children: React.ReactNode;
}) {
  return <tr className="text-[var(--text-muted)]">{children}</tr>;
}

export function DataTableHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "border-b border-[var(--border)] px-3 py-2.5 text-[13px] font-medium text-[var(--text-secondary)] lg:px-4",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function DataTableBody({
  children,
}: {
  children: React.ReactNode;
}) {
  return <tbody>{children}</tbody>;
}

export function DataTableRow({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        "transition",
        onClick ? "cursor-pointer hover:bg-[color-mix(in_srgb,var(--surface-elevated)_86%,transparent)]" : "",
      )}
    >
      {children}
    </tr>
  );
}

export function DataTableCell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td
      className={cn(
        "px-3 py-2.5 align-middle text-[14px] text-[var(--text-primary)] lg:px-4",
        className,
      )}
    >
      {children}
    </td>
  );
}
