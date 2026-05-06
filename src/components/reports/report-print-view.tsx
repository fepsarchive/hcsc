"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useDemo } from "@/components/layout/demo-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";

const reportToneMap = {
  general: "info",
  "critical-data": "critical",
  "zero-trust": "policy",
  deception: "deception",
  nist: "compliance",
  privacy: "info",
  demo: "deception",
} as const;

export function ReportPrintView({ reportId }: { reportId: string }) {
  const router = useRouter();
  const { reports, environment, currentOrganization, currentUser, dashboard, complianceScores, addAuditLog } = useDemo();
  const report = reports.find((entry) => entry.id === reportId) ?? null;

  const relatedEvents = useMemo(
    () => environment.events.filter((event) => report?.relatedEventIds.includes(event.id)).slice(0, 4),
    [environment.events, report],
  );
  const relatedAssets = useMemo(
    () => environment.assets.filter((asset) => report?.relatedAssetIds?.includes(asset.id)).slice(0, 4),
    [environment.assets, report],
  );

  if (!report) {
    return (
      <main className="min-h-svh bg-white px-6 py-10 text-slate-900">
        <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold">Rapor bulunamadı</h1>
          <p className="mt-3 text-sm text-slate-600">İstenen rapor mevcut state içinde bulunamadı.</p>
          <Button className="mt-6" variant="outline" onClick={() => router.push("/reports")}>
            Reports sayfasına dön
          </Button>
        </div>
      </main>
    );
  }

  const handlePrint = () => {
    addAuditLog({
      action: "report_printed",
      module: "Reports",
      target: report.title,
      severity: "info",
      result: "success",
      details: `${report.title} print görünümünden yazdırıldı.`,
    });
    window.print();
  };

  return (
    <main className="h-svh overflow-hidden bg-slate-100 px-3 py-3 text-slate-900 print:h-auto print:bg-white print:px-0 print:py-0">
      <div className="mx-auto flex h-full w-full max-w-[210mm] flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)] print:h-[297mm] print:max-w-none print:rounded-none print:border-0 print:shadow-none">
        <div className="no-print flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Professional Print Template</p>
            <p className="mt-1 text-sm text-slate-600">A4 uyumlu HCSC v1 kurumsal rapor görünümü</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/reports")}>
              Geri dön
            </Button>
            <Button onClick={handlePrint}>Yazdır</Button>
          </div>
        </div>

        <article className="hcsc-scrollbar flex-1 overflow-hidden px-6 py-5 print:px-8 print:py-7">
          <div className="grid h-full grid-rows-[auto_auto_auto_auto_1fr_auto] gap-4">
          <header className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Hybrid Cloud Security Console</p>
                <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-slate-950">{report.title}</h1>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {currentOrganization.name} için üretilen bu rapor; hibrit bulut güvenlik görünürlüğünü, Zero Trust kararlarını,
                  deception olaylarını ve uyumluluk etkilerini kurumsal çıktı formatında özetler.
                </p>
              </div>
              <div className="grid min-w-[210px] gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Organization</p>
                  <p className="mt-1 font-medium text-slate-950">{currentOrganization.name}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Prepared By</p>
                  <p className="mt-1 font-medium text-slate-950">{currentUser?.name ?? "HCSC System"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Generated At</p>
                  <p className="mt-1 font-medium text-slate-950">{formatDateTime(report.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Confidentiality</p>
                  <p className="mt-1 font-medium text-slate-950">Internal / Thesis Prototype</p>
                </div>
              </div>
            </div>
          </header>

          <section className="grid gap-3 md:grid-cols-4">
            <SnapshotCard label="Security Score" value={`${dashboard.securityScore}/100`} />
            <SnapshotCard label="Critical Events" value={String(environment.events.filter((event) => event.severity === "critical").length)} />
            <SnapshotCard label="Compliance" value={`${complianceScores.overallScore}%`} />
            <SnapshotCard label="Report Type" value={report.type} />
          </section>

          <Section title="Executive Summary" compact>
            <p className="text-sm leading-7 text-slate-700">{report.summary}</p>
          </Section>

          <section className="grid min-h-0 gap-4 lg:grid-cols-[1.05fr,0.95fr]">
            <div className="grid min-h-0 gap-4">
              <Section title="Critical Findings">
                <BulletList items={report.findings.slice(0, 4)} />
              </Section>
              <Section title="Event Timeline">
                {relatedEvents.length ? (
                  <div className="space-y-2">
                    {relatedEvents.map((event) => (
                      <div key={event.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium text-slate-950">{event.title}</p>
                          <Badge label={event.severity} tone={reportToneMap[report.type]} />
                        </div>
                        <p className="mt-1 text-sm leading-6 text-slate-700">{event.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyLine text="Bu rapor için ek olay zaman çizelgesi bulunmuyor." />
                )}
              </Section>
            </div>

            <div className="grid min-h-0 gap-4">
              <Section title="Affected Assets">
                {relatedAssets.length ? (
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-slate-600">Asset</th>
                          <th className="px-3 py-2 text-left font-medium text-slate-600">Risk</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {relatedAssets.map((asset) => (
                          <tr key={asset.id}>
                            <td className="px-3 py-2 font-medium text-slate-900">{asset.name}</td>
                            <td className="px-3 py-2 text-slate-700">{asset.risk.level}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyLine text="Bu rapora bağlı ek varlık bulunmuyor." />
                )}
              </Section>

              <Section title="Risk Matrix">
                <BulletList items={report.risks.slice(0, 4)} />
              </Section>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <Section title="NIST CSF Mapping">
              <BulletList items={complianceScores.nist.slice(0, 4).map((item) => `${item.name}: ${item.score}%`)} />
            </Section>
            <Section title="KVKK / GDPR Impact">
              <BulletList
                items={[
                  `KVKK görünürlüğü ${complianceScores.kvkkScore}% seviyesinde.`,
                  `GDPR görünürlüğü ${complianceScores.gdprScore}% seviyesinde.`,
                  `Privacy kapsamlı veri varlıkları export ve şifreleme kontrolleriyle birlikte izleniyor.`,
                ]}
              />
            </Section>
          </section>

          <Section title="Recommended Actions" compact>
            <BulletList items={report.recommendedActions.slice(0, 4)} />
          </Section>

          <footer className="border-t border-slate-200 pt-4 text-xs text-slate-500">
            Generated by Hybrid Cloud Security Console • {currentOrganization.name} • {formatDateTime(report.createdAt)}
          </footer>
          </div>
        </article>
      </div>
    </main>
  );
}

function Section({ title, children, compact = false }: { title: string; children: React.ReactNode; compact?: boolean }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      <div className={`mt-3 rounded-2xl border border-slate-200 bg-white ${compact ? "p-4" : "p-4"}`}>{children}</div>
    </section>
  );
}

function SnapshotCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 text-sm leading-6 text-slate-700">
      {items.map((item) => (
        <li key={item} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
          {item}
        </li>
      ))}
    </ul>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="text-sm leading-7 text-slate-600">{text}</p>;
}
