"use client";

import type {
  AccessAction,
  AccessRequest,
  AppUser,
  AuditLogItem,
  ComplianceSnapshot,
  DataAsset,
  DeceptionAsset,
  EventStatus,
  IdentityProfile,
  IdentityStatus,
  NotificationItem,
  OrganizationProfile,
  ReportItem,
  SecurityEvent,
  SimulationRunResult,
  SoarAction,
  TeamInviteRecord,
  TeamMemberRecord,
  TeamRoleKey,
} from "@/types";

type ApiErrorPayload = {
  code?: string;
  message?: string;
};

type ApiEnvelope<T> = {
  data: T;
  meta?: Record<string, unknown>;
  error?: ApiErrorPayload | null;
};

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

export type SettingsBundle = {
  organization: OrganizationProfile;
  organizationSettings: {
    region: string;
    cloudMode: "private_cloud" | "public_cloud" | "hybrid_cloud";
    complianceFrameworks: string[];
    usageType?: string | null;
    defaultCurrency?: string | null;
    setupCompletedAt?: string | null;
  } | null;
  riskPolicy: {
    criticalClassificationWeight: number;
    missingEncryptionWeight: number;
    publicCloudSensitiveWeight: number;
    missingBackupWeight: number;
    noKmsWeight: number;
    openCriticalEventWeight: number;
    deceptionTriggerWeight: number;
  } | null;
  reportBranding: {
    companyName: string;
    reportFooter: string;
    preparedByLabel: string;
    confidentialityLabel: string;
  } | null;
};

export type AuthUserPayload = {
  authenticated: boolean;
  twoFactorVerified: boolean;
  sessionStartedAt: string | null;
  user: AppUser | null;
  organization: OrganizationProfile | null;
  onboardingCompleted: boolean;
  twoFactorEnrolled?: boolean;
  recoveryCodes?: string[];
  nextPath?: string;
};

export type VerifyTwoFactorMethod = "totp" | "recovery";

export type TwoFactorSetupPayload =
  | {
      mode: "verify";
      alreadyEnrolled: true;
    }
  | {
      mode: "setup";
      alreadyEnrolled: false;
      issuer: string;
      manualSecret: string;
      otpauthUrl: string;
    };

export type RegisterAccountPayload = {
  fullName: string;
  email: string;
  password: string;
  companyName: string;
};

export type ForgotPasswordResponse = {
  message: string;
};

export type RecoveryCodeStatusPayload = {
  totalCodes: number;
  remainingCodes: number;
  usedCodes: number;
  lastGeneratedAt: string | null;
  hasRecoveryCodes: boolean;
};

export type TeamInviteCreatePayload = {
  email: string;
  role: TeamRoleKey;
};

export type TeamInviteCreateResult = {
  success: boolean;
  invite: TeamInviteRecord;
  delivery: "sent" | "skipped" | "failed";
  inviteUrl?: string | null;
};

export type ResetPasswordPayload = {
  token: string;
  password: string;
  confirmPassword: string;
};

export type OnboardingRequestPayload = {
  organizationName: string;
  city?: string;
  usageType?: "saas" | "fintech" | "retail" | "platform" | "managed-security";
  defaultCurrency?: "TRY" | "USD" | "EUR" | "GBP";
  cloudMode: "private_cloud" | "public_cloud" | "hybrid_cloud";
  complianceFrameworks: string[];
  seedStarterData: boolean;
  runInitialScan: boolean;
};

export type AccessRequestCreatePayload = {
  identityProfileId: string;
  assetId: string;
  requestedAction: AccessAction;
  justification?: string;
  sourceLocation: "private_cloud" | "public_cloud" | "saas" | "backup" | "deception";
  sourceRegion: string;
  deviceTrust: "trusted" | "managed" | "unknown" | "compromised";
  mfa: boolean;
  anomalyScore: number;
  locationRisk: "low" | "medium" | "high";
  timeRisk: "normal" | "elevated" | "off_hours";
};

export type DeceptionAssetCreatePayload = {
  name: string;
  description: string;
  fakeType: "bucket" | "database" | "api" | "token_store" | "log_archive";
  mappedThreat: string;
  severity: "low" | "medium" | "high" | "critical";
  recommendedResponse: string;
  autoActions: SoarAction[];
};

export type DeceptionTriggerRecord = {
  id: string;
  sourceIp?: string | null;
  userAgent?: string | null;
  requestPath?: string | null;
  createdAt: string;
  identityProfileId?: string | null;
  eventId?: string | null;
};

export type SimulationListPayload = {
  simulations: Array<{
    id: string;
    title: string;
    description: string;
    targetModule: string;
    expectedOutcome: string;
    relatedControls: string[];
    riskLevel?: "low" | "medium" | "high" | "critical";
    affectedModules?: string[];
  }>;
  runs: SimulationRunResult[];
};

export type ExecutiveDemoPayload = {
  run: SimulationRunResult | null;
  summary: {
    assetId: string;
    assetName: string;
    identityId: string;
    identityName: string;
    accessRequestId: string | null;
    accessDecision: string | null;
    deceptionEventId: string | null;
    complianceScore: number;
    reportId: string | null;
  };
};

export type ReportPrintPayload = {
  organization: {
    id: string;
    name: string;
    plan: string;
    region: string;
    cloudMode: string;
    complianceFrameworks: string[];
  };
  report: {
    id: string;
    title: string;
    type: string;
    status: string;
    createdAt: string;
    generatedBy?: string | null;
    summary: string;
    findings: string[];
    risks: string[];
    recommendedActions: string[];
    relatedControls: string[];
    markdownContent?: string | null;
  };
  branding: {
    companyName: string;
    reportFooter: string;
    preparedByLabel: string;
    confidentialityLabel: string;
  };
  generatedAt: string;
  preparedBy: string;
  confidentialityLabel: string;
  executiveSummary: string;
  securityScore: number | null;
  criticalFindings: string[];
  affectedAssets: Array<{
    id: string;
    name: string;
    classification: string;
    riskLevel: string;
    owner: string;
    location: string;
  }>;
  eventTimeline: Array<{
    id: string;
    title: string;
    severity: string;
    status: string;
    timestamp: string;
    description: string;
    entries: Array<{
      actor: string;
      message: string;
      timestamp: string;
    }>;
  }>;
  riskMatrix: Array<{
    id: string;
    label: string;
    level: string;
    detail: string;
  }>;
  nistCsfMapping: Array<{
    id: string;
    name: string;
    score: number;
    status: string;
    gaps: string[];
    improvements: string[];
  }>;
  kvkkGdprImpact: {
    kvkkScore: number | null;
    gdprScore: number | null;
    scopedAssets: number;
    summary: string;
  };
  recommendedActions: string[];
  appendix: {
    relatedControls: string[];
    markdownContent: string;
    evidence: string[];
  };
  footer: string;
};

export class HcscApiError extends Error {
  status: number;
  code: string;
  meta?: Record<string, unknown>;

  constructor(message: string, options: { status: number; code?: string; meta?: Record<string, unknown> }) {
    super(message);
    this.name = "HcscApiError";
    this.status = options.status;
    this.code = options.code ?? "API_ERROR";
    this.meta = options.meta;
  }
}

async function readEnvelope<T>(response: Response) {
  const text = await response.text();

  if (!text.trim()) {
    if (!response.ok) {
      throw new HcscApiError("İstek tamamlanamadı.", { status: response.status });
    }

    return null as T;
  }

  let parsed: ApiEnvelope<T>;

  try {
    parsed = JSON.parse(text) as ApiEnvelope<T>;
  } catch {
    throw new HcscApiError("API yanıtı çözümlenemedi.", { status: response.status });
  }

  if (!response.ok || parsed.error) {
    throw new HcscApiError(parsed.error?.message ?? "İstek tamamlanamadı.", {
      status: response.status,
      code: parsed.error?.code,
      meta: parsed.meta,
    });
  }

  return parsed.data;
}

async function request<T>(path: string, options: RequestOptions = {}) {
  const headers = new Headers(options.headers);
  const body =
    options.body === undefined
      ? undefined
      : typeof options.body === "string"
        ? options.body
        : JSON.stringify(options.body);

  if (body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...options,
    headers,
    body,
    credentials: "include",
    cache: "no-store",
  });

  return readEnvelope<T>(response);
}

export function getCurrentUser() {
  return request<AuthUserPayload>("/api/auth/me", { method: "GET" });
}

export function registerAccount(payload: RegisterAccountPayload) {
  return request<AuthUserPayload>("/api/auth/register", {
    method: "POST",
    body: payload,
  });
}

export function requestPasswordReset(email: string) {
  return request<ForgotPasswordResponse>("/api/auth/forgot-password", {
    method: "POST",
    body: { email },
  });
}

export function resetPassword(payload: ResetPasswordPayload) {
  return request<{ success: boolean; message: string }>("/api/auth/reset-password", {
    method: "POST",
    body: payload,
  });
}

export function getTwoFactorSetup() {
  return request<TwoFactorSetupPayload>("/api/auth/2fa/setup", { method: "GET" });
}

export function confirmTwoFactorSetup(code: string) {
  return request<AuthUserPayload>("/api/auth/2fa/confirm", {
    method: "POST",
    body: { code },
  });
}

export function verifyTwoFactor(code: string, method: VerifyTwoFactorMethod = "totp") {
  return request<AuthUserPayload>("/api/auth/verify-2fa", {
    method: "POST",
    body: { code, method },
  });
}

export function getRecoveryCodeStatus() {
  return request<RecoveryCodeStatusPayload>("/api/auth/recovery-codes/status", {
    method: "GET",
  });
}

export function regenerateRecoveryCodes() {
  return request<{
    recoveryCodes: string[];
    status: RecoveryCodeStatusPayload;
  }>("/api/auth/recovery-codes/regenerate", {
    method: "POST",
  });
}

export function completeOnboarding(payload: OnboardingRequestPayload) {
  return request<{
    organization: OrganizationProfile;
    onboardingCompleted: boolean;
  }>("/api/auth/onboarding", {
    method: "POST",
    body: payload,
  });
}

export async function getDashboardSummary() {
  const [assets, accessRequests, events, deceptionAssets, compliance, reports, notifications] = await Promise.all([
    getAssets(),
    getAccessRequests(),
    getEvents(),
    getDeceptionAssets(),
    getCurrentCompliance(),
    getReports(),
    getNotifications(),
  ]);

  return {
    assets,
    accessRequests,
    events,
    deceptionAssets,
    compliance,
    reports,
    notifications,
  };
}

export function getAssets() {
  return request<DataAsset[]>("/api/assets", { method: "GET" });
}

export function getAsset(id: string) {
  return request<DataAsset>(`/api/assets/${id}`, { method: "GET" });
}

export function recalculateAssetRisk(id: string) {
  return request<DataAsset>(`/api/assets/${id}/recalculate-risk`, { method: "POST" });
}

export function getIdentities() {
  return request<IdentityProfile[]>("/api/identities", { method: "GET" });
}

export function getIdentity(id: string) {
  return request<IdentityProfile>(`/api/identities/${id}`, { method: "GET" });
}

export function updateIdentityStatus(id: string, status: IdentityStatus) {
  return request<IdentityProfile>(`/api/identities/${id}/status`, {
    method: "PATCH",
    body: { status },
  });
}

export function getAccessRequests() {
  return request<AccessRequest[]>("/api/access-requests", { method: "GET" });
}

export function createAccessRequest(payload: AccessRequestCreatePayload) {
  return request<AccessRequest>("/api/access-requests", {
    method: "POST",
    body: payload,
  });
}

export function evaluateAccessRequest(id: string) {
  return request<AccessRequest>(`/api/access-requests/${id}/evaluate`, { method: "POST" });
}

export function getEvents() {
  return request<SecurityEvent[]>("/api/events", { method: "GET" });
}

export function getEvent(id: string) {
  return request<SecurityEvent>(`/api/events/${id}`, { method: "GET" });
}

export function updateEventStatus(id: string, status: EventStatus) {
  return request<SecurityEvent>(`/api/events/${id}/status`, {
    method: "PATCH",
    body: { status },
  });
}

export function runEventPlaybook(id: string, action: SoarAction) {
  return request<SecurityEvent>(`/api/events/${id}/playbook`, {
    method: "POST",
    body: { action },
  });
}

export function getDeceptionAssets() {
  return request<DeceptionAsset[]>("/api/deception-assets", { method: "GET" });
}

export function createDeceptionAsset(payload: DeceptionAssetCreatePayload) {
  return request<DeceptionAsset>("/api/deception-assets", {
    method: "POST",
    body: payload,
  });
}

export function simulateDeceptionAccess(id: string, payload: { identityProfileId?: string } = {}) {
  return request(`/api/deception-assets/${id}/simulate-access`, {
    method: "POST",
    body: payload,
  });
}

export function getDeceptionTriggers(id: string) {
  return request<DeceptionTriggerRecord[]>(`/api/deception-assets/${id}/triggers`, { method: "GET" });
}

export function getCurrentCompliance() {
  return request<ComplianceSnapshot>("/api/compliance/current", { method: "GET" });
}

export function recalculateCompliance() {
  return request<ComplianceSnapshot>("/api/compliance/recalculate", { method: "POST" });
}

export function getReports() {
  return request<ReportItem[]>("/api/reports", { method: "GET" });
}

export function getReport(id: string) {
  return request<ReportItem>(`/api/reports/${id}`, { method: "GET" });
}

export function getReportPrintPayload(id: string) {
  return request<ReportPrintPayload>(`/api/reports/${id}/print-payload`, { method: "GET" });
}

export function printReport(id: string) {
  return request<{ success: boolean; reportId: string; title: string }>(`/api/reports/${id}/print`, {
    method: "POST",
  });
}

export function generateReport(payload: { type?: string } = {}) {
  return request<ReportItem>("/api/reports/generate", {
    method: "POST",
    body: payload,
  });
}

export function getAuditLogs() {
  return request<AuditLogItem[]>("/api/audit-logs", { method: "GET" });
}

export function getNotifications() {
  return request<NotificationItem[]>("/api/notifications", { method: "GET" });
}

export function markNotificationRead(id: string) {
  return request(`/api/notifications/${id}/read`, { method: "POST" });
}

export function markAllNotificationsRead() {
  return request("/api/notifications/read-all", { method: "POST" });
}

export function getSettings() {
  return request<SettingsBundle>("/api/settings", { method: "GET" });
}

export function updateRiskPolicy(payload: NonNullable<SettingsBundle["riskPolicy"]>) {
  return request<SettingsBundle["riskPolicy"]>("/api/settings/risk-policy", {
    method: "PATCH",
    body: payload,
  });
}

export function updateReportBranding(payload: NonNullable<SettingsBundle["reportBranding"]>) {
  return request<SettingsBundle["reportBranding"]>("/api/settings/report-branding", {
    method: "PATCH",
    body: payload,
  });
}

export function updateOrganizationSettings(payload: {
  name?: string;
  plan?: string;
  region?: string;
  cloudMode?: "private_cloud" | "public_cloud" | "hybrid_cloud";
  complianceFrameworks?: string[];
}) {
  return request("/api/settings/organization", {
    method: "PATCH",
    body: payload,
  });
}

export function getSimulations() {
  return request<SimulationListPayload>("/api/simulations", { method: "GET" });
}

export function runExecutiveDemo() {
  return request<ExecutiveDemoPayload>("/api/simulations/executive-demo", { method: "POST" });
}

export function getTeamMembers() {
  return request<{ members: TeamMemberRecord[] }>("/api/team/members", { method: "GET" });
}

export function getTeamInvites() {
  return request<{ invites: TeamInviteRecord[] }>("/api/team/invites", { method: "GET" });
}

export function createTeamInvite(payload: TeamInviteCreatePayload) {
  return request<TeamInviteCreateResult>("/api/team/invites", {
    method: "POST",
    body: payload,
  });
}

export function revokeTeamInvite(inviteId: string) {
  return request<{ success: boolean }>("/api/team/invites/revoke", {
    method: "POST",
    body: { inviteId },
  });
}

export function updateTeamMemberRole(userId: string, role: TeamRoleKey) {
  return request<{ members: TeamMemberRecord[] }>("/api/team/members/update-role", {
    method: "POST",
    body: { userId, role },
  });
}

export function disableTeamMember(userId: string) {
  return request<{ members: TeamMemberRecord[] }>("/api/team/members/disable", {
    method: "POST",
    body: { userId },
  });
}

export function acceptTeamInvite(token: string) {
  return request<{ success: boolean; organization: OrganizationProfile }>("/api/team/accept-invite", {
    method: "POST",
    body: { token },
  });
}
