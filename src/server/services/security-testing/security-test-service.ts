import "server-only";

import type {
  Prisma,
  SecurityTestEnvironment,
  SecurityTestFindingStatus,
  SecurityTestRunStatus,
  SecurityTestScanMode,
  SecurityTestTargetType,
} from "@prisma/client";

import {
  getEffectiveSecurityTestAuthorizationStatus,
  isSecurityTestRunTransitionAllowed,
  isSecurityTestAuthorizationActive,
} from "@/lib/security-test-policy";
import { prisma } from "@/server/db/prisma";
import { createSecurityEvent, updateSecurityEventStatus } from "@/server/security/security-event-service";
import { createAuditLog } from "@/server/services/audit/audit-log-service";
import { notifyOrganizationMembers } from "@/server/services/notifications/notification-service";
import { getSecurityTestProvider } from "@/server/services/security-testing/providers/provider-registry";

type SecurityTestActor = {
  userId: string;
  name: string;
  role: string;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export class SecurityTestServiceError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "SecurityTestServiceError";
  }
}

function stringArray(value: Prisma.JsonValue | null | undefined) {
  return Array.isArray(value) ? value.map(String) : [];
}

function jsonObject(value: Prisma.JsonValue | null | undefined) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function mapAuthorization(authorization: {
  id: string;
  reference: string;
  status: "active" | "expired" | "revoked";
  startsAt: Date;
  expiresAt: Date;
  scope: Prisma.JsonValue;
  exclusions: Prisma.JsonValue;
  notes: string | null;
}) {
  return {
    ...authorization,
    status: getEffectiveSecurityTestAuthorizationStatus(authorization),
    startsAt: authorization.startsAt.toISOString(),
    expiresAt: authorization.expiresAt.toISOString(),
    scope: stringArray(authorization.scope),
    exclusions: stringArray(authorization.exclusions),
  };
}

function mapFinding(finding: {
  id: string;
  externalId: string | null;
  securityEventId: string | null;
  title: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
  status: SecurityTestFindingStatus;
  category: string;
  description: string;
  evidence: Prisma.JsonValue;
  remediation: string;
  affectedResource: string;
  cvssScore: number | null;
  pocAvailable: boolean;
  isSynthetic: boolean;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...finding,
    evidence: stringArray(finding.evidence),
    createdAt: finding.createdAt.toISOString(),
    updatedAt: finding.updatedAt.toISOString(),
  };
}

function mapTarget(target: {
  id: string;
  name: string;
  targetType: SecurityTestTargetType;
  target: string;
  environment: SecurityTestEnvironment;
  description: string | null;
  authorizationStatus: "active" | "expired" | "revoked";
  scope: Prisma.JsonValue;
  exclusions: Prisma.JsonValue;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  authorizations: Array<{
    id: string;
    reference: string;
    status: "active" | "expired" | "revoked";
    startsAt: Date;
    expiresAt: Date;
    scope: Prisma.JsonValue;
    exclusions: Prisma.JsonValue;
    notes: string | null;
  }>;
}) {
  const authorization = target.authorizations[0] ? mapAuthorization(target.authorizations[0]) : null;
  return {
    ...target,
    authorizationStatus: authorization?.status ?? target.authorizationStatus,
    scope: stringArray(target.scope),
    exclusions: stringArray(target.exclusions),
    authorization,
    authorizations: undefined,
    createdAt: target.createdAt.toISOString(),
    updatedAt: target.updatedAt.toISOString(),
  };
}

function mapRun(run: {
  id: string;
  provider: "demo" | "self_hosted" | "managed";
  scanMode: SecurityTestScanMode;
  status: "queued" | "running" | "completed" | "failed" | "cancelled" | "blocked";
  externalRunId: string | null;
  instructions: string | null;
  maxBudgetUsd: number | null;
  maxTurns: number;
  summary: string | null;
  findingCount: number;
  criticalCount: number;
  highCount: number;
  costUsd: number | null;
  errorMessage: string | null;
  metadata: Prisma.JsonValue | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  target: {
    id: string;
    name: string;
    target: string;
    targetType: SecurityTestTargetType;
    environment: SecurityTestEnvironment;
  };
  findings: Parameters<typeof mapFinding>[0][];
}) {
  return {
    ...run,
    findings: run.findings.map(mapFinding),
    startedAt: run.startedAt?.toISOString() ?? null,
    finishedAt: run.finishedAt?.toISOString() ?? null,
    createdAt: run.createdAt.toISOString(),
    updatedAt: run.updatedAt.toISOString(),
  };
}

const targetInclude = {
  authorizations: {
    orderBy: { createdAt: "desc" as const },
    take: 1,
    select: {
      id: true,
      reference: true,
      status: true,
      startsAt: true,
      expiresAt: true,
      scope: true,
      exclusions: true,
      notes: true,
    },
  },
} satisfies Prisma.SecurityTestTargetInclude;

const runInclude = {
  target: {
    select: {
      id: true,
      name: true,
      target: true,
      targetType: true,
      environment: true,
    },
  },
  findings: {
    orderBy: [{ severity: "desc" as const }, { createdAt: "desc" as const }],
  },
} satisfies Prisma.SecurityTestRunInclude;

type SecurityTestFindingWithEventFields = Parameters<typeof mapFinding>[0];

async function linkHighRiskSecurityTestFindings(input: {
  organizationId: string;
  actorUserId: string | null;
  provider: "demo" | "self_hosted" | "managed";
  runId: string;
  targetId: string;
  findings: SecurityTestFindingWithEventFields[];
}) {
  for (const finding of input.findings) {
    if (finding.securityEventId || (finding.severity !== "critical" && finding.severity !== "high")) continue;

    const event = await createSecurityEvent({
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      actorEmail: null,
      source: "Adversary Validation",
      category: "security_test_finding",
      type: "SECURITY_TEST_FINDING",
      title: finding.title,
      description: finding.description,
      severity: finding.severity,
      target: finding.affectedResource,
      targetType: "security_test_target",
      targetId: input.targetId,
      evidence: finding.evidence,
      recommendation: finding.remediation,
      metadata: {
        runId: input.runId,
        findingId: finding.id,
        provider: input.provider,
        synthetic: finding.isSynthetic,
      },
    });
    await prisma.securityTestFinding.update({
      where: { id: finding.id },
      data: { securityEventId: event.id },
    });
  }
}

export async function getSecurityTestOverview(organizationId: string) {
  const provider = getSecurityTestProvider();
  const [targets, runs] = await Promise.all([
    prisma.securityTestTarget.findMany({
      where: { organizationId },
      include: targetInclude,
      orderBy: [{ createdAt: "desc" }],
    }),
    prisma.securityTestRun.findMany({
      where: { organizationId },
      include: runInclude,
      orderBy: [{ createdAt: "desc" }],
      take: 30,
    }),
  ]);

  const mappedTargets = targets.map(mapTarget);
  const mappedRuns = runs.map(mapRun);
  const findings = mappedRuns.flatMap((run) => run.findings);

  return {
    provider: {
      mode: provider.mode,
      ready: provider.ready,
      label: provider.label,
      description: provider.description,
      attribution: provider.attribution,
      liveExecution: provider.mode !== "demo" && provider.ready,
      productionTargetsAllowed: process.env.HCSC_SECURITY_TEST_ALLOW_PRODUCTION === "true",
    },
    metrics: {
      authorizedTargets: mappedTargets.filter((target) => target.authorizationStatus === "active" && target.isEnabled).length,
      totalRuns: mappedRuns.length,
      activeRuns: mappedRuns.filter((run) => run.status === "queued" || run.status === "running").length,
      openFindings: findings.filter((finding) => finding.status === "open" || finding.status === "investigating").length,
      criticalFindings: findings.filter((finding) => finding.severity === "critical").length,
      highFindings: findings.filter((finding) => finding.severity === "high").length,
    },
    targets: mappedTargets,
    runs: mappedRuns,
  };
}

export async function createSecurityTestTarget(input: {
  organizationId: string;
  name: string;
  targetType: SecurityTestTargetType;
  target: string;
  environment: SecurityTestEnvironment;
  description?: string | null;
  scope: string[];
  exclusions: string[];
  authorizationReference: string;
  authorizationExpiresAt: Date;
  authorizationNotes?: string | null;
  actor: SecurityTestActor;
}) {
  const existing = await prisma.securityTestTarget.findFirst({
    where: { organizationId: input.organizationId, target: input.target },
    select: { id: true },
  });
  if (existing) {
    throw new SecurityTestServiceError("Bu hedef çalışma alanında zaten kayıtlı.", "TARGET_EXISTS", 409);
  }

  const target = await prisma.$transaction(async (tx) => {
    const created = await tx.securityTestTarget.create({
      data: {
        organizationId: input.organizationId,
        ownerUserId: input.actor.userId,
        name: input.name,
        targetType: input.targetType,
        target: input.target,
        environment: input.environment,
        description: input.description ?? null,
        authorizationStatus: "active",
        scope: input.scope,
        exclusions: input.exclusions,
        isEnabled: true,
      },
    });

    await tx.securityTestAuthorization.create({
      data: {
        organizationId: input.organizationId,
        targetId: created.id,
        grantedByUserId: input.actor.userId,
        reference: input.authorizationReference,
        scope: input.scope,
        exclusions: input.exclusions,
        status: "active",
        expiresAt: input.authorizationExpiresAt,
        notes: input.authorizationNotes ?? null,
      },
    });

    return tx.securityTestTarget.findUniqueOrThrow({
      where: { id: created.id },
      include: targetInclude,
    });
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.actor.userId,
    actorName: input.actor.name,
    actorRole: input.actor.role,
    action: "security_test_target_created",
    module: "Adversary Validation",
    target: input.target,
    severity: "info",
    result: "success",
    details: `${input.name} hedefi yetkilendirme kaydıyla oluşturuldu.`,
    ipAddress: input.actor.ipAddress,
    device: input.actor.userAgent,
    metadata: {
      targetId: target.id,
      environment: input.environment,
      authorizationReference: input.authorizationReference,
    },
  });

  return mapTarget(target);
}

export async function launchSecurityTestRun(input: {
  organizationId: string;
  targetId: string;
  scanMode: SecurityTestScanMode;
  instructions?: string | null;
  maxBudgetUsd?: number | null;
  maxTurns: number;
  explicitAuthorizationConfirmed: boolean;
  actor: SecurityTestActor;
}) {
  if (!input.explicitAuthorizationConfirmed) {
    throw new SecurityTestServiceError(
      "Açık hedef yetkilendirmesi onaylanmadan tarama başlatılamaz.",
      "AUTHORIZATION_CONFIRMATION_REQUIRED",
      400,
    );
  }

  const target = await prisma.securityTestTarget.findFirst({
    where: { id: input.targetId, organizationId: input.organizationId },
    include: targetInclude,
  });
  if (!target) throw new SecurityTestServiceError("Güvenlik testi hedefi bulunamadı.", "TARGET_NOT_FOUND", 404);
  if (!target.isEnabled) throw new SecurityTestServiceError("Bu hedef devre dışı.", "TARGET_DISABLED", 409);

  const authorization = target.authorizations[0];
  if (!isSecurityTestAuthorizationActive(authorization)) {
    throw new SecurityTestServiceError("Hedefin aktif ve süresi geçerli bir yetkilendirmesi yok.", "AUTHORIZATION_EXPIRED", 409);
  }
  if (target.environment === "production" && process.env.HCSC_SECURITY_TEST_ALLOW_PRODUCTION !== "true") {
    throw new SecurityTestServiceError(
      "Production hedefleri bu ortamda kapalı. Önce ayrı production izni tanımlanmalı.",
      "PRODUCTION_TARGET_BLOCKED",
      403,
    );
  }

  const provider = getSecurityTestProvider();
  if (!provider.ready) {
    throw new SecurityTestServiceError(provider.description, "PROVIDER_NOT_READY", 503);
  }

  const run = await prisma.securityTestRun.create({
    data: {
      organizationId: input.organizationId,
      targetId: target.id,
      requestedByUserId: input.actor.userId,
      provider: provider.mode,
      scanMode: input.scanMode,
      status: "queued",
      instructions: input.instructions ?? null,
      maxBudgetUsd: input.maxBudgetUsd ?? null,
      maxTurns: input.maxTurns,
      startedAt: new Date(),
      metadata: {
        authorizationId: authorization.id,
        authorizationReference: authorization.reference,
        explicitAuthorizationConfirmed: true,
      },
    },
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.actor.userId,
    actorName: input.actor.name,
    actorRole: input.actor.role,
    action: "security_test_run_started",
    module: "Adversary Validation",
    target: target.target,
    severity: "warning",
    result: "success",
    details: `${target.name} için ${input.scanMode} güvenlik testi başlatıldı.`,
    ipAddress: input.actor.ipAddress,
    device: input.actor.userAgent,
    metadata: {
      runId: run.id,
      provider: provider.mode,
      authorizationId: authorization.id,
    },
  });

  try {
    const result = await provider.launch({
      runId: run.id,
      target: {
        id: target.id,
        name: target.name,
        target: target.target,
        targetType: target.targetType,
        environment: target.environment,
        scope: stringArray(target.scope),
        exclusions: stringArray(target.exclusions),
      },
      scanMode: input.scanMode,
      instructions: input.instructions,
      maxBudgetUsd: input.maxBudgetUsd,
      maxTurns: input.maxTurns,
    });

    const criticalCount = result.findings.filter((finding) => finding.severity === "critical").length;
    const highCount = result.findings.filter((finding) => finding.severity === "high").length;
    const finishedAt = result.status === "completed" ? new Date() : null;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.securityTestRun.update({
        where: { id: run.id },
        data: {
          externalRunId: result.externalRunId,
          status: result.status,
          summary: result.summary,
          findingCount: result.findings.length,
          criticalCount,
          highCount,
          costUsd: result.costUsd ?? null,
          metadata: {
            authorizationId: authorization.id,
            authorizationReference: authorization.reference,
            explicitAuthorizationConfirmed: true,
            provider: result.metadata ?? {},
          } as Prisma.InputJsonValue,
          finishedAt,
        },
      });

      if (result.findings.length) {
        await tx.securityTestFinding.createMany({
          data: result.findings.map((finding) => ({
            organizationId: input.organizationId,
            runId: run.id,
            externalId: finding.externalId,
            title: finding.title,
            severity: finding.severity,
            category: finding.category,
            description: finding.description,
            evidence: finding.evidence,
            remediation: finding.remediation,
            affectedResource: finding.affectedResource,
            cvssScore: finding.cvssScore ?? null,
            pocAvailable: finding.pocAvailable,
            isSynthetic: finding.isSynthetic,
            metadata: finding.metadata as Prisma.InputJsonValue | undefined,
          })),
        });
      }

      return tx.securityTestRun.findUniqueOrThrow({
        where: { id: run.id },
        include: runInclude,
      });
    });

    await linkHighRiskSecurityTestFindings({
      organizationId: input.organizationId,
      actorUserId: input.actor.userId,
      provider: provider.mode,
      runId: run.id,
      targetId: target.id,
      findings: updated.findings,
    });

    if (result.status === "completed") {
      await Promise.all([
        createAuditLog({
          organizationId: input.organizationId,
          userId: input.actor.userId,
          actorName: input.actor.name,
          actorRole: input.actor.role,
          action: "security_test_run_completed",
          module: "Adversary Validation",
          target: target.target,
          severity: criticalCount || highCount ? "high" : "info",
          result: "success",
          details: `${target.name} güvenlik testi ${result.findings.length} bulguyla tamamlandı.`,
          ipAddress: input.actor.ipAddress,
          device: input.actor.userAgent,
          metadata: { runId: run.id, findingCount: result.findings.length },
        }),
        notifyOrganizationMembers({
          organizationId: input.organizationId,
          title: "Adversary validation completed",
          description: `${target.name} için ${result.findings.length} bulgu kaydedildi.`,
          type: "security_test_completed",
          severity: criticalCount ? "critical" : highCount ? "high" : "info",
          module: "Adversary Validation",
          actionHref: "/adversary-validation",
          roles: ["security_admin", "cloud_security_analyst"],
          metadata: { runId: run.id },
        }),
      ]);
    }

    const refreshed = await prisma.securityTestRun.findUniqueOrThrow({
      where: { id: run.id },
      include: runInclude,
    });
    return mapRun(refreshed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Security test provider failed.";
    await prisma.securityTestRun.update({
      where: { id: run.id },
      data: { status: "failed", errorMessage: message.slice(0, 500), finishedAt: new Date() },
    });
    await createAuditLog({
      organizationId: input.organizationId,
      userId: input.actor.userId,
      actorName: input.actor.name,
      actorRole: input.actor.role,
      action: "security_test_run_failed",
      module: "Adversary Validation",
      target: target.target,
      severity: "high",
      result: "failure",
      details: message.slice(0, 500),
      ipAddress: input.actor.ipAddress,
      device: input.actor.userAgent,
      metadata: { runId: run.id, provider: provider.mode },
    });
    throw new SecurityTestServiceError("Güvenlik testi provider tarafında başlatılamadı.", "PROVIDER_LAUNCH_FAILED", 502);
  }
}

export type SecurityTestProviderCallbackFinding = {
  externalId: string;
  title: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
  category: string;
  description: string;
  evidence: string[];
  remediation: string;
  affectedResource: string;
  cvssScore?: number | null;
  pocAvailable?: boolean;
  metadata?: Record<string, unknown>;
};

export async function applySecurityTestProviderCallback(input: {
  runId: string;
  externalRunId: string;
  status: Extract<SecurityTestRunStatus, "queued" | "running" | "completed" | "failed" | "cancelled">;
  summary?: string | null;
  errorMessage?: string | null;
  costUsd?: number | null;
  findings: SecurityTestProviderCallbackFinding[];
  metadata?: Record<string, unknown>;
}) {
  const run = await prisma.securityTestRun.findFirst({
    where: {
      id: input.runId,
      provider: { in: ["self_hosted", "managed"] },
    },
    include: runInclude,
  });
  if (!run) throw new SecurityTestServiceError("Provider koşusu bulunamadı.", "RUN_NOT_FOUND", 404);
  if (run.externalRunId && run.externalRunId !== input.externalRunId) {
    throw new SecurityTestServiceError("Provider koşu kimliği eşleşmiyor.", "EXTERNAL_RUN_MISMATCH", 409);
  }
  if (!isSecurityTestRunTransitionAllowed(run.status, input.status)) {
    throw new SecurityTestServiceError(
      `Provider koşusu ${run.status} durumundan ${input.status} durumuna geçirilemez.`,
      "INVALID_RUN_STATUS_TRANSITION",
      409,
    );
  }

  const terminalStatuses: SecurityTestRunStatus[] = ["completed", "failed", "cancelled"];
  const wasTerminal = terminalStatuses.includes(run.status);
  const isTerminal = terminalStatuses.includes(input.status);
  const existingExternalIds = new Set(run.findings.map((finding) => finding.externalId).filter(Boolean));

  const updated = await prisma.$transaction(async (tx) => {
    for (const finding of input.findings) {
      await tx.securityTestFinding.upsert({
        where: {
          runId_externalId: {
            runId: run.id,
            externalId: finding.externalId,
          },
        },
        update: {
          title: finding.title,
          severity: finding.severity,
          category: finding.category,
          description: finding.description,
          evidence: finding.evidence,
          remediation: finding.remediation,
          affectedResource: finding.affectedResource,
          cvssScore: finding.cvssScore ?? null,
          pocAvailable: finding.pocAvailable ?? true,
          isSynthetic: false,
          metadata: finding.metadata as Prisma.InputJsonValue | undefined,
        },
        create: {
          organizationId: run.organizationId,
          runId: run.id,
          externalId: finding.externalId,
          title: finding.title,
          severity: finding.severity,
          category: finding.category,
          description: finding.description,
          evidence: finding.evidence,
          remediation: finding.remediation,
          affectedResource: finding.affectedResource,
          cvssScore: finding.cvssScore ?? null,
          pocAvailable: finding.pocAvailable ?? true,
          isSynthetic: false,
          metadata: finding.metadata as Prisma.InputJsonValue | undefined,
        },
      });
    }

    const allFindings = await tx.securityTestFinding.findMany({ where: { runId: run.id } });
    const criticalCount = allFindings.filter((finding) => finding.severity === "critical").length;
    const highCount = allFindings.filter((finding) => finding.severity === "high").length;

    await tx.securityTestRun.update({
      where: { id: run.id },
      data: {
        externalRunId: input.externalRunId,
        status: input.status,
        summary: input.summary ?? run.summary,
        errorMessage: input.errorMessage ?? null,
        costUsd: input.costUsd ?? run.costUsd,
        findingCount: allFindings.length,
        criticalCount,
        highCount,
        finishedAt: isTerminal ? new Date() : null,
        metadata: {
          ...jsonObject(run.metadata),
          providerCallback: {
            source: "provider_callback",
            status: input.status,
            ...(input.metadata ?? {}),
          },
        } as Prisma.InputJsonValue,
      },
    });

    return tx.securityTestRun.findUniqueOrThrow({ where: { id: run.id }, include: runInclude });
  });

  const newlyReceivedHighRiskFindings = updated.findings.filter(
    (finding) =>
      Boolean(finding.externalId) &&
      !existingExternalIds.has(finding.externalId) &&
      (finding.severity === "critical" || finding.severity === "high"),
  );
  await linkHighRiskSecurityTestFindings({
    organizationId: run.organizationId,
    actorUserId: run.requestedByUserId,
    provider: run.provider,
    runId: run.id,
    targetId: run.targetId,
    findings: newlyReceivedHighRiskFindings,
  });

  if (isTerminal && !wasTerminal) {
    const completed = input.status === "completed";
    await Promise.all([
      createAuditLog({
        organizationId: run.organizationId,
        userId: run.requestedByUserId,
        actorName: "Strix Runner",
        actorRole: "Security Test Provider",
        action: completed ? "security_test_run_completed" : "security_test_run_failed",
        module: "Adversary Validation",
        target: run.target.target,
        severity: completed ? (updated.criticalCount || updated.highCount ? "high" : "info") : "high",
        result: completed ? "success" : "failure",
        details: completed
          ? `${run.target.name} provider koşusu ${updated.findingCount} bulguyla tamamlandı.`
          : `${run.target.name} provider koşusu ${input.status} durumuyla kapandı.`,
        metadata: { runId: run.id, externalRunId: input.externalRunId, callback: true },
      }),
      notifyOrganizationMembers({
        organizationId: run.organizationId,
        title: completed ? "Adversary validation completed" : "Adversary validation stopped",
        description: completed
          ? `${run.target.name} için ${updated.findingCount} doğrulanmış bulgu kaydedildi.`
          : `${run.target.name} koşusu ${input.status} durumuyla sonlandı.`,
        type: "security_test_completed",
        severity: completed
          ? updated.criticalCount
            ? "critical"
            : updated.highCount
              ? "high"
              : "info"
          : "high",
        module: "Adversary Validation",
        actionHref: "/adversary-validation",
        roles: ["security_admin", "cloud_security_analyst"],
        metadata: { runId: run.id, externalRunId: input.externalRunId },
      }),
    ]);
  }

  const refreshed = await prisma.securityTestRun.findUniqueOrThrow({ where: { id: run.id }, include: runInclude });
  return mapRun(refreshed);
}

export async function updateSecurityTestFindingStatus(input: {
  organizationId: string;
  findingId: string;
  status: SecurityTestFindingStatus;
  actor: SecurityTestActor;
}) {
  const finding = await prisma.securityTestFinding.findFirst({
    where: { id: input.findingId, organizationId: input.organizationId },
  });
  if (!finding) throw new SecurityTestServiceError("Bulgu bulunamadı.", "FINDING_NOT_FOUND", 404);

  const updated = await prisma.securityTestFinding.update({
    where: { id: finding.id },
    data: { status: input.status },
  });

  if (finding.securityEventId) {
    const eventStatus = {
      open: "open",
      investigating: "investigating",
      accepted_risk: "contained",
      remediated: "resolved",
      false_positive: "false_positive",
    } as const;
    await updateSecurityEventStatus({
      organizationId: input.organizationId,
      id: finding.securityEventId,
      status: eventStatus[input.status],
    });
  }

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.actor.userId,
    actorName: input.actor.name,
    actorRole: input.actor.role,
    action: "security_test_finding_status_updated",
    module: "Adversary Validation",
    target: finding.title,
    severity: "info",
    result: "success",
    details: `Bulgu durumu ${input.status} olarak güncellendi.`,
    ipAddress: input.actor.ipAddress,
    device: input.actor.userAgent,
    metadata: { findingId: finding.id, status: input.status },
  });

  return mapFinding(updated);
}
