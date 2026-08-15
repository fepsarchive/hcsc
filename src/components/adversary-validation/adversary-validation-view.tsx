"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  ActivityIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  CrosshairIcon,
  FileWarningIcon,
  FlaskConicalIcon,
  LoaderCircleIcon,
  LockKeyholeIcon,
  PlusIcon,
  RadarIcon,
  ScanSearchIcon,
  ServerCogIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageIntro } from "@/components/ui/page-intro";
import { Panel } from "@/components/ui/panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  createSecurityTestTarget,
  getAdversaryValidationOverview,
  launchSecurityTest,
  updateSecurityTestFindingStatus,
  type AdversaryValidationOverview,
  type SecurityTestFinding,
  type SecurityTestRun,
  type SecurityTestTarget,
} from "@/lib/hcsc-api";
import { formatDateTime } from "@/lib/utils";
import { useSecurityConsoleStore } from "@/store/security-console-store";

type TargetForm = {
  name: string;
  targetType: SecurityTestTarget["targetType"];
  target: string;
  environment: SecurityTestTarget["environment"];
  description: string;
  scope: string;
  exclusions: string;
  authorizationReference: string;
  authorizationExpiresAt: string;
  authorizationNotes: string;
  confirmed: boolean;
};

type RunForm = {
  targetId: string;
  scanMode: SecurityTestRun["scanMode"];
  instructions: string;
  maxBudgetUsd: string;
  maxTurns: string;
  confirmed: boolean;
};

const EMPTY_OVERVIEW: AdversaryValidationOverview = {
  provider: {
    mode: "demo",
    ready: false,
    label: "Provider yükleniyor",
    description: "Sağlayıcı durumu doğrulanıyor.",
    attribution: "HCSC",
    liveExecution: false,
    productionTargetsAllowed: false,
  },
  metrics: {
    authorizedTargets: 0,
    totalRuns: 0,
    activeRuns: 0,
    openFindings: 0,
    criticalFindings: 0,
    highFindings: 0,
  },
  targets: [],
  runs: [],
};

const severityTone: Record<SecurityTestFinding["severity"], BadgeTone> = {
  info: "info",
  low: "low",
  medium: "medium",
  high: "high",
  critical: "critical",
};

const statusLabels: Record<SecurityTestFinding["status"], string> = {
  open: "Açık",
  investigating: "İnceleniyor",
  accepted_risk: "Risk kabul edildi",
  remediated: "Giderildi",
  false_positive: "Yanlış pozitif",
};

const runStatusLabels: Record<SecurityTestRun["status"], string> = {
  queued: "Kuyrukta",
  running: "Çalışıyor",
  completed: "Tamamlandı",
  failed: "Başarısız",
  cancelled: "İptal edildi",
  blocked: "Engellendi",
};

function futureLocalDate(days = 30) {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function createEmptyTargetForm(): TargetForm {
  return {
    name: "",
    targetType: "repository",
    target: "",
    environment: "sandbox",
    description: "",
    scope: "",
    exclusions: "Production altyapısı",
    authorizationReference: "",
    authorizationExpiresAt: futureLocalDate(),
    authorizationNotes: "",
    confirmed: false,
  };
}

function createEmptyRunForm(targetId = ""): RunForm {
  return {
    targetId,
    scanMode: "standard",
    instructions: "",
    maxBudgetUsd: "",
    maxTurns: "100",
    confirmed: false,
  };
}

function splitLines(value: string) {
  return [...new Set(value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean))];
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-xs leading-5 text-[var(--text-muted)]">{hint}</p> : null}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof ShieldCheckIcon;
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">{label}</p>
        <Icon className="size-4 text-[var(--text-muted)]" aria-hidden="true" />
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">{value}</p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">{detail}</p>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[14px] border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-12 text-center">
      <ScanSearchIcon className="mx-auto size-6 text-[var(--text-muted)]" aria-hidden="true" />
      <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">{title}</p>
      <p className="mx-auto mt-1 max-w-lg text-xs leading-5 text-[var(--text-muted)]">{description}</p>
    </div>
  );
}

export function AdversaryValidationView() {
  const canView = useSecurityConsoleStore((state) => state.can("view_security_tests"));
  const canManageTargets = useSecurityConsoleStore((state) => state.can("manage_security_test_targets"));
  const canRun = useSecurityConsoleStore((state) => state.can("run_security_test"));
  const [overview, setOverview] = useState<AdversaryValidationOverview>(EMPTY_OVERVIEW);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [targetSheetOpen, setTargetSheetOpen] = useState(false);
  const [runSheetOpen, setRunSheetOpen] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState<SecurityTestFinding | null>(null);
  const [targetForm, setTargetForm] = useState<TargetForm>(createEmptyTargetForm);
  const [runForm, setRunForm] = useState<RunForm>(() => createEmptyRunForm());

  const loadOverview = useCallback(async () => {
    try {
      const result = await getAdversaryValidationOverview();
      setOverview(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Adversary Validation verileri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canView) return;
    let cancelled = false;

    async function hydrate() {
      try {
        const result = await getAdversaryValidationOverview();
        if (!cancelled) setOverview(result);
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Adversary Validation verileri yüklenemedi.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [canView]);

  const findings = overview.runs.flatMap((run) =>
    run.findings.map((finding) => ({ ...finding, runId: run.id, targetName: run.target.name })),
  );
  const runnableTargets = overview.targets.filter(
    (target) => target.isEnabled && target.authorizationStatus === "active",
  );

  function openRunSheet(targetId = runnableTargets[0]?.id ?? "") {
    setRunForm(createEmptyRunForm(targetId));
    setRunSheetOpen(true);
  }

  async function submitTarget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!targetForm.confirmed) return toast.error("Yetkilendirme beyanını onaylamalısın.");
    if (!splitLines(targetForm.scope).length) return toast.error("En az bir kapsam girdisi gerekli.");

    setSubmitting(true);
    try {
      await createSecurityTestTarget({
        name: targetForm.name,
        targetType: targetForm.targetType,
        target: targetForm.target,
        environment: targetForm.environment,
        description: targetForm.description || null,
        scope: splitLines(targetForm.scope),
        exclusions: splitLines(targetForm.exclusions),
        authorizationReference: targetForm.authorizationReference,
        authorizationExpiresAt: new Date(targetForm.authorizationExpiresAt).toISOString(),
        authorizationNotes: targetForm.authorizationNotes || null,
        explicitAuthorizationConfirmed: true,
      });
      toast.success("Yetkili test hedefi oluşturuldu.");
      setTargetSheetOpen(false);
      setTargetForm(createEmptyTargetForm());
      await loadOverview();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Hedef oluşturulamadı.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitRun(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!runForm.confirmed) return toast.error("Aktif yetkilendirmeyi yeniden onaylamalısın.");

    setSubmitting(true);
    try {
      await launchSecurityTest({
        targetId: runForm.targetId,
        scanMode: runForm.scanMode,
        instructions: runForm.instructions || null,
        maxBudgetUsd: runForm.maxBudgetUsd ? Number(runForm.maxBudgetUsd) : null,
        maxTurns: Number(runForm.maxTurns),
        explicitAuthorizationConfirmed: true,
      });
      toast.success(overview.provider.mode === "demo" ? "Demo doğrulama koşusu tamamlandı." : "Güvenlik testi kuyruğa alındı.");
      setRunSheetOpen(false);
      await loadOverview();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Güvenlik testi başlatılamadı.");
    } finally {
      setSubmitting(false);
    }
  }

  async function changeFindingStatus(status: SecurityTestFinding["status"]) {
    if (!selectedFinding) return;
    setSubmitting(true);
    try {
      const updated = await updateSecurityTestFindingStatus(selectedFinding.id, status);
      setSelectedFinding(updated);
      toast.success("Bulgu durumu güncellendi.");
      await loadOverview();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Bulgu güncellenemedi.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!canView) {
    return (
      <Panel>
        <EmptyState title="Bu modül için yetkin yok" description="Adversary Validation görünümü rol tabanlı erişimle korunuyor." />
      </Panel>
    );
  }

  return (
    <div className="space-y-5">
      <Panel>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <PageIntro
            eyebrow="Adversary Validation"
            title="Yetkili Güvenlik Test Merkezi"
            description="Yalnızca açıkça yetkilendirilmiş hedeflerde güvenlik doğrulama koşuları başlatın; bulguları olay, kanıt ve iyileştirme akışına bağlayın."
          />
          <div className="flex flex-wrap gap-2">
            {canManageTargets ? (
              <Button variant="outline" onClick={() => setTargetSheetOpen(true)}>
                <PlusIcon data-icon="inline-start" /> Hedef ekle
              </Button>
            ) : null}
            {canRun ? (
              <Button onClick={() => openRunSheet()} disabled={!overview.provider.ready || !runnableTargets.length}>
                <CrosshairIcon data-icon="inline-start" /> Test başlat
              </Button>
            ) : null}
          </div>
        </div>

        <div
          className={`mt-5 flex flex-col gap-3 rounded-[14px] border p-4 lg:flex-row lg:items-center lg:justify-between ${
            overview.provider.liveExecution
              ? "border-amber-500/25 bg-amber-500/8"
              : "border-sky-500/25 bg-sky-500/8"
          }`}
        >
          <div className="flex min-w-0 gap-3">
            {overview.provider.liveExecution ? (
              <ServerCogIcon className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden="true" />
            ) : (
              <FlaskConicalIcon className="mt-0.5 size-5 shrink-0 text-sky-600" aria-hidden="true" />
            )}
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{overview.provider.label}</p>
              <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{overview.provider.description}</p>
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">Altyapı: {overview.provider.attribution}</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Badge tone={overview.provider.liveExecution ? "medium" : "info"} label={overview.provider.liveExecution ? "AKTİF PROVIDER" : "SENTETİK DEMO"} />
            <Badge tone={overview.provider.productionTargetsAllowed ? "high" : "neutral"} label={overview.provider.productionTargetsAllowed ? "PRODUCTION AÇIK" : "PRODUCTION KAPALI"} />
          </div>
        </div>
      </Panel>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon={ShieldCheckIcon} label="Yetkili hedef" value={overview.metrics.authorizedTargets} detail="Aktif kapsam ve süre" />
        <MetricCard icon={RadarIcon} label="Toplam koşu" value={overview.metrics.totalRuns} detail={`${overview.metrics.activeRuns} aktif koşu`} />
        <MetricCard icon={FileWarningIcon} label="Açık bulgu" value={overview.metrics.openFindings} detail="İnceleme gerektiriyor" />
        <MetricCard icon={AlertTriangleIcon} label="Kritik" value={overview.metrics.criticalFindings} detail="Öncelikli müdahale" />
        <MetricCard icon={ActivityIcon} label="Yüksek" value={overview.metrics.highFindings} detail="Yüksek riskli bulgular" />
      </div>

      <Panel>
        <Tabs defaultValue="runs">
          <div className="flex flex-col gap-3 border-b border-[var(--border)] pb-3 sm:flex-row sm:items-center sm:justify-between">
            <TabsList variant="line">
              <TabsTrigger value="runs">Koşular <Badge tone="neutral" label={String(overview.runs.length)} /></TabsTrigger>
              <TabsTrigger value="findings">Bulgular <Badge tone="neutral" label={String(findings.length)} /></TabsTrigger>
              <TabsTrigger value="targets">Hedefler <Badge tone="neutral" label={String(overview.targets.length)} /></TabsTrigger>
            </TabsList>
            {loading ? <LoaderCircleIcon className="size-4 animate-spin text-[var(--text-muted)]" aria-label="Yükleniyor" /> : null}
          </div>

          <TabsContent value="runs" className="pt-4">
            {overview.runs.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className="font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--text-muted)]">
                    <tr className="border-b border-[var(--border)]">
                      <th className="px-3 py-3 font-medium">Hedef</th><th className="px-3 py-3 font-medium">Mod</th><th className="px-3 py-3 font-medium">Durum</th><th className="px-3 py-3 font-medium">Bulgular</th><th className="px-3 py-3 font-medium">Provider</th><th className="px-3 py-3 font-medium">Başlangıç</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.runs.map((run) => (
                      <tr key={run.id} className="border-b border-[var(--border)] last:border-0">
                        <td className="px-3 py-4"><p className="font-medium text-[var(--text-primary)]">{run.target.name}</p><p className="mt-1 max-w-64 truncate text-xs text-[var(--text-muted)]">{run.target.target}</p></td>
                        <td className="px-3 py-4"><Badge tone="policy" label={run.scanMode.toUpperCase()} /></td>
                        <td className="px-3 py-4"><Badge tone={run.status === "completed" ? "low" : run.status === "failed" ? "critical" : "medium"} label={runStatusLabels[run.status]} /></td>
                        <td className="px-3 py-4 text-[var(--text-secondary)]">{run.findingCount} <span className="text-xs text-[var(--text-muted)]">({run.criticalCount} kritik)</span></td>
                        <td className="px-3 py-4"><Badge tone={run.provider === "demo" ? "info" : "deception"} label={run.provider.replace("_", " ")} /></td>
                        <td className="px-3 py-4 text-xs text-[var(--text-muted)]">{formatDateTime(run.startedAt ?? run.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <EmptyState title="Henüz koşu yok" description="Yetkili bir hedef ekleyip ilk güvenlik doğrulama koşusunu başlatın." />}
          </TabsContent>

          <TabsContent value="findings" className="pt-4">
            {findings.length ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {findings.map((finding) => (
                  <button key={finding.id} type="button" onClick={() => setSelectedFinding(finding)} className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-4 text-left transition hover:border-[var(--text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <div className="flex items-start justify-between gap-3"><Badge tone={severityTone[finding.severity]} label={finding.severity.toUpperCase()} />{finding.isSynthetic ? <Badge tone="info" label="SENTETİK" /> : null}</div>
                    <p className="mt-3 font-semibold text-[var(--text-primary)]">{finding.title}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">{finding.targetName} · {finding.category}</p>
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">{finding.description}</p>
                    <div className="mt-3 flex items-center justify-between gap-3"><span className="text-xs text-[var(--text-muted)]">{finding.cvssScore ? `CVSS ${finding.cvssScore}` : "CVSS yok"}</span><Badge tone="neutral" label={statusLabels[finding.status]} /></div>
                  </button>
                ))}
              </div>
            ) : <EmptyState title="Bulgu kaydı yok" description="Tamamlanan güvenlik doğrulamalarının bulguları burada görünür." />}
          </TabsContent>

          <TabsContent value="targets" className="pt-4">
            {overview.targets.length ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {overview.targets.map((target) => (
                  <div key={target.id} className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-4">
                    <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-[var(--text-primary)]">{target.name}</p><p className="mt-1 break-all text-xs text-[var(--text-muted)]">{target.target}</p></div><Badge tone={target.authorizationStatus === "active" ? "low" : "critical"} label={target.authorizationStatus.toUpperCase()} /></div>
                    <div className="mt-4 flex flex-wrap gap-2"><Badge tone="policy" label={target.targetType.replace("_", " ")} /><Badge tone={target.environment === "production" ? "high" : "neutral"} label={target.environment} /></div>
                    <p className="mt-4 text-xs text-[var(--text-muted)]">Kapsam: {target.scope.join(", ")}</p>
                    {target.authorization ? <p className="mt-2 text-xs text-[var(--text-muted)]">Yetki: {target.authorization.reference} · {formatDateTime(target.authorization.expiresAt)} tarihine kadar</p> : null}
                    {canRun ? <Button className="mt-4" size="sm" variant="outline" onClick={() => openRunSheet(target.id)} disabled={target.authorizationStatus !== "active" || !overview.provider.ready}><CrosshairIcon data-icon="inline-start" /> Bu hedefi test et</Button> : null}
                  </div>
                ))}
              </div>
            ) : <EmptyState title="Yetkili hedef yok" description="Test kapsamı, hariç tutulan alanlar ve yazılı izin referansıyla ilk hedefi oluşturun." />}
          </TabsContent>
        </Tabs>
      </Panel>

      <Sheet open={targetSheetOpen} onOpenChange={setTargetSheetOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-xl">
          <form onSubmit={submitTarget} className="flex min-h-full flex-col">
            <SheetHeader><SheetTitle>Yetkili hedef ekle</SheetTitle><SheetDescription>Yalnızca sahibi olduğunuz veya yazılı olarak test izni aldığınız sistemleri kaydedin.</SheetDescription></SheetHeader>
            <div className="grid gap-5 px-4 pb-6">
              <Field label="Hedef adı"><Input required value={targetForm.name} onChange={(event) => setTargetForm((current) => ({ ...current, name: event.target.value }))} placeholder="HCSC staging repository" /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Hedef türü"><Select value={targetForm.targetType} onValueChange={(value: SecurityTestTarget["targetType"]) => setTargetForm((current) => ({ ...current, targetType: value }))}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="repository">Repository</SelectItem><SelectItem value="web_application">Web uygulaması</SelectItem><SelectItem value="api">API</SelectItem></SelectContent></Select></Field>
                <Field label="Ortam"><Select value={targetForm.environment} onValueChange={(value: SecurityTestTarget["environment"]) => setTargetForm((current) => ({ ...current, environment: value }))}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sandbox">Sandbox</SelectItem><SelectItem value="staging">Staging</SelectItem><SelectItem value="production">Production</SelectItem></SelectContent></Select></Field>
              </div>
              <Field label="Hedef adresi" hint="HTTPS repository, uygulama veya API adresi."><Input type="url" required value={targetForm.target} onChange={(event) => setTargetForm((current) => ({ ...current, target: event.target.value }))} placeholder="https://github.com/kurum/proje" /></Field>
              <Field label="Açıklama"><Textarea value={targetForm.description} onChange={(event) => setTargetForm((current) => ({ ...current, description: event.target.value }))} placeholder="Hedefin amacı ve test bağlamı" /></Field>
              <Field label="İzin verilen kapsam" hint="Her satıra bir path, endpoint veya test alanı yazın."><Textarea required value={targetForm.scope} onChange={(event) => setTargetForm((current) => ({ ...current, scope: event.target.value }))} placeholder={"Repository source\n/api/*"} /></Field>
              <Field label="Kapsam dışı alanlar"><Textarea value={targetForm.exclusions} onChange={(event) => setTargetForm((current) => ({ ...current, exclusions: event.target.value }))} /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Yetki referansı"><Input required value={targetForm.authorizationReference} onChange={(event) => setTargetForm((current) => ({ ...current, authorizationReference: event.target.value }))} placeholder="AUTH-2026-001" /></Field>
                <Field label="Yetki bitişi"><Input type="datetime-local" required value={targetForm.authorizationExpiresAt} onChange={(event) => setTargetForm((current) => ({ ...current, authorizationExpiresAt: event.target.value }))} /></Field>
              </div>
              <Field label="Yetki notu"><Textarea value={targetForm.authorizationNotes} onChange={(event) => setTargetForm((current) => ({ ...current, authorizationNotes: event.target.value }))} placeholder="İzin sahibi, ticket veya sözleşme notu" /></Field>
              <label className="flex cursor-pointer items-start gap-3 rounded-[14px] border border-amber-500/25 bg-amber-500/8 p-4"><Checkbox checked={targetForm.confirmed} onCheckedChange={(checked) => setTargetForm((current) => ({ ...current, confirmed: checked === true }))} className="mt-0.5" /><span className="text-xs leading-5 text-[var(--text-secondary)]">Bu hedef üzerinde belirtilen kapsam ve süre içinde güvenlik testi yürütmeye açık yetkim olduğunu doğruluyorum.</span></label>
            </div>
            <SheetFooter className="border-t border-[var(--border)]"><Button type="submit" disabled={submitting}>{submitting ? <LoaderCircleIcon className="animate-spin" data-icon="inline-start" /> : <LockKeyholeIcon data-icon="inline-start" />} Yetkili hedefi kaydet</Button></SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet open={runSheetOpen} onOpenChange={setRunSheetOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <form onSubmit={submitRun} className="flex min-h-full flex-col">
            <SheetHeader><SheetTitle>Güvenlik testi başlat</SheetTitle><SheetDescription>Koşu öncesinde aktif hedef izni ve sağlayıcı sınırları sunucuda yeniden doğrulanır.</SheetDescription></SheetHeader>
            <div className="grid gap-5 px-4 pb-6">
              <Field label="Yetkili hedef"><Select required value={runForm.targetId} onValueChange={(value) => setRunForm((current) => ({ ...current, targetId: value }))}><SelectTrigger className="w-full"><SelectValue placeholder="Hedef seçin" /></SelectTrigger><SelectContent>{runnableTargets.map((target) => <SelectItem key={target.id} value={target.id}>{target.name}</SelectItem>)}</SelectContent></Select></Field>
              <Field label="Tarama modu"><Select value={runForm.scanMode} onValueChange={(value: SecurityTestRun["scanMode"]) => setRunForm((current) => ({ ...current, scanMode: value }))}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="quick">Quick</SelectItem><SelectItem value="standard">Standard</SelectItem><SelectItem value="deep">Deep</SelectItem></SelectContent></Select></Field>
              <Field label="Operatör talimatı"><Textarea value={runForm.instructions} onChange={(event) => setRunForm((current) => ({ ...current, instructions: event.target.value }))} placeholder="Önceliklendirilecek akışlar ve kaçınılacak davranışlar" /></Field>
              <div className="grid gap-4 sm:grid-cols-2"><Field label="Azami bütçe (USD)"><Input type="number" min="0" max="1000" step="0.01" value={runForm.maxBudgetUsd} onChange={(event) => setRunForm((current) => ({ ...current, maxBudgetUsd: event.target.value }))} /></Field><Field label="Azami adım"><Input type="number" min="25" max="500" value={runForm.maxTurns} onChange={(event) => setRunForm((current) => ({ ...current, maxTurns: event.target.value }))} /></Field></div>
              <div className="rounded-[14px] border border-sky-500/25 bg-sky-500/8 p-4"><div className="flex gap-3"><FlaskConicalIcon className="mt-0.5 size-4 shrink-0 text-sky-600" /><p className="text-xs leading-5 text-[var(--text-secondary)]">Geçerli sağlayıcı: <strong>{overview.provider.label}</strong>. {overview.provider.mode === "demo" ? "Bu koşu dış ağa saldırı göndermez ve sentetik bulgu üretir." : "Bu koşu yapılandırılmış ayrık runner'a iletilir."}</p></div></div>
              <label className="flex cursor-pointer items-start gap-3 rounded-[14px] border border-amber-500/25 bg-amber-500/8 p-4"><Checkbox checked={runForm.confirmed} onCheckedChange={(checked) => setRunForm((current) => ({ ...current, confirmed: checked === true }))} className="mt-0.5" /><span className="text-xs leading-5 text-[var(--text-secondary)]">Seçili hedef için yetkilendirmenin hâlâ geçerli olduğunu ve tanımlı kapsam dışına çıkılmaması gerektiğini onaylıyorum.</span></label>
            </div>
            <SheetFooter className="border-t border-[var(--border)]"><Button type="submit" disabled={submitting || !runForm.targetId || !overview.provider.ready}>{submitting ? <LoaderCircleIcon className="animate-spin" data-icon="inline-start" /> : <CrosshairIcon data-icon="inline-start" />} Koşuyu başlat</Button></SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet open={Boolean(selectedFinding)} onOpenChange={(open) => { if (!open) setSelectedFinding(null); }}>
        <SheetContent className="overflow-y-auto sm:max-w-xl">
          {selectedFinding ? <><SheetHeader><div className="flex flex-wrap gap-2 pr-10"><Badge tone={severityTone[selectedFinding.severity]} label={selectedFinding.severity.toUpperCase()} />{selectedFinding.isSynthetic ? <Badge tone="info" label="SENTETİK BULGU" /> : null}</div><SheetTitle className="pt-2">{selectedFinding.title}</SheetTitle><SheetDescription>{selectedFinding.affectedResource}</SheetDescription></SheetHeader><div className="space-y-5 px-4 pb-6"><div><p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Açıklama</p><p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{selectedFinding.description}</p></div><div><p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Kanıt</p><ul className="mt-2 space-y-2">{selectedFinding.evidence.map((item) => <li key={item} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 font-mono text-xs leading-5 text-[var(--text-secondary)]">{item}</li>)}</ul></div><div><p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">İyileştirme</p><p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{selectedFinding.remediation}</p></div>{canRun ? <Field label="Bulgu durumu"><Select value={selectedFinding.status} onValueChange={(value: SecurityTestFinding["status"]) => void changeFindingStatus(value)} disabled={submitting}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(statusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field> : null}{selectedFinding.securityEventId ? <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-200"><CheckCircle2Icon className="size-4" /> Güvenlik olayıyla ilişkilendirildi.</div> : null}</div></> : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
