import type {
  EventSeverity,
  SecurityTestEnvironment,
  SecurityTestProvider as SecurityTestProviderName,
  SecurityTestRunStatus,
  SecurityTestScanMode,
  SecurityTestTargetType,
} from "@prisma/client";

export type SecurityTestProviderFinding = {
  externalId: string;
  title: string;
  severity: EventSeverity;
  category: string;
  description: string;
  evidence: string[];
  remediation: string;
  affectedResource: string;
  cvssScore?: number | null;
  pocAvailable: boolean;
  isSynthetic: boolean;
  metadata?: Record<string, unknown>;
};

export type SecurityTestLaunchInput = {
  runId: string;
  target: {
    id: string;
    name: string;
    target: string;
    targetType: SecurityTestTargetType;
    environment: SecurityTestEnvironment;
    scope: string[];
    exclusions: string[];
  };
  scanMode: SecurityTestScanMode;
  instructions?: string | null;
  maxBudgetUsd?: number | null;
  maxTurns: number;
};

export type SecurityTestLaunchResult = {
  externalRunId: string;
  status: Extract<SecurityTestRunStatus, "queued" | "running" | "completed">;
  summary: string;
  findings: SecurityTestProviderFinding[];
  costUsd?: number | null;
  metadata?: Record<string, unknown>;
};

export type SecurityTestReconcileResult = Omit<SecurityTestLaunchResult, "status"> & {
  status: Extract<SecurityTestRunStatus, "queued" | "running" | "completed" | "failed" | "cancelled">;
};

export type SecurityTestProviderRuntime = {
  mode: SecurityTestProviderName;
  ready: boolean;
  label: string;
  description: string;
  attribution: string;
  launch(input: SecurityTestLaunchInput): Promise<SecurityTestLaunchResult>;
  reconcile?(externalRunId: string): Promise<SecurityTestReconcileResult>;
};
