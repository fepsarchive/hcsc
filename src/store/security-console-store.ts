"use client";

import { useSyncExternalStore } from "react";

import { mockAuthAccounts, mockOrganization } from "@/lib/auth-mock-data";
import { calculateComplianceSnapshot } from "@/lib/compliance-engine";
import { triggerDeceptionAccess } from "@/lib/deception-engine";
import {
  getAvailableMockAuthAccounts,
  isCustomDemoAuthAccount,
} from "@/lib/demo-auth-storage";
import {
  createSecurityEvent,
  executePlaybook,
  runSoarPlaybook,
  updateEventStatus as updateSecurityEventStatus,
} from "@/lib/event-engine";
import {
  completeOnboarding as completeOnboardingApi,
  createAccessRequest as createAccessRequestApi,
  createDeceptionAsset as createDeceptionAssetApi,
  evaluateAccessRequest as evaluateAccessRequestApi,
  generateReport as generateReportApi,
  getAccessRequests,
  getAssets,
  getAuditLogs,
  getCurrentCompliance,
  getCurrentUser,
  getDeceptionAssets,
  getEvents,
  getIdentities,
  getNotifications,
  getReports,
  getSettings,
  getSimulations,
  HcscApiError,
  markAllNotificationsRead as markAllNotificationsReadApi,
  markNotificationRead as markNotificationReadApi,
  recalculateAssetRisk as recalculateAssetRiskApi,
  recalculateCompliance as recalculateComplianceApi,
  registerAccount,
  requestPasswordReset as requestPasswordResetApi,
  runEventPlaybook,
  runExecutiveDemo as runExecutiveDemoApi,
  SettingsBundle,
  simulateDeceptionAccess as simulateDeceptionAccessApi,
  updateEventStatus as updateEventStatusApi,
  updateIdentityStatus as updateIdentityStatusApi,
  updateOrganizationSettings as updateOrganizationSettingsApi,
  updateReportBranding as updateReportBrandingApi,
  updateRiskPolicy as updateRiskPolicyApi,
} from "@/lib/hcsc-api";
import { createMockEnvironment } from "@/lib/mock-data";
import { hasPermission } from "@/lib/permissions";
import { generateReport, generateReports } from "@/lib/report-engine";
import { calculateAssetRisk as calculateSingleAssetRisk, calculateIdentityRisk } from "@/lib/risk-engine";
import { buildDashboardSummary, makeId } from "@/lib/utils";
import { evaluateZeroTrustRequest } from "@/lib/zero-trust-engine";
import type {
  AccessRequest,
  AuditLogItem,
  AppUser,
  AuthState,
  ComplianceSnapshot,
  DataAsset,
  DemoEnvironment,
  IdentityProfile,
  NotificationItem,
  OnboardingPayload,
  OrganizationProfile,
  Permission,
  PolicyRule,
  ReportType,
  SecurityEvent,
  SimulationRunResult,
  SoarAction,
  ToastMessage,
} from "@/types";

type MutableEnvironment = Omit<DemoEnvironment, "compliance" | "reports"> & {
  compliance?: DemoEnvironment["compliance"];
  reports?: DemoEnvironment["reports"];
};

type NewPolicyInput = {
  name: string;
  description: string;
  defaultDecision: PolicyRule["defaultDecision"];
  severity: PolicyRule["severity"];
  condition: string;
  action: string;
};

type CreateAccessRequestPayload = Omit<
  AccessRequest,
  "id" | "evaluation" | "status" | "identityName" | "targetAssetName"
>;

type CreateEventPayload = Parameters<typeof createSecurityEvent>[0];

type AuthActionResult = {
  success: boolean;
  error?: string;
  message?: string;
  redirectTo?: string;
};

type RegisterAccountPayload = {
  fullName: string;
  email: string;
  password: string;
  companyName: string;
};

type CreateAuditLogPayload = Omit<AuditLogItem, "id" | "timestamp" | "ipAddress" | "device" | "actorId" | "actorName" | "actorRole"> & {
  actorId?: string | null;
  actorName?: string;
  actorRole?: string;
};

type CreateNotificationPayload = Omit<NotificationItem, "id" | "createdAt" | "read">;

type OperationLoadingState = Partial<
  Record<
    | "hydrate"
    | "dashboard"
    | "assets"
    | "events"
    | "deception"
    | "reports"
    | "audit"
    | "notifications"
    | "settings"
    | "compliance"
    | "simulation"
    | "accessRequest"
    | "playbook"
    | "assetRisk"
    | "identity"
    | "report",
    boolean
  >
>;

type StoreMeta = {
  selectedAssetId: string | null;
  selectedEventId: string | null;
  selectedAccessRequestId: string | null;
  selectedDeceptionAssetId: string | null;
  demoMode: boolean;
  lastSimulationResult: SimulationRunResult | null;
  toasts: ToastMessage[];
  auth: AuthState;
  currentUser: AppUser | null;
  organization: OrganizationProfile;
  onboardingCompleted: boolean;
  auditLogs: AuditLogItem[];
  notifications: NotificationItem[];
  isHydrating: boolean;
  isApiMode: boolean;
  apiError: string | null;
  lastSyncedAt: string | null;
  operationLoading: OperationLoadingState;
  settingsBundle: SettingsBundle | null;
};

export type SecurityConsoleStore = {
  environment: DemoEnvironment;
  dashboard: ReturnType<typeof buildDashboardSummary>;
  assets: DemoEnvironment["assets"];
  identities: DemoEnvironment["identities"];
  accessRequests: DemoEnvironment["accessRequests"];
  events: DemoEnvironment["events"];
  deceptionAssets: DemoEnvironment["deceptions"];
  complianceScores: DemoEnvironment["compliance"];
  reports: DemoEnvironment["reports"];
  simulations: DemoEnvironment["simulations"];
  selectedAsset: DemoEnvironment["assets"][number] | null;
  selectedEvent: DemoEnvironment["events"][number] | null;
  selectedAccessRequest: DemoEnvironment["accessRequests"][number] | null;
  selectedDeceptionAsset: DemoEnvironment["deceptions"][number] | null;
  demoMode: boolean;
  lastSimulationResult: SimulationRunResult | null;
  toasts: ToastMessage[];
  auth: AuthState;
  currentUser: AppUser | null;
  currentOrganization: OrganizationProfile;
  onboardingCompleted: boolean;
  auditLogs: AuditLogItem[];
  notifications: NotificationItem[];
  isHydrating: boolean;
  isApiMode: boolean;
  apiError: string | null;
  lastSyncedAt: string | null;
  operationLoading: OperationLoadingState;
  settingsBundle: SettingsBundle | null;
  runSimulation: (scenarioId: string) => void;
  evaluateAccessRequest: (requestId: string) => Promise<void>;
  createAccessRequest: (payload: CreateAccessRequestPayload) => Promise<void>;
  updateAccessRequestDecision: (requestId: string, decision: AccessRequest["evaluation"]["decision"]) => void;
  createEvent: (payload: CreateEventPayload) => SecurityEvent;
  updateEventStatus: (eventId: string, status: SecurityEvent["status"]) => Promise<void>;
  runPlaybook: (eventId: string, action?: SoarAction) => Promise<void>;
  triggerDeception: (deceptionAssetId?: string, identityId?: string) => Promise<void>;
  calculateAssetRisk: (assetId: string) => Promise<void>;
  recalculateAllRisks: () => Promise<void>;
  generateReport: (type?: ReportType | string) => Promise<void>;
  updateComplianceScores: () => Promise<void>;
  resetDemoData: () => void;
  seedDemoData: () => void;
  setSelectedAsset: (assetId: string | null) => void;
  setSelectedEvent: (eventId: string | null) => void;
  setSelectedAccessRequest: (requestId: string | null) => void;
  setSelectedDeceptionAsset: (assetId: string | null) => void;
  togglePolicyRule: (ruleId: string) => void;
  addPolicyRule: (rule: NewPolicyInput) => void;
  createDeceptionStorage: () => Promise<void>;
  startDemoScenario: () => void;
  nextDemoStep: () => void;
  previousDemoStep: () => void;
  dismissToast: (toastId: string) => void;
  runRiskAnalysis: (assetId?: string) => Promise<void>;
  hydrateAuthSession: () => Promise<void>;
  hydrateFromApi: () => Promise<void>;
  refreshDashboard: () => Promise<void>;
  refreshAssets: () => Promise<void>;
  refreshEvents: () => Promise<void>;
  refreshDeception: () => Promise<void>;
  refreshReports: () => Promise<void>;
  refreshAuditLogs: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  login: (email: string, password: string) => Promise<AuthActionResult>;
  register: (payload: RegisterAccountPayload) => Promise<AuthActionResult>;
  requestPasswordReset: (email: string) => Promise<AuthActionResult>;
  verify2FA: (code: string, method?: "totp" | "recovery") => Promise<AuthActionResult>;
  logout: () => Promise<void>;
  completeOnboarding: (payload: OnboardingPayload) => Promise<boolean>;
  can: (permission: Permission) => boolean;
  addAuditLog: (payload: CreateAuditLogPayload) => void;
  addNotification: (payload: CreateNotificationPayload) => void;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  clearNotifications: () => Promise<void>;
  simulateDeceptionAccess: (deceptionAssetId: string, payload?: { identityProfileId?: string }) => Promise<void>;
  runExecutiveDemo: () => Promise<void>;
  recalculateCompliance: () => Promise<void>;
  recalculateAssetRisk: (assetId: string) => Promise<void>;
  updateIdentityStatus: (identityId: string, status: IdentityProfile["status"]) => Promise<void>;
  updateRiskPolicy: (payload: NonNullable<SettingsBundle["riskPolicy"]>) => Promise<void>;
  updateReportBranding: (payload: NonNullable<SettingsBundle["reportBranding"]>) => Promise<void>;
  updateOrganizationSettings: (payload: {
    name?: string;
    plan?: string;
    region?: string;
    cloudMode?: "private_cloud" | "public_cloud" | "hybrid_cloud";
    complianceFrameworks?: string[];
  }) => Promise<void>;
};

const AUTH_SESSION_KEY = "hcsc-auth-session";
const ALLOW_LOCAL_AUTH_FALLBACK = process.env.NODE_ENV !== "production";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emitChange() {
  listeners.forEach((listener) => listener());
}

function createInitialMeta(): StoreMeta {
  return {
    selectedAssetId: null,
    selectedEventId: null,
    selectedAccessRequestId: null,
    selectedDeceptionAssetId: null,
    demoMode: false,
    lastSimulationResult: null,
    toasts: [],
    auth: {
      hydrated: false,
      isAuthenticated: false,
      is2FAVerified: false,
      currentUserId: null,
      sessionStartedAt: null,
      lastLoginAt: null,
    },
    currentUser: null,
    organization: mockOrganization,
    onboardingCompleted: false,
    auditLogs: [],
    notifications: [],
    isHydrating: false,
    isApiMode: false,
    apiError: null,
    lastSyncedAt: null,
    operationLoading: {},
    settingsBundle: null,
  };
}

function persistAuthMeta(meta: StoreMeta) {
  if (typeof window === "undefined") return;

  window.sessionStorage.setItem(
    AUTH_SESSION_KEY,
    JSON.stringify({
      auth: meta.auth,
      currentUser: meta.currentUser,
      onboardingCompleted: meta.onboardingCompleted,
      organization: meta.organization,
      auditLogs: meta.auditLogs.slice(0, 100),
      notifications: meta.notifications.slice(0, 40),
    }),
  );
}

function readPersistedAuthMeta() {
  if (typeof window === "undefined") return null;

  const raw = window.sessionStorage.getItem(AUTH_SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as Pick<StoreMeta, "auth" | "currentUser" | "onboardingCompleted" | "organization" | "auditLogs" | "notifications">;
  } catch {
    return null;
  }
}

type AuthApiPayload = {
  authenticated: boolean;
  twoFactorVerified: boolean;
  sessionStartedAt: string | null;
  user: AppUser | null;
  organization: OrganizationProfile | null;
  onboardingCompleted: boolean;
  twoFactorEnrolled?: boolean;
  recoveryCodes?: string[];
  nextPath?: string;
  permissions?: Permission[];
};

async function parseAuthApiResponse(response: Response) {
  const payload = (await response.json().catch(() => null)) as
    | { data?: AuthApiPayload | null; error?: { message?: string } | null }
    | null;

  if (!response.ok) {
    return {
      success: false as const,
      error:
        payload?.error?.message ??
        "Kimlik doğrulama isteği tamamlanamadı.",
    };
  }

  return {
    success: true as const,
    data: payload?.data ?? null,
  };
}

function applyServerAuthPayload(data: AuthApiPayload | null) {
  if (!data || !data.authenticated || !data.user || !data.organization) {
    setMeta({
      auth: {
        hydrated: true,
        isAuthenticated: false,
        is2FAVerified: false,
        currentUserId: null,
        sessionStartedAt: null,
        lastLoginAt: null,
      },
      currentUser: null,
      organization: mockOrganization,
      onboardingCompleted: false,
    });
    return;
  }

  setMeta({
    auth: {
      hydrated: true,
      isAuthenticated: data.authenticated,
      is2FAVerified: data.twoFactorVerified,
      currentUserId: data.user.id,
      sessionStartedAt: data.sessionStartedAt,
      lastLoginAt: data.user.lastLoginAt,
    },
    currentUser: data.user,
    organization: data.organization,
    onboardingCompleted: data.onboardingCompleted,
  });
}

function getCurrentActor() {
  const currentUser = currentMeta.currentUser;

  return {
    actorId: currentUser?.id ?? null,
    actorName: currentUser?.name ?? "System",
    actorRole: currentUser?.role ?? "System",
  };
}

function buildFoundationEnvironment() {
  return createMockEnvironment();
}

function setOperationLoading(key: keyof OperationLoadingState, value: boolean) {
  setMeta({
    operationLoading: {
      ...currentMeta.operationLoading,
      [key]: value,
    },
  });
}

function resolveApiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof HcscApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

function buildApiEnvironmentBundle(input: {
  assets: DataAsset[];
  identities: IdentityProfile[];
  accessRequests: AccessRequest[];
  events: SecurityEvent[];
  deceptions: DemoEnvironment["deceptions"];
  compliance: ComplianceSnapshot;
  reports: DemoEnvironment["reports"];
  simulations?: DemoEnvironment["simulations"];
  runs?: DemoEnvironment["runs"];
}) {
  const foundation = buildFoundationEnvironment();

  return {
    ...foundation,
    assets: input.assets,
    identities: input.identities,
    accessRequests: input.accessRequests,
    events: input.events,
    deceptions: input.deceptions,
    compliance: input.compliance,
    reports: input.reports,
    simulations: input.simulations ?? foundation.simulations,
    runs: input.runs ?? foundation.runs,
    demoScenario: currentEnvironment.demoScenario ?? foundation.demoScenario,
  } satisfies DemoEnvironment;
}

function mapDecisionToStatus(decision: AccessRequest["evaluation"]["decision"]): AccessRequest["status"] {
  if (decision === "allow" || decision === "limited_allow") return "approved";
  if (decision === "require_step_up_auth") return "step_up";
  if (decision === "deny") return "rejected";
  return "isolated";
}

function deriveEnvironment(environment: MutableEnvironment): DemoEnvironment {
  const events = [...environment.events].sort((left, right) => right.timestamp.localeCompare(left.timestamp));
  const assets = environment.assets.map((asset) => ({
    ...asset,
    risk: calculateSingleAssetRisk(asset, events),
  }));
  const identities = environment.identities.map((identity) => {
    const risk = calculateIdentityRisk(identity, events);
    return {
      ...identity,
      riskScore: risk.score,
    };
  });

  const accessRequests = environment.accessRequests.map((request) => {
    const identity = identities.find((entry) => entry.id === request.identityId);
    const asset = assets.find((entry) => entry.id === request.targetAssetId);
    if (!identity || !asset) return request;

    const relatedEvents = events
      .filter((event) => event.relatedIdentityId === identity.id || event.source === identity.name)
      .map((event) => event.category);

    return {
      ...request,
      evaluation:
        request.status === "pending"
          ? request.evaluation
          : evaluateZeroTrustRequest(request, asset, identity, {
              targetIsDeception: asset.isDeception,
              targetLocation: asset.location,
              recentEvents: relatedEvents,
            }),
    };
  });

  const base = {
    ...environment,
    assets,
    identities,
    accessRequests,
    events,
    reports: [],
  };

  const compliance = calculateComplianceSnapshot(base);
  const withCompliance = {
    ...base,
    compliance,
  };

  return {
    ...withCompliance,
    reports: generateReports(withCompliance),
  };
}

function buildDemoRequest(current: DemoEnvironment): AccessRequest {
  const identity = current.identities.find((entry) => entry.name === "Emre Kaya");
  const asset = current.assets.find((entry) => entry.name === "customer-db");
  if (!identity || !asset) throw new Error("Demo request dependencies missing.");

  const evaluation = evaluateZeroTrustRequest(
    {
      identityType: identity.type,
      mfa: false,
      deviceTrust: "unknown",
      requestedAction: "export",
      locationRisk: "high",
      timeRisk: "off_hours",
      anomalyScore: identity.anomalyScore,
    },
    asset,
    identity,
    {
      targetLocation: asset.location,
    },
  );

  return {
    id: makeId("req"),
    identityId: identity.id,
    identityName: identity.name,
    identityType: identity.type,
    role: identity.role,
    targetAssetId: asset.id,
    targetAssetName: asset.name,
    sourceLocation: "saas",
    sourceRegion: "DE-FRA",
    deviceTrust: "unknown",
    requestTime: new Date().toISOString(),
    requestedAction: "export",
    mfa: false,
    anomalyScore: identity.anomalyScore,
    locationRisk: "high",
    timeRisk: "off_hours",
    dataSensitivity: asset.classification,
    evaluation,
    status: mapDecisionToStatus(evaluation.decision),
  };
}

function buildSnapshot(environment: DemoEnvironment, meta: StoreMeta): Omit<
  SecurityConsoleStore,
  | "runSimulation"
  | "evaluateAccessRequest"
  | "createAccessRequest"
  | "updateAccessRequestDecision"
  | "createEvent"
  | "updateEventStatus"
  | "runPlaybook"
  | "triggerDeception"
  | "calculateAssetRisk"
  | "recalculateAllRisks"
  | "generateReport"
  | "updateComplianceScores"
  | "resetDemoData"
  | "seedDemoData"
  | "setSelectedAsset"
  | "setSelectedEvent"
  | "setSelectedAccessRequest"
  | "setSelectedDeceptionAsset"
  | "togglePolicyRule"
  | "addPolicyRule"
  | "createDeceptionStorage"
  | "startDemoScenario"
  | "nextDemoStep"
  | "previousDemoStep"
  | "dismissToast"
  | "runRiskAnalysis"
  | "hydrateAuthSession"
  | "login"
  | "register"
  | "requestPasswordReset"
  | "verify2FA"
  | "logout"
  | "completeOnboarding"
  | "can"
  | "addAuditLog"
  | "addNotification"
  | "markNotificationRead"
  | "markAllNotificationsRead"
  | "clearNotifications"
  | "hydrateFromApi"
  | "refreshDashboard"
  | "refreshAssets"
  | "refreshEvents"
  | "refreshDeception"
  | "refreshReports"
  | "refreshAuditLogs"
  | "refreshNotifications"
  | "refreshSettings"
  | "simulateDeceptionAccess"
  | "runExecutiveDemo"
  | "recalculateCompliance"
  | "recalculateAssetRisk"
  | "updateIdentityStatus"
  | "updateRiskPolicy"
  | "updateReportBranding"
  | "updateOrganizationSettings"
> {
  return {
    environment,
    dashboard: buildDashboardSummary(environment),
    assets: environment.assets,
    identities: environment.identities,
    accessRequests: environment.accessRequests,
    events: environment.events,
    deceptionAssets: environment.deceptions,
    complianceScores: environment.compliance,
    reports: environment.reports,
    simulations: environment.simulations,
    selectedAsset: environment.assets.find((asset) => asset.id === meta.selectedAssetId) ?? null,
    selectedEvent: environment.events.find((event) => event.id === meta.selectedEventId) ?? null,
    selectedAccessRequest:
      environment.accessRequests.find((request) => request.id === meta.selectedAccessRequestId) ?? null,
    selectedDeceptionAsset:
      environment.deceptions.find((asset) => asset.id === meta.selectedDeceptionAssetId) ?? null,
    demoMode: meta.demoMode,
    lastSimulationResult: meta.lastSimulationResult,
    toasts: meta.toasts,
    auth: meta.auth,
    currentUser: meta.currentUser,
    currentOrganization: meta.organization,
    onboardingCompleted: meta.onboardingCompleted,
    auditLogs: meta.auditLogs,
    notifications: meta.notifications,
    isHydrating: meta.isHydrating,
    isApiMode: meta.isApiMode,
    apiError: meta.apiError,
    lastSyncedAt: meta.lastSyncedAt,
    operationLoading: meta.operationLoading,
    settingsBundle: meta.settingsBundle,
  };
}

let currentEnvironment = deriveEnvironment(createMockEnvironment());
let currentMeta = createInitialMeta();

function setEnvironment(
  nextEnvironment: MutableEnvironment | DemoEnvironment,
  metaPatch?: Partial<StoreMeta>,
  mode: "derived" | "direct" = "derived",
) {
  currentEnvironment =
    mode === "direct"
      ? (nextEnvironment as DemoEnvironment)
      : deriveEnvironment(nextEnvironment as MutableEnvironment);
  currentMeta = { ...currentMeta, ...metaPatch };
  persistAuthMeta(currentMeta);
  store = { ...buildSnapshot(currentEnvironment, currentMeta), ...actions };
  emitChange();
}

function setMeta(metaPatch: Partial<StoreMeta>) {
  currentMeta = { ...currentMeta, ...metaPatch };
  persistAuthMeta(currentMeta);
  store = { ...buildSnapshot(currentEnvironment, currentMeta), ...actions };
  emitChange();
}

function pushToast(toast: Omit<ToastMessage, "id">) {
  const duplicate = currentMeta.toasts.find(
    (entry) =>
      entry.title === toast.title &&
      entry.description === toast.description &&
      entry.tone === toast.tone,
  );

  if (duplicate) return;

  setMeta({
    toasts: [{ id: makeId("toast"), ...toast }, ...currentMeta.toasts].slice(0, 5),
  });
}

function pushNotification(payload: CreateNotificationPayload) {
  const duplicate = currentMeta.notifications.find(
    (entry) =>
      entry.title === payload.title &&
      entry.description === payload.description &&
      entry.type === payload.type,
  );

  if (duplicate) return;

  setMeta({
    notifications: [
      {
        id: makeId("ntf"),
        createdAt: new Date().toISOString(),
        read: false,
        ...payload,
      },
      ...currentMeta.notifications,
    ].slice(0, 40),
  });
}

function pushAuditLog(payload: CreateAuditLogPayload) {
  const actor = getCurrentActor();
  setMeta({
    auditLogs: [
      {
        id: makeId("audit"),
        timestamp: new Date().toISOString(),
        ipAddress: "10.24.8.14",
        device: "Managed macOS / Workspace Browser",
        actorId: payload.actorId ?? actor.actorId,
        actorName: payload.actorName ?? actor.actorName,
        actorRole: payload.actorRole ?? actor.actorRole,
        ...payload,
      },
      ...currentMeta.auditLogs,
    ].slice(0, 200),
  });
}

function applyDemoStep(current: DemoEnvironment, stepIndex: number) {
  const stepId = current.demoScenario.steps[stepIndex]?.id;
  if (!stepId) return current;

  let next = current;

  if (stepId === "demo-2") {
    next = deriveEnvironment({
      ...current,
      accessRequests: [buildDemoRequest(current), ...current.accessRequests],
    });
  }

  if (stepId === "demo-4") {
    const event = createSecurityEvent({
      title: "Zero Trust karar olayı",
      severity: "high",
      category: "policy_violation",
      source: "Zero Trust Policy Engine",
      target: "customer-db",
      description: "Kritik veriye mesai dışı export denemesi olay merkezine düştü.",
      relatedControl: "Zero Trust + SIEM",
      recommendation: "Step-up auth veya deny uygulanmalı.",
      relatedAssetId: current.assets.find((asset) => asset.name === "customer-db")?.id,
    });
    next = deriveEnvironment({
      ...next,
      events: [event, ...next.events],
    });
  }

  if (stepId === "demo-6") {
    const identity = next.identities.find((entry) => entry.name === "finance-batch-svc");
    const asset = next.assets.find((entry) => entry.name === "admin-secrets-bucket");
    if (identity && asset) {
      const evaluation = evaluateZeroTrustRequest(
        {
          identityType: identity.type,
          mfa: false,
          deviceTrust: "unknown",
          requestedAction: "read",
          locationRisk: "high",
          timeRisk: "off_hours",
          anomalyScore: identity.anomalyScore,
        },
        asset,
        identity,
        {
          targetIsDeception: true,
          targetLocation: asset.location,
        },
      );

      next = deriveEnvironment({
        ...next,
        accessRequests: [
          {
            id: makeId("req"),
            identityId: identity.id,
            identityName: identity.name,
            identityType: identity.type,
            role: identity.role,
            targetAssetId: asset.id,
            targetAssetName: asset.name,
            sourceLocation: "public_cloud",
            sourceRegion: "US-EAST",
            deviceTrust: "unknown",
            requestTime: new Date().toISOString(),
            requestedAction: "read",
            mfa: false,
            anomalyScore: identity.anomalyScore,
            locationRisk: "high",
            timeRisk: "off_hours",
            dataSensitivity: asset.classification,
            evaluation,
            status: "isolated",
          },
          ...next.accessRequests,
        ],
      });
    }
  }

  if (stepId === "demo-7") {
    const deception = next.deceptions.find((entry) => entry.name === "admin-secrets-bucket");
    const identity = next.identities.find((entry) => entry.name === "finance-batch-svc");
    if (deception && identity) {
      const incident = triggerDeceptionAccess(deception, identity);
      next = deriveEnvironment({
        ...next,
        events: [incident.event, ...next.events],
        identities: next.identities.map((entry) =>
          entry.id === incident.updatedIdentity.id ? incident.updatedIdentity : entry,
        ),
        deceptions: next.deceptions.map((entry) =>
          entry.id === incident.updatedDeception.id ? incident.updatedDeception : entry,
        ),
      });
    }
  }

  return {
    ...next,
      demoScenario: {
        ...next.demoScenario,
        active: true,
        currentStep: stepIndex,
        steps: next.demoScenario.steps.map((step, index) => ({
          ...step,
          status: (
            index < stepIndex ? "completed" : index === stepIndex ? "active" : "pending"
          ) as "pending" | "active" | "completed",
        })),
      },
    };
}

async function hydrateEnvironmentFromApi(options?: { silent?: boolean }) {
  if (!currentMeta.auth.isAuthenticated || !currentMeta.auth.is2FAVerified) {
    return false;
  }

  setOperationLoading("hydrate", true);
  setMeta({
    isHydrating: true,
    apiError: null,
  });

  try {
    const allowSettings = hasPermission(currentMeta.currentUser?.role, "manage_settings");

    const [
      assets,
      identities,
      accessRequests,
      events,
      deceptions,
      compliance,
      reports,
      auditLogs,
      notifications,
      simulations,
      settingsBundle,
    ] = await Promise.all([
      getAssets(),
      getIdentities(),
      getAccessRequests(),
      getEvents(),
      getDeceptionAssets(),
      getCurrentCompliance(),
      getReports(),
      getAuditLogs().catch(() => currentMeta.auditLogs),
      getNotifications(),
      getSimulations().catch(() => ({
        simulations: currentEnvironment.simulations,
        runs: currentEnvironment.runs,
      })),
      allowSettings
        ? getSettings().catch((error) => {
            if (error instanceof HcscApiError && [401, 403, 404].includes(error.status)) {
              return null;
            }

            throw error;
          })
        : Promise.resolve(null),
    ]);

    const nextEnvironment = buildApiEnvironmentBundle({
      assets,
      identities,
      accessRequests,
      events,
      deceptions,
      compliance,
      reports,
      simulations: simulations.simulations,
      runs: simulations.runs,
    });

    setEnvironment(
      nextEnvironment,
      {
        auditLogs,
        notifications,
        isHydrating: false,
        isApiMode: true,
        apiError: null,
        lastSyncedAt: new Date().toISOString(),
        settingsBundle,
        organization: settingsBundle?.organization ?? currentMeta.organization,
      },
      "direct",
    );

    return true;
  } catch (error) {
    const message = resolveApiErrorMessage(error, "API verileri senkronize edilemedi.");

    setMeta({
      isHydrating: false,
      apiError: message,
    });

    if (!options?.silent) {
      pushToast({
        title: "API senkronizasyonu başarısız",
        description: message,
        tone: "warning",
      });
    }

    return false;
  } finally {
    setOperationLoading("hydrate", false);
  }
}

const actions: Pick<
  SecurityConsoleStore,
  | "runSimulation"
  | "evaluateAccessRequest"
  | "createAccessRequest"
  | "updateAccessRequestDecision"
  | "createEvent"
  | "updateEventStatus"
  | "runPlaybook"
  | "triggerDeception"
  | "calculateAssetRisk"
  | "recalculateAllRisks"
  | "generateReport"
  | "updateComplianceScores"
  | "resetDemoData"
  | "seedDemoData"
  | "setSelectedAsset"
  | "setSelectedEvent"
  | "setSelectedAccessRequest"
  | "setSelectedDeceptionAsset"
  | "togglePolicyRule"
  | "addPolicyRule"
  | "createDeceptionStorage"
  | "startDemoScenario"
  | "nextDemoStep"
  | "previousDemoStep"
  | "dismissToast"
  | "runRiskAnalysis"
  | "hydrateAuthSession"
  | "login"
  | "register"
  | "requestPasswordReset"
  | "verify2FA"
  | "logout"
  | "completeOnboarding"
  | "can"
  | "addAuditLog"
  | "addNotification"
  | "markNotificationRead"
  | "markAllNotificationsRead"
  | "clearNotifications"
  | "hydrateFromApi"
  | "refreshDashboard"
  | "refreshAssets"
  | "refreshEvents"
  | "refreshDeception"
  | "refreshReports"
  | "refreshAuditLogs"
  | "refreshNotifications"
  | "refreshSettings"
  | "simulateDeceptionAccess"
  | "runExecutiveDemo"
  | "recalculateCompliance"
  | "recalculateAssetRisk"
  | "updateIdentityStatus"
  | "updateRiskPolicy"
  | "updateReportBranding"
  | "updateOrganizationSettings"
> = {
  runSimulation(scenarioId) {
    pushAuditLog({
      action: "simulation_started",
      module: "Simulations",
      target: scenarioId,
      severity: "info",
      result: "success",
      details: `${scenarioId} senaryosu tetiklendi.`,
    });

    if (scenarioId === "sim-4") {
      actions.triggerDeception(undefined, "id-finance-batch");
      return;
    }

    let next = currentEnvironment;
    const createdAt = new Date().toISOString();
    const generatedEventIds: string[] = [];

    const addEvent = (payload: CreateEventPayload) => {
      const event = createSecurityEvent({ ...payload, timestamp: createdAt });
      generatedEventIds.push(event.id);
      next = deriveEnvironment({
        ...next,
        events: [event, ...next.events],
      });
    };

    switch (scenarioId) {
      case "sim-1":
        next = deriveEnvironment({
          ...next,
          accessRequests: [buildDemoRequest(currentEnvironment), ...currentEnvironment.accessRequests],
        });
        addEvent({
          title: "MFA olmadan kritik erişim",
          category: "policy_violation",
          description: "Kritik veri için MFA eksik erişim talebi üretildi.",
          recommendation: "Talep deny veya step-up ile sınırlandırılmalı.",
          severity: "high",
          source: "Simulation Center",
          target: "customer-db",
          relatedControl: "Zero Trust + MFA",
        });
        break;
      case "sim-2":
        addEvent({
          title: "Mesai dışı export denemesi",
          category: "suspicious_export",
          description: "Mesai dışı export talebi DLP ve SIEM akışına düştü.",
          recommendation: "Require MFA ve create ticket çalıştırılmalı.",
          severity: "high",
          source: "Simulation Center",
          target: "analytics-bucket",
          relatedControl: "DLP + SOAR",
        });
        break;
      case "sim-3":
        next = deriveEnvironment({
          ...next,
          assets: next.assets.map((asset) =>
            asset.id === "asset-analytics-bucket" ? { ...asset, encryptionEnabled: false, kmsEnabled: false } : asset,
          ),
        });
        addEvent({
          title: "Şifrelenmemiş hassas veri",
          category: "missing_encryption",
          description: "Hassas public cloud varlığında encryption açığı üretildi.",
          recommendation: "Encryption ve KMS zorunlu hale getirilmeli.",
          severity: "critical",
          source: "Simulation Center",
          target: "analytics-bucket",
          relatedControl: "Encryption + KMS + CSPM",
        });
        break;
      case "sim-5":
        addEvent({
          title: "Üçüncü taraf API anomalisi",
          category: "third_party_anomaly",
          description: "Third-party connector olağan dışı istek paterni sergiledi.",
          recommendation: "Revoke token ve supplier review başlatılmalı.",
          severity: "high",
          source: "vendor-integration-api",
          target: "crm-export",
          relatedControl: "CASB + API Gateway",
        });
        break;
      case "sim-6":
        addEvent({
          title: "Ransomware göstergesi",
          category: "ransomware_indicator",
          description: "Kısa sürede yoğun dosya değişiklik davranışı simüle edildi.",
          recommendation: "Kaynağı izole et ve backup restore hazırlığını başlat.",
          severity: "critical",
          source: "EDR Telemetry",
          target: "finance-records",
          relatedControl: "Backup + SOAR + CWPP",
        });
        break;
      case "sim-7":
        addEvent({
          title: "İç kullanıcı yetki aşımı",
          category: "unauthorized_access_attempt",
          description: "İç kullanıcı rolü dışında bir veri kümesine erişmeye çalıştı.",
          recommendation: "RBAC/ABAC politikası üzerinden deny uygulanmalı.",
          severity: "high",
          source: "Emre Kaya",
          target: "finance-records",
          relatedControl: "RBAC/ABAC + IAM",
        });
        break;
      case "sim-8":
        addEvent({
          title: "Sınırlandırılmamış kaynak tüketimi",
          category: "api_abuse",
          description: "API kullanımında kaynak tüketim eşiği aşılmaya yaklaştı.",
          recommendation: "Rate limit ve quota enforcement artırılmalı.",
          severity: "medium",
          source: "reporting-export-svc",
          target: "raw-ingest-zone",
          relatedControl: "API Gateway + CWPP",
        });
        break;
      case "sim-9":
        addEvent({
          title: "Loglama kapalı kaynak",
          category: "visibility_gap",
          description: "Bir kaynağın telemetri akışı kesilmiş olarak simüle edildi.",
          recommendation: "Log forwarding agent yeniden aktive edilmeli.",
          severity: "medium",
          source: "Simulation Center",
          target: "ops-telemetry",
          relatedControl: "SIEM + CSPM",
        });
        break;
      case "sim-10":
        addEvent({
          title: "KVKK yurt dışı aktarım riski",
          category: "third_party_anomaly",
          description: "Kişisel veri içeren export paketi overseas transfer riski ile işaretlendi.",
          recommendation: "Transfer kaydı ve privacy review süreci başlatılmalı.",
          severity: "high",
          source: "Privacy Guard",
          target: "crm-export",
          relatedControl: "KVKK/GDPR + CASB",
        });
        break;
      default:
        break;
    }

    const run: SimulationRunResult = {
      id: makeId("run"),
      scenarioId,
      summary: `${next.simulations.find((simulation) => simulation.id === scenarioId)?.title ?? "Operasyon"} senaryosu çalıştırıldı.`,
      createdAt,
      generatedEventIds,
      affectedModules: next.simulations.find((simulation) => simulation.id === scenarioId)?.affectedModules ?? [],
    };

    setEnvironment(
      {
        ...next,
        runs: [run, ...next.runs],
      },
      {
        lastSimulationResult: run,
      },
    );

    pushToast({
      title: "Senaryo tamamlandı",
      description: "İlgili olaylar, risk skorları ve raporlar güncellendi.",
      tone: "success",
    });
    pushNotification({
      title: "Senaryo tamamlandı",
      description: run.summary,
      type: "simulation_completed",
      severity: "info",
      module: "Simulations",
      actionHref: "/simulations",
    });
    pushAuditLog({
      action: "simulation_completed",
      module: "Simulations",
      target: scenarioId,
      severity: generatedEventIds.length ? "high" : "info",
      result: "success",
      details: run.summary,
    });
  },

  async evaluateAccessRequest(requestId) {
    setOperationLoading("accessRequest", true);

    try {
      const evaluated = await evaluateAccessRequestApi(requestId);
      const synced = await hydrateEnvironmentFromApi({ silent: true });

      pushToast({
        title: "Zero Trust kararı üretildi",
        description: `${evaluated.identityName} için ${evaluated.evaluation.decision} kararı oluşturuldu.`,
        tone: "policy",
      });

      if (!synced) {
        setEnvironment(
          {
            ...currentEnvironment,
            accessRequests: currentEnvironment.accessRequests.map((entry) =>
              entry.id === requestId ? evaluated : entry,
            ),
          },
          undefined,
          "direct",
        );
      }

      return;
    } catch {
      // API unavailable, continue with local deterministic fallback.
    } finally {
      setOperationLoading("accessRequest", false);
    }

    const request = currentEnvironment.accessRequests.find((entry) => entry.id === requestId);
    if (!request) return;
    const identity = currentEnvironment.identities.find((entry) => entry.id === request.identityId);
    const asset = currentEnvironment.assets.find((entry) => entry.id === request.targetAssetId);
    if (!identity || !asset) return;

    const recentEvents = currentEnvironment.events
      .filter((event) => event.relatedIdentityId === identity.id || event.source === identity.name)
      .map((event) => event.category);

    const evaluation = evaluateZeroTrustRequest(request, asset, identity, {
      targetIsDeception: asset.isDeception,
      targetLocation: asset.location,
      recentEvents,
    });

    const status = mapDecisionToStatus(evaluation.decision);
    const requests = currentEnvironment.accessRequests.map((entry) =>
      entry.id === requestId ? { ...entry, evaluation, status } : entry,
    );

    let next = deriveEnvironment({
      ...currentEnvironment,
      accessRequests: requests,
    });

    if (["deny", "isolate", "require_step_up_auth"].includes(evaluation.decision)) {
      const event = createSecurityEvent({
        title: "Zero Trust karar olayı",
        severity: evaluation.decision === "isolate" ? "critical" : evaluation.decision === "deny" ? "high" : "medium",
        category: asset.isDeception ? "deception_triggered" : "policy_violation",
        source: identity.name,
        target: asset.name,
        description: evaluation.reasons.join(" "),
        recommendation: evaluation.requiredActions.join(", "),
        relatedControl: "Zero Trust Policy Engine",
        relatedAssetId: asset.id,
        relatedIdentityId: identity.id,
      });

      next = deriveEnvironment({
        ...next,
        events: [event, ...next.events],
      });
    }

    setEnvironment(next);
    pushToast({
      title: "Zero Trust kararı üretildi",
      description: `${identity.name} için ${evaluation.decision} kararı oluşturuldu.`,
      tone: "policy",
    });
    pushAuditLog({
      action: "access_request_evaluated",
      module: "Access Requests",
      target: `${identity.name} -> ${asset.name}`,
      severity: evaluation.decision === "isolate" ? "critical" : evaluation.decision === "deny" ? "high" : "info",
      result: "success",
      details: `${evaluation.decision} kararı üretildi.`,
    });
    pushAuditLog({
      action: "zero_trust_decision_generated",
      module: "Policy Engine",
      target: requestId,
      severity: evaluation.decision === "isolate" ? "critical" : evaluation.decision === "deny" ? "high" : "info",
      result: "success",
      details: evaluation.reasons.join(" "),
    });
    if (status === "step_up") {
      pushNotification({
        title: "Ek doğrulama gereken erişim talebi",
        description: `${identity.name} için step-up auth gerekiyor.`,
        type: "access_request_pending",
        severity: "medium",
        module: "Access Requests",
        actionHref: "/access-requests",
      });
    }
  },

  async createAccessRequest(payload) {
    setOperationLoading("accessRequest", true);

    try {
      const created = await createAccessRequestApi({
        identityProfileId: payload.identityId,
        assetId: payload.targetAssetId,
        requestedAction: payload.requestedAction,
        justification: undefined,
        sourceLocation: payload.sourceLocation,
        sourceRegion: payload.sourceRegion,
        deviceTrust: payload.deviceTrust,
        mfa: payload.mfa,
        anomalyScore: payload.anomalyScore,
        locationRisk: payload.locationRisk,
        timeRisk: payload.timeRisk,
      });

      const synced = await hydrateEnvironmentFromApi({ silent: true });

      if (!synced) {
        setEnvironment(
          {
            ...currentEnvironment,
            accessRequests: [created, ...currentEnvironment.accessRequests],
          },
          undefined,
          "direct",
        );
      }

      pushToast({
        title: "Erişim talebi oluşturuldu",
        description: `${created.identityName} için ${created.targetAssetName} talebi kaydedildi.`,
        tone: "info",
      });
      return;
    } catch {
      // API unavailable, continue with local fallback.
    } finally {
      setOperationLoading("accessRequest", false);
    }

    const identity = currentEnvironment.identities.find((entry) => entry.id === payload.identityId);
    const asset = currentEnvironment.assets.find((entry) => entry.id === payload.targetAssetId);
    if (!identity || !asset) return;

    const evaluation = evaluateZeroTrustRequest(payload, asset, identity, {
      targetIsDeception: asset.isDeception,
      targetLocation: asset.location,
    });

    const request: AccessRequest = {
      ...payload,
      id: makeId("req"),
      identityName: identity.name,
      targetAssetName: asset.name,
      evaluation,
      status: "pending",
    };

    setEnvironment({
      ...currentEnvironment,
      accessRequests: [request, ...currentEnvironment.accessRequests],
    });
  },

  updateAccessRequestDecision(requestId, decision) {
    const requests = currentEnvironment.accessRequests.map((request) =>
      request.id === requestId
        ? {
            ...request,
            evaluation: { ...request.evaluation, decision },
            status: mapDecisionToStatus(decision),
          }
        : request,
    );
    setEnvironment({
      ...currentEnvironment,
      accessRequests: requests,
    });
  },

  createEvent(payload) {
    const event = createSecurityEvent(payload);
    setEnvironment({
      ...currentEnvironment,
      events: [event, ...currentEnvironment.events],
    });
    return event;
  },

  async updateEventStatus(eventId, status) {
    setOperationLoading("events", true);

    try {
      await updateEventStatusApi(eventId, status);
      await hydrateEnvironmentFromApi({ silent: true });
      pushToast({
        title: "Event durumu güncellendi",
        description: `${eventId} için durum ${status} olarak kaydedildi.`,
        tone: "info",
      });
      return;
    } catch {
      // API unavailable, continue with local fallback.
    } finally {
      setOperationLoading("events", false);
    }

    setEnvironment({
      ...currentEnvironment,
      events: currentEnvironment.events.map((event) =>
        event.id === eventId ? updateSecurityEventStatus(event, status) : event,
      ),
    });
  },

  async runPlaybook(eventId, action) {
    setOperationLoading("playbook", true);

    try {
      await runEventPlaybook(eventId, action ?? "mark_contained");
      await hydrateEnvironmentFromApi({ silent: true });
      pushToast({
        title: "SOAR playbook çalıştırıldı",
        description: action ? `${action} aksiyonu uygulandı.` : "Önerilen playbook aksiyonları yürütüldü.",
        tone: "success",
      });
      return;
    } catch {
      // API unavailable, continue with local fallback.
    } finally {
      setOperationLoading("playbook", false);
    }

    const event = currentEnvironment.events.find((entry) => entry.id === eventId);
    if (!event) return;

    const updatedEvent = action ? runSoarPlaybook(event, action) : executePlaybook(event);
    setEnvironment({
      ...currentEnvironment,
      events: currentEnvironment.events.map((entry) => (entry.id === eventId ? updatedEvent : entry)),
    });
    pushToast({
      title: "SOAR playbook çalıştırıldı",
      description: action ? `${action} aksiyonu uygulandı.` : "Önerilen playbook aksiyonları yürütüldü.",
      tone: "success",
    });
    pushNotification({
      title: "SOAR playbook tamamlandı",
      description: action ? `${action} aksiyonu ${event.title} olayı için yürütüldü.` : `${event.title} için playbook çalıştırıldı.`,
      type: "playbook_completed",
      severity: event.severity,
      module: "Events",
      actionHref: "/events",
    });
    pushAuditLog({
      action: "playbook_executed",
      module: "Events",
      target: event.title,
      severity: event.severity === "critical" ? "critical" : event.severity === "high" ? "high" : "info",
      result: "success",
      details: action ? `${action} aksiyonu uygulandı.` : "Önerilen playbook yürütüldü.",
    });
  },

  async triggerDeception(deceptionAssetId, identityId) {
    setOperationLoading("deception", true);

    try {
      const resolvedDeception =
        currentEnvironment.deceptions.find((entry) => entry.id === deceptionAssetId) ??
        currentEnvironment.deceptions.find((entry) => entry.name === "legacy-customer-db-shadow") ??
        currentEnvironment.deceptions.find((entry) => entry.name === "admin-secrets-bucket") ??
        currentEnvironment.deceptions[0];
      const resolvedIdentity =
        currentEnvironment.identities.find((entry) => entry.id === identityId) ??
        currentEnvironment.identities.find((entry) => entry.name === "legacy-api-token") ??
        currentEnvironment.identities.find((entry) => entry.status === "suspicious") ??
        currentEnvironment.identities[0];

      if (resolvedDeception) {
        await simulateDeceptionAccessApi(resolvedDeception.id, {
          identityProfileId: resolvedIdentity?.id,
        });
        await hydrateEnvironmentFromApi({ silent: true });
        pushToast({
          title: "Kritik deception alarmı tetiklendi",
          description: `${resolvedDeception.name} için güvenli deception akışı tamamlandı.`,
          tone: "deception",
        });
        return;
      }
    } catch {
      // API unavailable, continue with local fallback.
    } finally {
      setOperationLoading("deception", false);
    }

    const deception =
      currentEnvironment.deceptions.find((entry) => entry.id === deceptionAssetId) ??
      currentEnvironment.deceptions.find((entry) => entry.name === "admin-secrets-bucket");
    const identity =
      currentEnvironment.identities.find((entry) => entry.id === identityId) ??
      currentEnvironment.identities.find((entry) => entry.name === "finance-batch-svc");

    if (!deception || !identity) return;

    const incident = triggerDeceptionAccess(deception, identity);
    const run: SimulationRunResult = {
      id: makeId("run"),
      scenarioId: "sim-4",
      summary: incident.recommendation.summary,
      createdAt: incident.updatedDeception.lastTriggeredAt ?? new Date().toISOString(),
      generatedEventIds: [incident.event.id],
      affectedModules: ["Dashboard", "Events", "Deception", "Reports", "Compliance"],
    };

    setEnvironment(
      {
        ...currentEnvironment,
        events: [incident.event, ...currentEnvironment.events],
        identities: currentEnvironment.identities.map((entry) =>
          entry.id === incident.updatedIdentity.id ? incident.updatedIdentity : entry,
        ),
        deceptions: currentEnvironment.deceptions.map((entry) =>
          entry.id === incident.updatedDeception.id ? incident.updatedDeception : entry,
        ),
        runs: [run, ...currentEnvironment.runs],
      },
      { lastSimulationResult: run },
    );

    pushToast({
      title: "Kritik deception alarmı tetiklendi",
      description: incident.recommendation.summary,
      tone: "deception",
    });
    pushNotification({
      title: "Kritik deception alarmı",
      description: incident.recommendation.summary,
      type: "deception_alarm",
      severity: "critical",
      module: "Deception",
      actionHref: "/deception",
    });
    pushAuditLog({
      action: "deception_triggered",
      module: "Deception",
      target: incident.updatedDeception.name,
      severity: "critical",
      result: "success",
      details: `${incident.updatedIdentity.name} deception varlığına erişti.`,
    });
  },

  async calculateAssetRisk(assetId) {
    setOperationLoading("assetRisk", true);

    try {
      const asset = await recalculateAssetRiskApi(assetId);
      const synced = await hydrateEnvironmentFromApi({ silent: true });

      if (!synced) {
        setEnvironment(
          {
            ...currentEnvironment,
            assets: currentEnvironment.assets.map((entry) => (entry.id === assetId ? asset : entry)),
          },
          undefined,
          "direct",
        );
      }

      pushToast({
        title: "Risk analizi tamamlandı",
        description: `${asset.name} için risk skoru yeniden hesaplandı.`,
        tone: "info",
      });
      return;
    } catch {
      // API unavailable, continue with local fallback.
    } finally {
      setOperationLoading("assetRisk", false);
    }

    const asset = currentEnvironment.assets.find((entry) => entry.id === assetId);
    if (!asset) return;
    setEnvironment({
      ...currentEnvironment,
      assets: currentEnvironment.assets.map((entry) =>
        entry.id === assetId ? { ...entry, risk: calculateSingleAssetRisk(entry, currentEnvironment.events) } : entry,
      ),
    });
    pushToast({
      title: "Risk analizi tamamlandı",
      description: `${asset.name} için risk skoru yeniden hesaplandı.`,
      tone: "info",
    });
    pushAuditLog({
      action: "asset_risk_recalculated",
      module: "Data Assets",
      target: asset.name,
      severity: "info",
      result: "success",
      details: "Tekil varlık risk skoru yeniden hesaplandı.",
    });
  },

  async recalculateAllRisks() {
    setOperationLoading("assetRisk", true);

    try {
      const targets = currentEnvironment.assets.filter((asset) => !asset.isDeception);
      await Promise.all(targets.map((asset) => recalculateAssetRiskApi(asset.id)));
      await hydrateEnvironmentFromApi({ silent: true });
      pushToast({
        title: "Tüm risk skorları güncellendi",
        description: "Asset ve kimlik riskleri backend üzerinde tekrar hesaplandı.",
        tone: "success",
      });
      return;
    } catch {
      // API unavailable, continue with local fallback.
    } finally {
      setOperationLoading("assetRisk", false);
    }

    setEnvironment({ ...currentEnvironment });
    pushToast({
      title: "Tüm risk skorları güncellendi",
      description: "Asset ve kimlik riskleri tekrar hesaplandı.",
      tone: "success",
    });
    pushAuditLog({
      action: "asset_risk_recalculated",
      module: "Data Assets",
      target: "all-assets",
      severity: "info",
      result: "success",
      details: "Tüm varlık risk skorları yeniden hesaplandı.",
    });
  },

  async generateReport(type) {
    setOperationLoading("report", true);

    try {
      await generateReportApi(type ? { type } : {});
      await hydrateEnvironmentFromApi({ silent: true });
      pushToast({
        title: "Rapor güncellendi",
        description: type ? `${type} raporu yeniden üretildi.` : "Tüm raporlar yenilendi.",
        tone: "compliance",
      });
      return;
    } catch {
      // API unavailable, continue with local fallback.
    } finally {
      setOperationLoading("report", false);
    }

    const fallbackReportType =
      type &&
      (["general", "critical-data", "zero-trust", "deception", "nist", "privacy", "demo"] as const).includes(
        type as ReportType,
      )
        ? (type as ReportType)
        : null;
    const report = fallbackReportType ? generateReport(fallbackReportType, currentEnvironment) : null;
    const reports = fallbackReportType
      ? [report!, ...currentEnvironment.reports.filter((entry) => entry.type !== fallbackReportType)]
      : generateReports(currentEnvironment);

    setEnvironment({ ...currentEnvironment, reports });
    pushToast({
      title: "Rapor güncellendi",
      description: type ? `${type} raporu yeniden üretildi.` : "Tüm raporlar yenilendi.",
      tone: "compliance",
    });
    pushNotification({
      title: "Rapor hazır",
      description: type ? `${type} raporu güncellendi.` : "Rapor seti yenilendi.",
      type: "report_ready",
      severity: "info",
      module: "Reports",
      actionHref: "/reports",
    });
    pushAuditLog({
      action: "report_generated",
      module: "Reports",
      target: type ?? "all-reports",
      severity: "info",
      result: "success",
      details: type ? `${type} raporu üretildi.` : "Tüm raporlar yeniden üretildi.",
    });
  },

  async updateComplianceScores() {
    setOperationLoading("compliance", true);

    try {
      await recalculateComplianceApi();
      await hydrateEnvironmentFromApi({ silent: true });
      pushToast({
        title: "Uyumluluk skorları yeniden hesaplandı",
        description: "NIST CSF ve KVKK/GDPR görünürlüğü güncellendi.",
        tone: "compliance",
      });
      return;
    } catch {
      // API unavailable, continue with local fallback.
    } finally {
      setOperationLoading("compliance", false);
    }

    setEnvironment({ ...currentEnvironment });
    pushToast({
      title: "Uyumluluk skorları yeniden hesaplandı",
      description: "NIST CSF ve KVKK/GDPR görünürlüğü güncellendi.",
      tone: "compliance",
    });
    pushNotification({
      title: "Uyumluluk skoru değişti",
      description: `NIST CSF skoru ${store.complianceScores.overallScore}% olarak güncellendi.`,
      type: "compliance_changed",
      severity: "info",
      module: "Compliance",
      actionHref: "/compliance",
    });
    pushAuditLog({
      action: "compliance_recalculated",
      module: "Compliance",
      target: "nist-csf",
      severity: "info",
      result: "success",
      details: "Uyumluluk göstergeleri yeniden hesaplandı.",
    });
  },

  resetDemoData() {
    currentMeta = createInitialMeta();
    setEnvironment(createMockEnvironment(), currentMeta);
  },

  seedDemoData() {
    currentMeta = createInitialMeta();
    setEnvironment(createMockEnvironment(), currentMeta);
  },

  setSelectedAsset(assetId) {
    setMeta({ selectedAssetId: assetId });
  },

  setSelectedEvent(eventId) {
    setMeta({ selectedEventId: eventId });
  },

  setSelectedAccessRequest(requestId) {
    setMeta({ selectedAccessRequestId: requestId });
  },

  setSelectedDeceptionAsset(assetId) {
    setMeta({ selectedDeceptionAssetId: assetId });
  },

  togglePolicyRule(ruleId) {
    setEnvironment({
      ...currentEnvironment,
      policyRules: currentEnvironment.policyRules.map((rule) =>
        rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule,
      ),
    });
  },

  addPolicyRule(rule) {
    setEnvironment({
      ...currentEnvironment,
      policyRules: [
        {
          id: makeId("rule"),
          name: rule.name,
          description: rule.description,
          owner: "Manual Policy Draft",
          enabled: true,
          defaultDecision: rule.defaultDecision,
          severity: rule.severity,
          conditions: [rule.condition],
          actions: [rule.action],
        },
        ...currentEnvironment.policyRules,
      ],
    });
    pushToast({
      title: "Yeni politika kuralı eklendi",
      description: `${rule.name} Policy Engine listesine eklendi.`,
      tone: "policy",
    });
  },

  async createDeceptionStorage() {
    setOperationLoading("deception", true);

    try {
      await createDeceptionAssetApi({
        name: `generated-decoy-${currentEnvironment.deceptions.length + 1}`,
        description: "UI üzerinden oluşturulan yeni sahte depolama alanı. Gerçek veri içermez.",
        fakeType: "bucket",
        mappedThreat: "Credential Theft / Reconnaissance",
        severity: "high",
        recommendedResponse: "Erişen kimliği izole et, MFA zorunlu kıl ve olay bileti oluştur.",
        autoActions: ["isolate_identity", "require_mfa", "notify_security_team"],
      });
      await hydrateEnvironmentFromApi({ silent: true });
      pushToast({
        title: "Yeni deception storage oluşturuldu",
        description: "Aktif savunma katmanına yeni bir lure eklendi.",
        tone: "deception",
      });
      return;
    } catch {
      // API unavailable, continue with local fallback.
    } finally {
      setOperationLoading("deception", false);
    }

    setEnvironment({
      ...currentEnvironment,
      deceptions: [
        {
          id: makeId("dec"),
          name: `generated-decoy-${currentEnvironment.deceptions.length + 1}`,
          location: "deception",
          description: "UI üzerinden oluşturulan yeni sahte depolama alanı. Gerçek veri içermez.",
          realData: false,
          containsRealData: false,
          fakeType: "bucket",
          lureScore: 74,
          triggerCount: 0,
          mappedThreat: "APT",
          severity: "critical",
          recommendedResponse: "Erişen kimliği izole et ve olay oluştur.",
          status: "armed",
          autoActions: ["isolate_identity", "notify_security_team"],
        },
        ...currentEnvironment.deceptions,
      ],
    });
    pushToast({
      title: "Yeni deception storage oluşturuldu",
      description: "Aktif savunma katmanına yeni bir lure eklendi.",
      tone: "deception",
    });
    pushAuditLog({
      action: "deception_asset_created",
      module: "Deception",
      target: "generated-decoy",
      severity: "info",
      result: "success",
      details: "Yeni deception varlığı oluşturuldu.",
    });
  },

  startDemoScenario() {
    const fresh = createMockEnvironment();
    setEnvironment(
      {
        ...fresh,
        demoScenario: {
          ...fresh.demoScenario,
          active: true,
          currentStep: 0,
          steps: fresh.demoScenario.steps.map((step, index) => ({
            ...step,
            status: index === 0 ? "active" : "pending",
          })),
        },
      },
      { demoMode: true },
    );
    pushToast({
      title: "Operasyon akışı başlatıldı",
      description: "Adımları Dashboard veya Executive Briefing üzerinden ilerletebilirsin.",
      tone: "info",
    });
  },

  nextDemoStep() {
    const nextStep = Math.min(
      currentEnvironment.demoScenario.currentStep + 1,
      currentEnvironment.demoScenario.steps.length - 1,
    );
    setEnvironment(applyDemoStep(currentEnvironment, nextStep), { demoMode: true });
  },

  previousDemoStep() {
    const target = Math.max(currentEnvironment.demoScenario.currentStep - 1, 0);
    setEnvironment(
      {
        ...currentEnvironment,
        demoScenario: {
          ...currentEnvironment.demoScenario,
          active: true,
          currentStep: target,
          steps: currentEnvironment.demoScenario.steps.map((step, index) => ({
            ...step,
            status: (
              index < target ? "completed" : index === target ? "active" : "pending"
            ) as "pending" | "active" | "completed",
          })),
        },
      },
      { demoMode: true },
    );
  },

  dismissToast(toastId) {
    setMeta({
      toasts: currentMeta.toasts.filter((toast) => toast.id !== toastId),
    });
  },

  async runRiskAnalysis(assetId) {
    if (assetId) {
      await actions.calculateAssetRisk(assetId);
      return;
    }
    await actions.recalculateAllRisks();
  },

  async hydrateAuthSession() {
    if (currentMeta.auth.hydrated) return;

    const persisted = readPersistedAuthMeta();
    const persistedEmail = persisted?.currentUser?.email;

    if (
      ALLOW_LOCAL_AUTH_FALLBACK &&
      persisted?.auth.isAuthenticated &&
      persisted.auth.is2FAVerified &&
      persistedEmail &&
      isCustomDemoAuthAccount(persistedEmail)
    ) {
      setMeta({
        auth: {
          ...persisted.auth,
          hydrated: true,
        },
        currentUser: persisted.currentUser ?? null,
        onboardingCompleted: persisted.onboardingCompleted,
        organization: persisted.organization ?? currentMeta.organization,
        auditLogs: persisted.auditLogs ?? currentMeta.auditLogs,
        notifications: persisted.notifications ?? currentMeta.notifications,
      });
      return;
    }

    try {
      const result = await getCurrentUser();
      applyServerAuthPayload(result);

      if (result.authenticated && result.twoFactorVerified) {
        await hydrateEnvironmentFromApi({ silent: true });
        return;
      }
    } catch {
      // Network or server failure falls back to persisted mock/session state.
    }

    if (!persisted) {
      setMeta({
        auth: {
          ...currentMeta.auth,
          hydrated: true,
        },
      });
      return;
    }

    setMeta({
      auth: {
        ...persisted.auth,
        hydrated: true,
      },
      currentUser: persisted.currentUser ?? null,
      onboardingCompleted: persisted.onboardingCompleted,
      organization: persisted.organization ?? currentMeta.organization,
    });
  },

  async login(email, password) {
    pushAuditLog({
      action: "login_attempt",
      module: "Authentication",
      target: email,
      severity: "info",
      result: "success",
      details: "Kullanıcı giriş denemesi yaptı.",
      actorName: email,
      actorRole: "Anonymous",
      actorId: null,
    });

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email,
          password,
        }),
      });
      const result = await parseAuthApiResponse(response);

      if (result.success && result.data) {
        applyServerAuthPayload(result.data);
        pushToast({
          title: "Kimlik doğrulandı",
          description: "İkinci faktör kodunu doğrulayarak oturumu tamamlayın.",
          tone: "policy",
        });
        pushAuditLog({
          action: "login_success",
          module: "Authentication",
          target: result.data.user?.email ?? email,
          severity: "info",
          result: "success",
          details: "Kullanıcı parolayla doğrulandı, 2FA bekleniyor.",
          actorName: result.data.user?.name ?? email,
          actorRole: result.data.user?.role ?? "Anonymous",
          actorId: result.data.user?.id ?? null,
        });

        return { success: true };
      }

      if (!result.success) {
        pushToast({
          title: "Giriş başarısız",
          description: result.error ?? "E-posta veya parola doğrulanamadı.",
          tone: "warning",
        });
        pushAuditLog({
          action: "login_failed",
          module: "Authentication",
          target: email,
          severity: "warning",
          result: "failure",
          details: result.error ?? "E-posta veya parola doğrulanamadı.",
          actorName: email,
          actorRole: "Anonymous",
          actorId: null,
        });
        return {
          success: false,
          error: result.error ?? "E-posta veya parola hatalı.",
        };
      }
    } catch {
      // Fall back to existing mock flow if the API is unavailable.
    }

    const account =
      ALLOW_LOCAL_AUTH_FALLBACK
        ? getAvailableMockAuthAccounts().find(
            (entry) => entry.email.toLowerCase() === email.trim().toLowerCase() && entry.password === password,
          )
        : null;

    if (!account) {
      pushToast({
        title: "Giriş başarısız",
        description: "E-posta veya parola doğrulanamadı.",
        tone: "warning",
      });
      pushAuditLog({
        action: "login_failed",
        module: "Authentication",
        target: email,
        severity: "warning",
        result: "failure",
        details: "E-posta veya parola doğrulanamadı.",
        actorName: email,
        actorRole: "Anonymous",
        actorId: null,
      });
      return {
        success: false,
        error: "E-posta veya parola hatalı.",
      };
    }

    const now = new Date().toISOString();
    setMeta({
      auth: {
        hydrated: true,
        isAuthenticated: true,
        is2FAVerified: false,
        currentUserId: account.id,
        sessionStartedAt: null,
        lastLoginAt: now,
      },
      currentUser: account,
    });

    pushToast({
      title: "Kimlik doğrulandı",
      description: "İkinci faktör kodunu doğrulayarak oturumu tamamlayın.",
      tone: "policy",
    });
    pushAuditLog({
      action: "login_success",
      module: "Authentication",
      target: account.email,
      severity: "info",
      result: "success",
      details: "Kullanıcı parolayla doğrulandı, 2FA bekleniyor.",
      actorName: account.name,
      actorRole: account.role,
      actorId: account.id,
    });

    return {
      success: true,
      redirectTo: currentMeta.onboardingCompleted ? "/dashboard" : "/onboarding",
    };
  },

  async register(payload) {
    try {
      const result = await registerAccount(payload);

      applyServerAuthPayload(result);
      pushToast({
        title: "Hesap oluşturuldu",
        description: "İkinci faktör doğrulamasıyla oturumunu güvenli şekilde tamamlayabilirsin.",
        tone: "success",
      });

      pushAuditLog({
        action: "registration_completed",
        module: "Authentication",
        target: result.user?.email ?? payload.email,
        severity: "info",
        result: "success",
        details: "Yeni hesap ve çalışma alanı oluşturuldu.",
        actorName: result.user?.name ?? payload.fullName,
        actorRole: result.user?.role ?? "Security Admin",
        actorId: result.user?.id ?? null,
      });

      return {
        success: true,
        message: "Kayıt başarıyla tamamlandı. Devam etmek için 2FA doğrulamasını tamamla.",
      };
    } catch (error) {
      const message = resolveApiErrorMessage(error, "Kayıt oluşturulamadı.");

      if (!ALLOW_LOCAL_AUTH_FALLBACK) {
        return {
          success: false,
          error: message,
        };
      }

      return {
        success: false,
        error: message,
      };
    }
  },

  async requestPasswordReset(email) {
    try {
      const result = await requestPasswordResetApi(email);
      const message =
        result.message ?? "Eğer bu e-posta ile bir hesap varsa şifre sıfırlama bağlantısı gönderilecektir.";

      pushToast({
        title: "Şifre sıfırlama isteği alındı",
        description: message,
        tone: "info",
      });

      return {
        success: true,
        message,
      };
    } catch (error) {
      const message = resolveApiErrorMessage(
        error,
        "Şifre sıfırlama isteği şu anda tamamlanamadı.",
      );

      if (ALLOW_LOCAL_AUTH_FALLBACK) {
        const normalizedEmail = email.trim().toLowerCase();
        const knownAccount = getAvailableMockAuthAccounts().some(
          (entry) => entry.email.toLowerCase() === normalizedEmail,
        );

        const fallbackMessage = knownAccount
          ? "Şifre sıfırlama bağlantısı e-posta adresin için hazırlandı."
          : "Eğer bu e-posta ile bir hesap varsa şifre sıfırlama bağlantısı gönderilecektir.";

        pushToast({
          title: "Şifre sıfırlama isteği alındı",
          description: fallbackMessage,
          tone: "info",
        });

        return {
          success: true,
          message: fallbackMessage,
        };
      }

      return {
        success: false,
        error: message,
      };
    }
  },

  async verify2FA(code, method = "totp") {
    if (currentMeta.auth.isAuthenticated) {
      try {
        const response = await fetch("/api/auth/verify-2fa", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ code, method }),
        });
        const result = await parseAuthApiResponse(response);

        if (result.success && result.data) {
          applyServerAuthPayload(result.data);
          pushToast({
            title: "Güvenli oturum açıldı",
            description: "Zero Trust ve aktif savunma konsolu kullanıma hazır.",
            tone: "success",
          });
          await hydrateEnvironmentFromApi({ silent: true });
          pushAuditLog({
            action: "two_factor_verified",
            module: "Authentication",
            target: result.data.user?.email ?? "session",
            severity: "info",
            result: "success",
            details: "2FA doğrulaması tamamlandı.",
          });
          return {
            success: true,
            redirectTo: result.data.onboardingCompleted ? "/dashboard" : "/onboarding",
          };
        }

        if (!result.success) {
          pushToast({
            title: "2FA doğrulanamadı",
            description: result.error ?? "Lütfen 6 haneli doğrulama kodunu kontrol et.",
            tone: "warning",
          });
          pushAuditLog({
            action: "two_factor_failed",
            module: "Authentication",
            target: currentMeta.currentUser?.email ?? "session",
            severity: "warning",
            result: "failure",
            details: result.error ?? "Geçersiz 2FA kodu girildi.",
          });
          return {
            success: false,
            error: result.error ?? "Doğrulama kodu hatalı.",
          };
        }
      } catch {
        // Fall back to existing mock flow if the API is unavailable.
      }
    }

    if (method === "recovery") {
      return {
        success: false,
        error: "Recovery code doğrulaması için sunucu bağlantısı gerekli.",
      };
    }

    const currentUser =
      ALLOW_LOCAL_AUTH_FALLBACK
        ? currentMeta.currentUser ?? mockAuthAccounts.find((entry) => entry.id === currentMeta.auth.currentUserId)
        : currentMeta.currentUser;
    if (!currentUser) {
      return {
        success: false,
        error: "Önce giriş yapmalısın.",
      };
    }

    if (code.trim() !== "123456") {
      pushToast({
        title: "2FA doğrulanamadı",
        description: "Lütfen 6 haneli doğrulama kodunu kontrol et.",
        tone: "warning",
      });
      pushAuditLog({
        action: "two_factor_failed",
        module: "Authentication",
        target: currentUser.email,
        severity: "warning",
        result: "failure",
        details: "Geçersiz 2FA kodu girildi.",
      });
      return {
        success: false,
        error: "Doğrulama kodu hatalı.",
      };
    }

    const now = new Date().toISOString();
    setMeta({
      auth: {
        ...currentMeta.auth,
        hydrated: true,
        isAuthenticated: true,
        is2FAVerified: true,
        sessionStartedAt: now,
        lastLoginAt: now,
      },
      currentUser: {
        ...currentUser,
        lastLoginAt: now,
      },
    });

    pushToast({
      title: "Güvenli oturum açıldı",
      description: "Zero Trust ve aktif savunma konsolu kullanıma hazır.",
      tone: "success",
    });
    pushAuditLog({
      action: "two_factor_verified",
      module: "Authentication",
      target: currentUser.email,
      severity: "info",
      result: "success",
      details: "2FA doğrulaması tamamlandı.",
    });

    return {
      success: true,
    };
  },

  async logout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Keep local logout functional even if the server is unavailable.
    }

    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(AUTH_SESSION_KEY);
    }

    const foundation = buildFoundationEnvironment();
    setMeta({
      auth: {
        hydrated: true,
        isAuthenticated: false,
        is2FAVerified: false,
        currentUserId: null,
        sessionStartedAt: null,
        lastLoginAt: null,
      },
      currentUser: null,
      onboardingCompleted: false,
      isApiMode: false,
      apiError: null,
      lastSyncedAt: null,
      settingsBundle: null,
      auditLogs: [],
      notifications: [],
    });
    setEnvironment(foundation, undefined, "direct");

    pushToast({
      title: "Oturum kapatıldı",
      description: "Güvenli oturum sonlandırıldı.",
      tone: "info",
    });
    pushAuditLog({
      action: "logout",
      module: "Authentication",
      target: "session",
      severity: "info",
      result: "success",
      details: "Kullanıcı oturumu kapatıldı.",
    });
  },

  async hydrateFromApi() {
    await hydrateEnvironmentFromApi();
  },

  async refreshDashboard() {
    setOperationLoading("dashboard", true);
    try {
      await hydrateEnvironmentFromApi({ silent: true });
    } finally {
      setOperationLoading("dashboard", false);
    }
  },

  async refreshAssets() {
    setOperationLoading("assets", true);
    try {
      await hydrateEnvironmentFromApi({ silent: true });
    } finally {
      setOperationLoading("assets", false);
    }
  },

  async refreshEvents() {
    setOperationLoading("events", true);
    try {
      await hydrateEnvironmentFromApi({ silent: true });
    } finally {
      setOperationLoading("events", false);
    }
  },

  async refreshDeception() {
    setOperationLoading("deception", true);
    try {
      await hydrateEnvironmentFromApi({ silent: true });
    } finally {
      setOperationLoading("deception", false);
    }
  },

  async refreshReports() {
    setOperationLoading("reports", true);
    try {
      await hydrateEnvironmentFromApi({ silent: true });
    } finally {
      setOperationLoading("reports", false);
    }
  },

  async refreshAuditLogs() {
    setOperationLoading("audit", true);
    try {
      await hydrateEnvironmentFromApi({ silent: true });
    } finally {
      setOperationLoading("audit", false);
    }
  },

  async refreshNotifications() {
    setOperationLoading("notifications", true);
    try {
      await hydrateEnvironmentFromApi({ silent: true });
    } finally {
      setOperationLoading("notifications", false);
    }
  },

  async refreshSettings() {
    setOperationLoading("settings", true);
    try {
      await hydrateEnvironmentFromApi({ silent: true });
    } finally {
      setOperationLoading("settings", false);
    }
  },

  async completeOnboarding(payload) {
    const cloudModeMap: Record<OnboardingPayload["cloudMode"], "private_cloud" | "public_cloud" | "hybrid_cloud"> = {
      "Private Cloud": "private_cloud",
      "Public Cloud": "public_cloud",
      "Hybrid Cloud": "hybrid_cloud",
    };

    try {
      const result = await completeOnboardingApi({
        organizationName: payload.organizationName,
        city: payload.city,
        usageType: payload.usageType,
        defaultCurrency: payload.defaultCurrency,
        cloudMode: cloudModeMap[payload.cloudMode],
        complianceFrameworks: payload.complianceFrameworks,
        seedStarterData: payload.seedDemoData,
        runInitialScan: payload.runInitialScan,
      });

      setMeta({
        organization: result.organization,
        onboardingCompleted: result.onboardingCompleted,
      });

      await hydrateEnvironmentFromApi({ silent: true });

      pushToast({
        title: "Kurulum tamamlandı",
        description: "Çalışma alanı kullanıma hazır.",
        tone: "success",
      });

      return true;
    } catch (error) {
      if (!ALLOW_LOCAL_AUTH_FALLBACK) {
        pushToast({
          title: "Kurulum tamamlanamadı",
          description: resolveApiErrorMessage(error, "Onboarding güncellenemedi."),
          tone: "warning",
        });
        return false;
      }
    }

    const nextOrganization: OrganizationProfile = {
      ...currentMeta.organization,
      name: payload.organizationName || currentMeta.organization.name,
      region: payload.city?.trim() || currentMeta.organization.region,
      cloudMode: payload.cloudMode,
      complianceFrameworks: payload.complianceFrameworks,
    };

    const nextEnvironment = payload.seedDemoData ? deriveEnvironment(createMockEnvironment()) : currentEnvironment;

    setEnvironment(
      nextEnvironment,
      {
        organization: nextOrganization,
        onboardingCompleted: true,
      },
    );

    if (payload.runInitialScan) {
      void actions.recalculateAllRisks();
    }

    pushToast({
      title: "Onboarding tamamlandı",
      description: "Organizasyon profili oluşturuldu ve konsol kullanıma hazır.",
      tone: "success",
    });
    pushAuditLog({
      action: "onboarding_completed",
      module: "Onboarding",
      target: nextOrganization.name,
      severity: "info",
      result: "success",
      details: `${payload.cloudMode} kurulumu, ${payload.complianceFrameworks.join(", ")} çerçeveleri ve ${payload.defaultCurrency ?? "TRY"} varsayılan para birimi ile tamamlandı.${payload.usageType ? ` Kullanım tipi: ${payload.usageType}.` : ""}`,
    });

    return true;
  },

  can(permission) {
    return hasPermission(currentMeta.currentUser?.role, permission);
  },

  addAuditLog(payload) {
    pushAuditLog(payload);
  },

  addNotification(payload) {
    pushNotification(payload);
  },

  async markNotificationRead(id) {
    setOperationLoading("notifications", true);

    try {
      await markNotificationReadApi(id);
      await hydrateEnvironmentFromApi({ silent: true });
      return;
    } catch {
      // API unavailable, continue with local fallback.
    } finally {
      setOperationLoading("notifications", false);
    }

    setMeta({
      notifications: currentMeta.notifications.map((item) => (item.id === id ? { ...item, read: true } : item)),
    });
  },

  async markAllNotificationsRead() {
    setOperationLoading("notifications", true);

    try {
      await markAllNotificationsReadApi();
      await hydrateEnvironmentFromApi({ silent: true });
      pushToast({
        title: "Bildirimler güncellendi",
        description: "Tüm bildirimler okundu olarak işaretlendi.",
        tone: "info",
      });
      return;
    } catch {
      // API unavailable, continue with local fallback.
    } finally {
      setOperationLoading("notifications", false);
    }

    setMeta({
      notifications: currentMeta.notifications.map((item) => ({ ...item, read: true })),
    });
  },

  async clearNotifications() {
    await actions.markAllNotificationsRead();
  },

  async simulateDeceptionAccess(deceptionAssetId, payload) {
    setOperationLoading("deception", true);

    try {
      await simulateDeceptionAccessApi(deceptionAssetId, payload);
      await hydrateEnvironmentFromApi({ silent: true });
      pushToast({
        title: "Deception erişimi işlendi",
        description: "Kritik event, audit ve bildirim akışı güncellendi.",
        tone: "deception",
      });
      return;
    } catch (error) {
      pushToast({
        title: "Deception işlemi başarısız",
        description: resolveApiErrorMessage(error, "Deception akışı tamamlanamadı."),
        tone: "warning",
      });
    } finally {
      setOperationLoading("deception", false);
    }
  },

  async runExecutiveDemo() {
    setOperationLoading("simulation", true);

    try {
      const result = await runExecutiveDemoApi();
      await hydrateEnvironmentFromApi({ silent: true });
      setMeta({
        demoMode: true,
        lastSimulationResult: result.run ?? currentMeta.lastSimulationResult,
      });
      pushToast({
        title: "Guided run tamamlandı",
        description: result.run?.summary ?? "Backend engine akışı başarıyla tamamlandı.",
        tone: "success",
      });
      return;
    } catch (error) {
      pushToast({
        title: "Guided run başlatılamadı",
        description: resolveApiErrorMessage(error, "Guided run çalıştırılamadı."),
        tone: "warning",
      });
    } finally {
      setOperationLoading("simulation", false);
    }
  },

  async recalculateCompliance() {
    await actions.updateComplianceScores();
  },

  async recalculateAssetRisk(assetId) {
    await actions.calculateAssetRisk(assetId);
  },

  async updateIdentityStatus(identityId, status) {
    setOperationLoading("identity", true);

    try {
      await updateIdentityStatusApi(identityId, status);
      await hydrateEnvironmentFromApi({ silent: true });
      pushToast({
        title: "Identity durumu güncellendi",
        description: `${identityId} için durum ${status} olarak kaydedildi.`,
        tone: status === "isolated" ? "critical" : "info",
      });
      return;
    } catch (error) {
      pushToast({
        title: "Identity güncellenemedi",
        description: resolveApiErrorMessage(error, "Identity durumu güncellenemedi."),
        tone: "warning",
      });
    } finally {
      setOperationLoading("identity", false);
    }
  },

  async updateRiskPolicy(payload) {
    setOperationLoading("settings", true);

    try {
      await updateRiskPolicyApi(payload);
      await hydrateEnvironmentFromApi({ silent: true });
      pushToast({
        title: "Risk policy güncellendi",
        description: "Backend risk policy ayarları kaydedildi.",
        tone: "success",
      });
    } catch (error) {
      pushToast({
        title: "Risk policy kaydedilemedi",
        description: resolveApiErrorMessage(error, "Risk policy güncellenemedi."),
        tone: "warning",
      });
      return;
    } finally {
      setOperationLoading("settings", false);
    }
  },

  async updateReportBranding(payload) {
    setOperationLoading("settings", true);

    try {
      await updateReportBrandingApi(payload);
      await hydrateEnvironmentFromApi({ silent: true });
      pushToast({
        title: "Report branding güncellendi",
        description: "Rapor görünüm ayarları kaydedildi.",
        tone: "success",
      });
    } catch (error) {
      pushToast({
        title: "Report branding kaydedilemedi",
        description: resolveApiErrorMessage(error, "Report branding güncellenemedi."),
        tone: "warning",
      });
      return;
    } finally {
      setOperationLoading("settings", false);
    }
  },

  async updateOrganizationSettings(payload) {
    setOperationLoading("settings", true);

    try {
      await updateOrganizationSettingsApi(payload);
      await hydrateEnvironmentFromApi({ silent: true });
      pushToast({
        title: "Organizasyon ayarları güncellendi",
        description: "Plan, bölge ve uyumluluk çerçeveleri kaydedildi.",
        tone: "success",
      });
    } catch (error) {
      pushToast({
        title: "Organizasyon ayarları kaydedilemedi",
        description: resolveApiErrorMessage(error, "Organizasyon ayarları güncellenemedi."),
        tone: "warning",
      });
      return;
    } finally {
      setOperationLoading("settings", false);
    }
  },
};

let store: SecurityConsoleStore = {
  ...buildSnapshot(currentEnvironment, currentMeta),
  ...actions,
};

const identitySelector = <T,>(state: T) => state;

function useSecurityConsoleStoreBase<T = SecurityConsoleStore>(
  selector: (state: SecurityConsoleStore) => T = identitySelector as (state: SecurityConsoleStore) => T,
) {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => store,
    () => store,
  );

  return selector(snapshot);
}

type SecurityConsoleStoreHook = {
  <T = SecurityConsoleStore>(selector?: (state: SecurityConsoleStore) => T): T;
  getState: () => SecurityConsoleStore;
  subscribe: typeof subscribe;
};

export const useSecurityConsoleStore = Object.assign(useSecurityConsoleStoreBase, {
  getState: () => store,
  subscribe,
}) as SecurityConsoleStoreHook;
