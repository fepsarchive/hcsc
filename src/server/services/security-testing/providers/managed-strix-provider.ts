import "server-only";

import type { EventSeverity, SecurityTestRunStatus } from "@prisma/client";

import type {
  SecurityTestLaunchInput,
  SecurityTestLaunchResult,
  SecurityTestReconcileResult,
  SecurityTestProviderFinding,
  SecurityTestProviderRuntime,
} from "@/server/services/security-testing/providers/security-test-provider";

type StrixScanStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

type StrixVulnerability = {
  id?: string;
  title?: string;
  description?: string;
  severity?: string;
  cvss?: number | null;
  endpoint?: string | null;
  method?: string | null;
  target?: string | null;
  technical_analysis?: string | null;
  poc_description?: string | null;
  poc_script_code?: string | null;
  code_file?: string | null;
  remediation_steps?: string | null;
  evidence?: string | null;
  cwe?: string[] | null;
};

type StrixScan = {
  id: string;
  status: StrixScanStatus;
  title?: string;
  executive_summary?: string | null;
  recommendations?: string | null;
  vulnerabilities?: StrixVulnerability[];
};

const DEFAULT_BASE_URL = "https://app.strix.ai/api/v1";

function config() {
  const baseUrl = (process.env.STRIX_API_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/$/, "");
  const token = process.env.STRIX_API_TOKEN?.trim() ?? "";
  let secure = false;
  try {
    const parsed = new URL(baseUrl);
    secure = parsed.protocol === "https:";
  } catch {
    secure = false;
  }
  return { baseUrl, token, ready: Boolean(secure && token) };
}

async function strixRequest(path: string, init?: RequestInit) {
  const current = config();
  const response = await fetch(`${current.baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${current.token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const body = (await response.text()).slice(0, 300);
    throw new Error(`Strix API request failed (${response.status})${body ? `: ${body}` : "."}`);
  }
  return response.json() as Promise<unknown>;
}

function normalizedUrl(value: string) {
  return value.trim().toLowerCase().replace(/\.git$/, "").replace(/\/$/, "");
}

function repositoryName(value: string) {
  try {
    return new URL(value).pathname.replace(/^\//, "").replace(/\.git$/, "").replace(/\/$/, "");
  } catch {
    return value;
  }
}

async function resolveRepositoryId(target: string) {
  const expectedName = repositoryName(target).toLowerCase();
  const response = (await strixRequest(`/repositories?limit=100&search=${encodeURIComponent(expectedName)}`)) as {
    items?: Array<{ id?: string; full_name?: string; url?: string }>;
  };
  const asset = response.items?.find(
    (item) => item.full_name?.toLowerCase() === expectedName || (item.url && normalizedUrl(item.url) === normalizedUrl(target)),
  );
  if (!asset?.id) {
    throw new Error("Target repository is not registered in the Strix organization.");
  }
  return asset.id;
}

async function resolveDomainId(target: string) {
  const hostname = new URL(target).hostname.toLowerCase();
  const response = (await strixRequest(`/domains?limit=100&verified=true&search=${encodeURIComponent(hostname)}`)) as {
    items?: Array<{ id?: string; domain?: string; verified?: boolean }>;
  };
  const asset = response.items?.find((item) => {
    const domain = item.domain?.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
    return item.verified && domain === hostname;
  });
  if (!asset?.id) {
    throw new Error("Target domain is not registered and verified in the Strix organization.");
  }
  return asset.id;
}

function mapStatus(status: StrixScanStatus): Extract<SecurityTestRunStatus, "queued" | "running" | "completed" | "failed" | "cancelled"> {
  if (status === "completed") return "completed";
  if (status === "running") return "running";
  if (status === "failed" || status === "cancelled") return status;
  return "queued";
}

function mapSeverity(value: string | undefined): EventSeverity {
  const normalized = value?.toLowerCase();
  if (normalized === "critical" || normalized === "high" || normalized === "medium" || normalized === "low") return normalized;
  return "info";
}

function mapFinding(vulnerability: StrixVulnerability, index: number): SecurityTestProviderFinding {
  const evidence = [
    vulnerability.evidence,
    vulnerability.technical_analysis,
    vulnerability.poc_description,
    vulnerability.endpoint ? `${vulnerability.method ?? "HTTP"} ${vulnerability.endpoint}` : null,
    vulnerability.code_file ? `Code: ${vulnerability.code_file}` : null,
  ].filter((item): item is string => Boolean(item?.trim()));

  return {
    externalId: vulnerability.id ?? `strix-finding-${index + 1}`,
    title: vulnerability.title?.trim() || "Strix validated vulnerability",
    severity: mapSeverity(vulnerability.severity),
    category: vulnerability.cwe?.[0] ?? "Strix validated vulnerability",
    description: vulnerability.description?.trim() || vulnerability.technical_analysis?.trim() || "Strix reported a validated vulnerability.",
    evidence,
    remediation: vulnerability.remediation_steps?.trim() || "Review the Strix technical analysis and remediate the affected control.",
    affectedResource: vulnerability.endpoint ?? vulnerability.code_file ?? vulnerability.target ?? "Authorized target",
    cvssScore: typeof vulnerability.cvss === "number" ? vulnerability.cvss : null,
    pocAvailable: Boolean(vulnerability.poc_description || vulnerability.poc_script_code),
    isSynthetic: false,
    metadata: { source: "strix_api", method: vulnerability.method ?? null, cwe: vulnerability.cwe ?? [] },
  };
}

function scanResult(scan: StrixScan): SecurityTestReconcileResult {
  if (!scan.id || !scan.status) throw new Error("Strix API returned an invalid scan payload.");
  const findings = (scan.vulnerabilities ?? []).map(mapFinding);
  return {
    externalRunId: scan.id,
    status: mapStatus(scan.status),
    summary: scan.executive_summary?.trim() || scan.title?.trim() || "Strix scan is in progress.",
    findings,
    metadata: { api: "official_v1", strixStatus: scan.status, recommendations: scan.recommendations ?? null },
  };
}

async function createScanPayload(input: SecurityTestLaunchInput) {
  const context = [
    `HCSC authorized target: ${input.target.name}`,
    `Environment: ${input.target.environment}`,
    input.target.exclusions.length ? `Excluded: ${input.target.exclusions.join(", ")}` : "",
  ].filter(Boolean).join("\n");

  if (input.target.targetType === "repository") {
    const repositoryId = await resolveRepositoryId(input.target.target);
    return {
      engagement_type: "code_review",
      repository_ids: [repositoryId],
      concerns: input.instructions || undefined,
      focus: input.target.scope.join("\n"),
      context,
      org_knowledge_enabled: true,
    };
  }

  const domainId = await resolveDomainId(input.target.target);
  const paths = input.target.scope.filter((item) => item.startsWith("/"));
  return {
    engagement_type: "live_test",
    domain_ids: [domainId],
    ...(paths.length ? { domain_paths: { [domainId]: paths } } : {}),
    concerns: input.instructions || undefined,
    focus: input.target.scope.join("\n"),
    context,
    org_knowledge_enabled: true,
  };
}

export function createManagedStrixProvider(): SecurityTestProviderRuntime {
  const current = config();
  return {
    mode: "managed",
    ready: current.ready,
    label: "Managed Strix API",
    description: current.ready
      ? "Authorized HCSC targets are matched to verified Strix assets and synchronized through the official API."
      : "STRIX_API_TOKEN is missing or the Strix API base URL is invalid; live scans remain disabled.",
    attribution: "Powered by Strix",
    async launch(input) {
      if (!config().ready) throw new Error("Managed Strix API is not configured.");
      const payload = await createScanPayload(input);
      const created = (await strixRequest("/scans", { method: "POST", body: JSON.stringify(payload) })) as {
        scan_id?: string;
        title?: string;
        status?: StrixScanStatus;
      };
      if (!created.scan_id) throw new Error("Strix API response did not include scan_id.");
      const result = scanResult({ id: created.scan_id, title: created.title, status: created.status ?? "pending" });
      const status = result.status;
      if (status === "failed" || status === "cancelled") throw new Error(`Strix scan ended with status ${status}.`);
      return { ...result, status } satisfies SecurityTestLaunchResult;
    },
    async reconcile(externalRunId) {
      const scan = (await strixRequest(`/scans/${encodeURIComponent(externalRunId)}`)) as StrixScan;
      return scanResult(scan);
    },
  };
}
