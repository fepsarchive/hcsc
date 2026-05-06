import { PageIntro } from "@/components/ui/page-intro";
import { Panel } from "@/components/ui/panel";
import { ViewToolbar } from "@/components/database/view-toolbar";

export function DatabaseShell({
  title,
  subtitle,
  count,
  toolbarTitle,
  primaryActionLabel,
  onPrimaryAction,
  toolbarExtra,
  children,
}: {
  title: string;
  subtitle: string;
  count: number;
  toolbarTitle?: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  toolbarExtra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="px-1 py-1">
        <PageIntro title={title} description={subtitle} />
      </div>

      <Panel className="overflow-hidden rounded-[14px] p-0">
        <ViewToolbar
          title={toolbarTitle ?? title}
          count={count}
          primaryActionLabel={primaryActionLabel}
          onPrimaryAction={onPrimaryAction}
          extra={toolbarExtra}
        />
        <div className="overflow-hidden">{children}</div>
      </Panel>
    </div>
  );
}
