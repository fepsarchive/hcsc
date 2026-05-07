"use client";

import { useSyncExternalStore } from "react";

import { mockAuthAccounts, mockOrganization } from "@/lib/auth-mock-data";
import { calculateComplianceSnapshot } from "@/lib/compliance-engine";
import { triggerDeceptionAccess } from "@/lib/deception-engine";
import {
  createSecurityEvent,
  executePlaybook,
  runSoarPlaybook,
  updateEventStatus as updateSecurityEventStatus,
} from "@/lib/event-engine";
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
  DemoEnvironment,
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
};

type CreateAuditLogPayload = Omit<AuditLogItem, "id" | "timestamp" | "ipAddress" | "device" | "actorId" | "actorName" | "actorRole"> & {
  actorId?: string | null;
  actorName?: string;
  actorRole?: string;
};

type CreateNotificationPayload = Omit<NotificationItem, "id" | "createdAt" | "read">;

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
  runSimulation: (scenarioId: string) => void;
  evaluateAccessRequest: (requestId: string) => void;
  createAccessRequest: (payload: CreateAccessRequestPayload) => void;
  updateAccessRequestDecision: (requestId: string, decision: AccessRequest["evaluation"]["decision"]) => void;
  createEvent: (payload: CreateEventPayload) => SecurityEvent;
  updateEventStatus: (eventId: string, status: SecurityEvent["status"]) => void;
  runPlaybook: (eventId: string, action?: SoarAction) => void;
  triggerDeception: (deceptionAssetId?: string, identityId?: string) => void;
  calculateAssetRisk: (assetId: string) => void;
  recalculateAllRisks: () => void;
  generateReport: (type?: ReportType) => void;
  updateComplianceScores: () => void;
  resetDemoData: () => void;
  seedDemoData: () => void;
  setSelectedAsset: (assetId: string | null) => void;
  setSelectedEvent: (eventId: string | null) => void;
  setSelectedAccessRequest: (requestId: string | null) => void;
  setSelectedDeceptionAsset: (assetId: string | null) => void;
  togglePolicyRule: (ruleId: string) => void;
  addPolicyRule: (rule: NewPolicyInput) => void;
  createDeceptionStorage: () => void;
  startDemoScenario: () => void;
  nextDemoStep: () => void;
  previousDemoStep: () => void;
  dismissToast: (toastId: string) => void;
  runRiskAnalysis: (assetId?: string) => void;
  hydrateAuthSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<AuthActionResult>;
  verify2FA: (code: string) => Promise<AuthActionResult>;
  logout: () => Promise<void>;
  completeOnboarding: (payload: OnboardingPayload) => void;
  can: (permission: Permission) => boolean;
  addAuditLog: (payload: CreateAuditLogPayload) => void;
  addNotification: (payload: CreateNotificationPayload) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
};

const AUTH_SESSION_KEY = "hcsc-auth-session";

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
  | "verify2FA"
  | "logout"
  | "completeOnboarding"
  | "can"
  | "addAuditLog"
  | "addNotification"
  | "markNotificationRead"
  | "clearNotifications"
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
  };
}

let currentEnvironment = deriveEnvironment(createMockEnvironment());
let currentMeta = createInitialMeta();

function setEnvironment(nextEnvironment: MutableEnvironment, metaPatch?: Partial<StoreMeta>) {
  currentEnvironment = deriveEnvironment(nextEnvironment);
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
        device: "Managed macOS / Demo Browser",
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
      title: "Demo: Zero Trust karar olayı",
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
  | "verify2FA"
  | "logout"
  | "completeOnboarding"
  | "can"
  | "addAuditLog"
  | "addNotification"
  | "markNotificationRead"
  | "clearNotifications"
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
          title: "Simülasyon: MFA olmadan kritik erişim",
          category: "policy_violation",
          description: "Kritik veri için MFA eksik erişim talebi simüle edildi.",
          recommendation: "Talep deny veya step-up ile sınırlandırılmalı.",
          severity: "high",
          source: "Simulation Center",
          target: "customer-db",
          relatedControl: "Zero Trust + MFA",
        });
        break;
      case "sim-2":
        addEvent({
          title: "Simülasyon: mesai dışı export",
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
          title: "Simülasyon: şifrelenmemiş hassas veri",
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
          title: "Simülasyon: üçüncü taraf API anomali",
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
          title: "Simülasyon: ransomware indicator",
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
          title: "Simülasyon: iç kullanıcı yetki aşımı",
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
          title: "Simülasyon: unrestricted resource consumption",
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
          title: "Simülasyon: loglama kapalı kaynak",
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
          title: "Simülasyon: KVKK yurt dışı aktarım riski",
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
      summary: `${next.simulations.find((simulation) => simulation.id === scenarioId)?.title ?? "Simülasyon"} senaryosu çalıştırıldı.`,
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
      title: "Simülasyon tamamlandı",
      description: "İlgili olaylar, risk skorları ve raporlar güncellendi.",
      tone: "success",
    });
    pushNotification({
      title: "Simülasyon tamamlandı",
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

  evaluateAccessRequest(requestId) {
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

  createAccessRequest(payload) {
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

  updateEventStatus(eventId, status) {
    setEnvironment({
      ...currentEnvironment,
      events: currentEnvironment.events.map((event) =>
        event.id === eventId ? updateSecurityEventStatus(event, status) : event,
      ),
    });
  },

  runPlaybook(eventId, action) {
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

  triggerDeception(deceptionAssetId, identityId) {
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

  calculateAssetRisk(assetId) {
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

  recalculateAllRisks() {
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

  generateReport(type) {
    const report = type ? generateReport(type, currentEnvironment) : null;
    const reports = type
      ? [report!, ...currentEnvironment.reports.filter((entry) => entry.type !== type)]
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

  updateComplianceScores() {
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
      title: "Yeni mock kural eklendi",
      description: `${rule.name} Policy Engine listesine eklendi.`,
      tone: "policy",
    });
  },

  createDeceptionStorage() {
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
      title: "Demo senaryosu başlatıldı",
      description: "Adımları Dashboard veya Presentation Mode üzerinden ilerletebilirsin.",
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

  runRiskAnalysis(assetId) {
    if (assetId) {
      actions.calculateAssetRisk(assetId);
      return;
    }
    actions.recalculateAllRisks();
  },

  async hydrateAuthSession() {
    if (currentMeta.auth.hydrated) return;

    try {
      const response = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });
      const result = await parseAuthApiResponse(response);

      if (result.success) {
        applyServerAuthPayload(result.data);
        return;
      }
    } catch {
      // Network or server failure falls back to persisted mock/session state.
    }

    const persisted = readPersistedAuthMeta();

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

    const account = mockAuthAccounts.find(
      (entry) => entry.email.toLowerCase() === email.trim().toLowerCase() && entry.password === password,
    );

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
    };
  },

  async verify2FA(code) {
    if (currentMeta.auth.isAuthenticated) {
      try {
        const response = await fetch("/api/auth/verify-2fa", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ code }),
        });
        const result = await parseAuthApiResponse(response);

        if (result.success && result.data) {
          applyServerAuthPayload(result.data);
          pushToast({
            title: "Güvenli oturum açıldı",
            description: "Zero Trust ve aktif savunma konsolu kullanıma hazır.",
            tone: "success",
          });
          pushAuditLog({
            action: "two_factor_verified",
            module: "Authentication",
            target: result.data.user?.email ?? "session",
            severity: "info",
            result: "success",
            details: "2FA doğrulaması tamamlandı.",
          });
          return { success: true };
        }

        if (!result.success) {
          pushToast({
            title: "2FA doğrulanamadı",
            description: result.error ?? "Demo kodu 123456 ile eşleşen 6 haneli kod bekleniyor.",
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

    const currentUser = currentMeta.currentUser ?? mockAuthAccounts.find((entry) => entry.id === currentMeta.auth.currentUserId);
    if (!currentUser) {
      return {
        success: false,
        error: "Önce giriş yapmalısın.",
      };
    }

    if (code.trim() !== "123456") {
      pushToast({
        title: "2FA doğrulanamadı",
        description: "Demo kodu 123456 ile eşleşen 6 haneli kod bekleniyor.",
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
    });

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

  completeOnboarding(payload) {
    const nextOrganization: OrganizationProfile = {
      ...currentMeta.organization,
      name: payload.organizationName || currentMeta.organization.name,
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
      actions.recalculateAllRisks();
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
      details: `${payload.cloudMode} kurulumu ve ${payload.complianceFrameworks.join(", ")} çerçeveleri etkinleştirildi.`,
    });
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

  markNotificationRead(id) {
    setMeta({
      notifications: currentMeta.notifications.map((item) => (item.id === id ? { ...item, read: true } : item)),
    });
  },

  clearNotifications() {
    setMeta({ notifications: [] });
  },
};

let store: SecurityConsoleStore = {
  ...buildSnapshot(currentEnvironment, currentMeta),
  ...actions,
};

function useSecurityConsoleStoreBase<T = SecurityConsoleStore>(
  selector: (state: SecurityConsoleStore) => T = (state) => state as unknown as T,
) {
  return useSyncExternalStore(
    subscribe,
    () => selector(store),
    () => selector(store),
  );
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
