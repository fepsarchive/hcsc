import { ReportPrintView } from "@/components/reports/report-print-view";

export default async function ReportPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ReportPrintView reportId={id} />;
}
