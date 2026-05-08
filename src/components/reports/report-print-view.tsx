"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { getReportPrintPayload, printReport, type ReportPrintPayload } from "@/lib/hcsc-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";

const reportToneMap = {
  general: "info",
  critical_data: "critical",
  zero_trust: "policy",
  deception: "deception",
  nist: "compliance",
  privacy: "info",
  demo: "deception",
} as const;

export function ReportPrintView({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [payload, setPayload] = useState<ReportPrintPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPayload = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const nextPayload = await getReportPrintPayload(reportId);
      setPayload(nextPayload);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Print payload alınamadı.";
      setError(message);
      setPayload(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      try {
        const nextPayload = await getReportPrintPayload(reportId);

        if (!isMounted) {
          return;
        }

        setPayload(nextPayload);
        setError(null);
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        const message = loadError instanceof Error ? loadError.message : "Print payload alınamadı.";
        setError(message);
        setPayload(null);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void hydrate();

    return () => {
      isMounted = false;
    };
  }, [reportId]);

  const reportTypeTone = payload
    ? reportToneMap[payload.report.type as keyof typeof reportToneMap] ?? "info"
    : "info";

  const criticalEventCount = useMemo(
    () => payload?.eventTimeline.filter((event) => event.severity === "critical").length ?? 0,
    [payload],
  );

  const handlePrint = async () => {
    if (!payload) {
      return;
    }

    setIsPrinting(true);

    try {
      await printReport(reportId);
      toast.success("Print audit kaydı oluşturuldu.");
      window.print();
    } catch (printError) {
      const message = printError instanceof Error ? printError.message : "Print kaydı oluşturulamadı.";
      toast.error(message);
    } finally {
      setIsPrinting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-svh bg-white px-6 py-10 text-slate-900">
        <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold">Print payload hazırlanıyor</h1>
          <p className="mt-3 text-sm text-slate-600">Rapor snapshot ve branding bilgileri veritabanından okunuyor.</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-svh bg-white px-6 py-10 text-slate-900">
        <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold">Print görünümü yüklenemedi</h1>
          <p className="mt-3 text-sm text-slate-600">{error}</p>
          <div className="mt-6 flex gap-2">
            <Button variant="outline" onClick={() => router.push("/reports")}>
              Reports sayfasına dön
            </Button>
            <Button onClick={() => void loadPayload()}>Tekrar dene</Button>
          </div>
        </div>
      </main>
    );
  }

  if (!payload) {
    return (
      <main className="min-h-svh bg-white px-6 py-10 text-slate-900">
        <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold">Rapor bulunamadı</h1>
          <p className="mt-3 text-sm text-slate-600">İstenen rapor için veritabanında yazdırılabilir snapshot bulunamadı.</p>
          <Button className="mt-6" variant="outline" onClick={() => router.push("/reports")}>
            Reports sayfasına dön
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="hcsc-scrollbar min-h-svh overflow-y-auto bg-[linear-gradient(180deg,#eef2f7_0%,#f5f7fb_100%)] px-4 py-5 text-slate-900 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto flex w-full max-w-[210mm] flex-col overflow-hidden rounded-[28px] border border-slate-200/90 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.1)] print:min-h-[297mm] print:max-w-none print:rounded-none print:border-0 print:shadow-none">
        <div className="print:hidden flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Professional Print Template</p>
            <p className="mt-1 text-sm text-slate-600">A4 uyumlu HCSC v2 rapor çıktısı</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/reports")}>
              Geri dön
            </Button>
            <Button onClick={handlePrint} disabled={isPrinting}>
              {isPrinting ? "Hazırlanıyor..." : "Yazdır"}
            </Button>
          </div>
        </div>

        <article className="px-6 py-6 print:px-8 print:py-8">
          <div className="space-y-5">
            <header className="overflow-hidden rounded-[26px] border border-slate-200 bg-[linear-gradient(180deg,#fbfcff_0%,#f5f8fc_100%)]">
              <div className="border-b border-slate-200/80 px-5 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">{payload.branding.companyName}</p>
              </div>
              <div className="grid gap-5 px-5 py-5 md:grid-cols-[1.35fr,0.65fr]">
                <div className="max-w-3xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Executive Output</p>
                  <h1 className="mt-2 text-[29px] font-semibold tracking-[-0.03em] text-slate-950">{payload.report.title}</h1>
                  <p className="mt-3 max-w-2xl text-[13px] leading-6 text-slate-600">
                    {payload.organization.name} için üretilen bu rapor; güvenlik duruşunu, Zero Trust kararlarını,
                    deception sinyallerini ve uyumluluk etkilerini kalıcı snapshot üzerinden sunar.
                  </p>
                </div>
                <div className="grid gap-2 rounded-[22px] border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
                  <Meta label="Organization" value={payload.organization.name} />
                  <Meta label="Prepared By" value={payload.preparedBy} />
                  <Meta label="Generated At" value={formatDateTime(payload.generatedAt)} />
                  <Meta label="Confidentiality" value={payload.confidentialityLabel} />
                </div>
              </div>
            </header>

            <section className="grid gap-3 md:grid-cols-4">
              <SnapshotCard label="Security Score" value={payload.securityScore !== null ? `${payload.securityScore}/100` : "N/A"} />
              <SnapshotCard label="Critical Events" value={String(criticalEventCount)} />
              <SnapshotCard
                label="Compliance"
                value={payload.kvkkGdprImpact.kvkkScore !== null ? `${payload.kvkkGdprImpact.kvkkScore}% / ${payload.kvkkGdprImpact.gdprScore ?? 0}%` : "N/A"}
              />
              <SnapshotCard label="Report Type" value={payload.report.type} />
            </section>

            <Section title="Executive Summary" compact>
              <p className="text-[13px] leading-6 text-slate-700">{payload.executiveSummary}</p>
            </Section>

            <section className="grid gap-4 lg:grid-cols-[1.08fr,0.92fr]">
              <div className="space-y-4">
                <Section title="Critical Findings">
                  <BulletList items={payload.criticalFindings.slice(0, 6)} />
                </Section>
                <Section title="Affected Assets">
                  {payload.affectedAssets.length ? (
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-slate-600">Asset</th>
                            <th className="px-3 py-2 text-left font-medium text-slate-600">Risk</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {payload.affectedAssets.map((asset) => (
                            <tr key={asset.id}>
                              <td className="px-3 py-2 font-medium text-slate-900">{asset.name}</td>
                              <td className="px-3 py-2 text-slate-700">{asset.riskLevel}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <EmptyLine text="Bu rapora bağlı ek varlık bulunmuyor." />
                  )}
                </Section>
                <Section title="Recommended Actions" compact>
                  <BulletList items={payload.recommendedActions.slice(0, 6)} />
                </Section>
              </div>

              <div className="space-y-4">
                <Section title="Event Timeline">
                  {payload.eventTimeline.length ? (
                    <div className="space-y-2">
                      {payload.eventTimeline.map((event) => (
                        <div key={event.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium text-slate-950">{event.title}</p>
                            <Badge label={event.severity} tone={reportTypeTone} />
                          </div>
                          <p className="mt-1 text-[13px] leading-5 text-slate-700">{event.description}</p>
                          {event.entries.length ? (
                            <ul className="mt-2 space-y-1 text-xs text-slate-600">
                              {event.entries.slice(0, 3).map((entry) => (
                                <li key={`${event.id}-${entry.timestamp}`}>{entry.actor}: {entry.message}</li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyLine text="Bu rapor için ek olay zaman çizelgesi bulunmuyor." />
                  )}
                </Section>
                <Section title="Risk Matrix">
                  <BulletList items={payload.riskMatrix.map((risk) => `${risk.level.toUpperCase()}: ${risk.label}`)} />
                </Section>
                <Section title="NIST CSF 2.0 Mapping">
                  <CompactList
                    title="NIST Functions"
                    items={payload.nistCsfMapping.slice(0, 6).map((item) => `${item.name}: ${item.score}%`)}
                  />
                </Section>
                <Section title="KVKK / GDPR Impact">
                  <CompactList
                    title="Privacy Impact"
                    items={[
                      `KVKK görünürlüğü ${payload.kvkkGdprImpact.kvkkScore ?? 0}% seviyesinde.`,
                      `GDPR görünürlüğü ${payload.kvkkGdprImpact.gdprScore ?? 0}% seviyesinde.`,
                      payload.kvkkGdprImpact.summary,
                    ]}
                  />
                </Section>
              </div>
            </section>

            <Section title="Appendix / Evidence">
              {payload.appendix.evidence.length ? (
                <BulletList items={payload.appendix.evidence.slice(0, 8)} />
              ) : (
                <EmptyLine text="Ek kanıt kaydı bulunmuyor." />
              )}
            </Section>

            <footer className="border-t border-slate-200 pt-4 text-xs text-slate-500">
              {payload.footer} • {payload.organization.name} • {formatDateTime(payload.generatedAt)}
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
      <div className={`mt-3 rounded-2xl border border-slate-200 bg-white ${compact ? "p-4" : "p-4"} shadow-[0_4px_18px_rgba(15,23,42,0.03)]`}>
        {children}
      </div>
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

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-1.5 font-medium text-slate-950">{value}</p>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 text-[13px] leading-5 text-slate-700">
      {items.map((item) => (
        <li key={item} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
          {item}
        </li>
      ))}
    </ul>
  );
}

function CompactList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</p>
      <ul className="mt-2 space-y-2 text-[13px] leading-5 text-slate-700">
        {items.map((item) => (
          <li key={item} className="rounded-lg bg-white px-3 py-2 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.18)]">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="text-sm leading-7 text-slate-600">{text}</p>;
}
