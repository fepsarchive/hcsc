import "server-only";

import { randomUUID } from "node:crypto";

import type { Asset, CloudLocation, DataClassification, DataTemperature, Prisma, RiskLevel, StorageType } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { createSecurityEvent } from "@/server/security/security-event-service";
import { calculateAssetRisk } from "@/server/security/risk-scoring-service";

type AssetExposure = "internal" | "shared" | "public" | "unknown";
type AssetEnvironment = "cloud" | "hybrid" | "on_prem" | "saas";

const classificationMap: Record<string, DataClassification> = {
  LOW: "internal",
  MEDIUM: "confidential",
  HIGH: "sensitive",
  CRITICAL: "critical",
  public: "public",
  internal: "internal",
  confidential: "confidential",
  sensitive: "sensitive",
  critical: "critical",
};

const locationByEnvironment: Record<AssetEnvironment, CloudLocation> = {
  cloud: "public_cloud",
  hybrid: "public_cloud",
  on_prem: "private_cloud",
  saas: "saas",
};

const storageTypeByAssetType: Record<string, StorageType> = {
  DATABASE: "database",
  STORAGE_BUCKET: "object_storage",
  API_ENDPOINT: "saas_export",
  ADMIN_CONSOLE: "saas_export",
  USER_RECORDS: "database",
  COMPLIANCE_DOCUMENT: "file_share",
  REPORT: "backup_archive",
  SECRET_STORE: "database",
  CLOUD_SERVICE: "saas_export",
};

function normalizeRiskLevel(score: number): RiskLevel {
  if (score >= 75) return "critical";
  if (score >= 50) return "high";
  if (score >= 25) return "medium";
  return "low";
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeClassification(value: string | undefined): DataClassification {
  return classificationMap[value ?? ""] ?? "internal";
}

function normalizeExposure(value: string | undefined): AssetExposure {
  const normalized = value?.toLowerCase();
  if (normalized === "public" || normalized === "shared" || normalized === "unknown") return normalized;
  return "internal";
}

function normalizeEnvironment(value: string | undefined): AssetEnvironment {
  const normalized = value?.toLowerCase();
  if (normalized === "cloud" || normalized === "hybrid" || normalized === "on_prem" || normalized === "saas") {
    return normalized;
  }
  return "hybrid";
}

function buildRiskFields(asset: Pick<Asset, "classification" | "location" | "storageType" | "encryptionEnabled" | "kmsEnabled" | "backupEnabled" | "kvkkScope" | "gdprScope" | "isDeception" | "exposure">) {
  const risk = calculateAssetRisk(asset);

  return {
    riskScore: risk.score,
    riskLevel: normalizeRiskLevel(risk.score),
    riskReasons: risk.reasons,
    recommendedControls: [
      ...new Set([
        asset.encryptionEnabled ? "" : "Enable encryption",
        asset.kmsEnabled ? "" : "Enable KMS",
        asset.backupEnabled ? "" : "Enable backup",
        asset.exposure === "public" ? "Review public exposure" : "",
        "Review access policy",
      ].filter(Boolean)),
    ],
  };
}

export async function createDataAsset(input: {
  organizationId: string;
  ownerUserId?: string | null;
  ownerName?: string | null;
  name: string;
  type: string;
  description?: string | null;
  sensitivity?: string;
  exposure?: string;
  environment?: string;
  provider?: string | null;
  location?: CloudLocation;
  tags?: string[];
}) {
  const classification = normalizeClassification(input.sensitivity);
  const exposure = normalizeExposure(input.exposure);
  const environment = normalizeEnvironment(input.environment);
  const storageType = storageTypeByAssetType[input.type] ?? "saas_export";
  const location = input.location ?? locationByEnvironment[environment];
  const path = `/inventory/${slugify(input.name) || "asset"}-${randomUUID().slice(0, 8)}`;
  const draft = {
    classification,
    location,
    storageType,
    encryptionEnabled: exposure !== "public",
    kmsEnabled: classification === "critical" || classification === "sensitive",
    backupEnabled: true,
    kvkkScope: classification === "sensitive" || classification === "critical",
    gdprScope: classification === "sensitive" || classification === "critical",
    isDeception: input.type === "DECEPTION_TRAP_ENDPOINT",
    exposure,
  } satisfies Pick<Asset, "classification" | "location" | "storageType" | "encryptionEnabled" | "kmsEnabled" | "backupEnabled" | "kvkkScope" | "gdprScope" | "isDeception" | "exposure">;
  const riskFields = buildRiskFields(draft);

  const asset = await prisma.asset.create({
    data: {
      organizationId: input.organizationId,
      ownerUserId: input.ownerUserId ?? null,
      name: input.name,
      path,
      inventoryType: input.type,
      dataType: input.type,
      description: input.description ?? null,
      exposure,
      environment,
      provider: input.provider ?? null,
      location,
      storageType,
      classification,
      temperature: "warm" satisfies DataTemperature,
      owner: input.ownerName ?? "Security Team",
      encryptionEnabled: draft.encryptionEnabled,
      kmsEnabled: draft.kmsEnabled,
      backupEnabled: draft.backupEnabled,
      kvkkScope: draft.kvkkScope,
      gdprScope: draft.gdprScope,
      privacyTags: input.tags ?? [],
      retentionPolicy: "review_required",
      anonymizationStatus: "not_applicable",
      riskReasons: riskFields.riskReasons,
      recommendedControls: riskFields.recommendedControls,
      findings: [],
      tags: input.tags ?? [],
      riskScore: riskFields.riskScore,
      riskLevel: riskFields.riskLevel,
      inventoryStatus: "ACTIVE",
      isDeception: draft.isDeception,
    },
  });

  if (asset.riskLevel === "high" || asset.riskLevel === "critical") {
    await createSecurityEvent({
      organizationId: input.organizationId,
      actorUserId: input.ownerUserId,
      source: "Data Asset Inventory",
      category: "data_asset_risk",
      type: "DATA_ASSET_RISK",
      title: `High risk asset registered: ${asset.name}`,
      description: `${asset.name} inventory item was created with ${asset.riskLevel} risk level.`,
      severity: asset.riskLevel === "critical" ? "critical" : "high",
      riskScore: asset.riskScore,
      target: asset.name,
      targetType: "asset",
      targetId: asset.id,
      relatedAssetId: asset.id,
      metadata: {
        assetId: asset.id,
        riskReasons: riskFields.riskReasons,
      },
    });
  }

  return asset;
}

export async function listDataAssets(filters: {
  organizationId: string;
  search?: string;
  riskLevel?: RiskLevel;
  status?: string;
  take?: number;
}) {
  return prisma.asset.findMany({
    where: {
      organizationId: filters.organizationId,
      ...(filters.riskLevel ? { riskLevel: filters.riskLevel } : {}),
      ...(filters.status ? { inventoryStatus: filters.status } : {}),
      ...(filters.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: "insensitive" } },
              { path: { contains: filters.search, mode: "insensitive" } },
              { owner: { contains: filters.search, mode: "insensitive" } },
              { provider: { contains: filters.search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ riskScore: "desc" }, { createdAt: "desc" }],
    take: filters.take ?? 100,
  });
}

export async function getDataAssetById(organizationId: string, id: string) {
  return prisma.asset.findFirst({
    where: { id, organizationId },
  });
}

export async function updateDataAsset(input: {
  organizationId: string;
  id: string;
  name?: string;
  description?: string | null;
  sensitivity?: string;
  exposure?: string;
  environment?: string;
  provider?: string | null;
  tags?: string[];
  status?: string;
}) {
  const existing = await prisma.asset.findFirst({
    where: { id: input.id, organizationId: input.organizationId },
  });

  if (!existing) return null;

  const classification = input.sensitivity ? normalizeClassification(input.sensitivity) : existing.classification;
  const exposure = input.exposure ? normalizeExposure(input.exposure) : existing.exposure;
  const environment = input.environment ? normalizeEnvironment(input.environment) : existing.environment;
  const riskFields = buildRiskFields({
    classification,
    exposure,
    location: existing.location,
    storageType: existing.storageType,
    encryptionEnabled: existing.encryptionEnabled,
    kmsEnabled: existing.kmsEnabled,
    backupEnabled: existing.backupEnabled,
    kvkkScope: existing.kvkkScope,
    gdprScope: existing.gdprScope,
    isDeception: existing.isDeception,
  });

  const updated = await prisma.asset.update({
    where: { id: existing.id },
    data: {
      name: input.name ?? existing.name,
      description: input.description ?? existing.description,
      classification,
      exposure,
      environment,
      provider: input.provider ?? existing.provider,
      tags: input.tags ?? (existing.tags as Prisma.InputJsonValue | undefined),
      privacyTags: input.tags ?? (existing.privacyTags as Prisma.InputJsonValue),
      inventoryStatus: input.status ?? existing.inventoryStatus,
      riskScore: riskFields.riskScore,
      riskLevel: riskFields.riskLevel,
      riskReasons: riskFields.riskReasons,
      recommendedControls: riskFields.recommendedControls,
      updatedAt: new Date(),
    },
  });

  if (updated.riskLevel === "high" || updated.riskLevel === "critical") {
    await createSecurityEvent({
      organizationId: input.organizationId,
      source: "Data Asset Inventory",
      category: "data_asset_risk",
      type: "DATA_ASSET_RISK",
      title: `High risk asset updated: ${updated.name}`,
      description: `${updated.name} inventory item currently has ${updated.riskLevel} risk level.`,
      severity: updated.riskLevel === "critical" ? "critical" : "high",
      riskScore: updated.riskScore,
      target: updated.name,
      targetType: "asset",
      targetId: updated.id,
      relatedAssetId: updated.id,
      metadata: {
        assetId: updated.id,
        riskReasons: riskFields.riskReasons,
      },
    });
  }

  return updated;
}

export async function calculateAssetRiskById(organizationId: string, assetId: string) {
  const asset = await prisma.asset.findFirst({
    where: { id: assetId, organizationId },
  });
  if (!asset) return null;

  const relatedEvents = await prisma.securityEvent.findMany({
    where: {
      organizationId,
      OR: [{ relatedAssetId: asset.id }, { targetId: asset.id }],
    },
  });
  return calculateAssetRisk(asset, relatedEvents);
}

export async function getAssetMetrics(organizationId: string) {
  const [total, highRisk, byRisk, averageRisk] = await Promise.all([
    prisma.asset.count({ where: { organizationId, inventoryStatus: { not: "ARCHIVED" } } }),
    prisma.asset.count({ where: { organizationId, riskLevel: { in: ["high", "critical"] }, inventoryStatus: { not: "ARCHIVED" } } }),
    prisma.asset.groupBy({
      by: ["riskLevel"],
      where: { organizationId, inventoryStatus: { not: "ARCHIVED" } },
      _count: { _all: true },
    }),
    prisma.asset.aggregate({
      where: { organizationId, inventoryStatus: { not: "ARCHIVED" } },
      _avg: { riskScore: true },
    }),
  ]);

  return {
    total,
    highRisk,
    averageRiskScore: Math.round(averageRisk._avg.riskScore ?? 0),
    riskDistribution: Object.fromEntries(byRisk.map((entry) => [entry.riskLevel, entry._count._all])),
  };
}

export async function getHighRiskAssets(organizationId: string, take = 6) {
  return prisma.asset.findMany({
    where: {
      organizationId,
      riskLevel: { in: ["high", "critical"] },
      inventoryStatus: { not: "ARCHIVED" },
    },
    orderBy: [{ riskScore: "desc" }, { updatedAt: "desc" }],
    take,
  });
}
