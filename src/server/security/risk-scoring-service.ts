import "server-only";

import {
  clampRiskScore,
  getRiskLevel,
  type RiskComputation,
} from "@/lib/security-risk-scoring";
import { prisma } from "@/server/db/prisma";

export { calculateAssetRisk, calculateEventRisk, getRiskLevel } from "@/lib/security-risk-scoring";
export type { RiskComputation } from "@/lib/security-risk-scoring";

export async function calculateUserRisk(userId: string): Promise<RiskComputation> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [failedAuth, adminBlocks] = await Promise.all([
    prisma.securityEvent.count({
      where: {
        actorUserId: userId,
        category: { in: ["auth_failure", "mfa_failure"] },
        createdAt: { gte: since },
      },
    }),
    prisma.securityEvent.count({
      where: {
        actorUserId: userId,
        category: "admin_access_denied",
        createdAt: { gte: since },
      },
    }),
  ]);

  const score = clampRiskScore(failedAuth * 10 + adminBlocks * 24);
  return {
    score,
    level: getRiskLevel(score),
    reasons: [
      failedAuth ? `${failedAuth} recent authentication failure(s).` : "No recent authentication failure spike.",
      adminBlocks ? `${adminBlocks} unauthorized admin attempt(s).` : "No recent unauthorized admin attempts.",
    ],
  };
}

export async function calculateOrganizationRisk(organizationId: string): Promise<RiskComputation> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [assets, recentEvents, trapTriggers] = await Promise.all([
    prisma.asset.findMany({
      where: { organizationId, inventoryStatus: { not: "ARCHIVED" } },
      select: { riskScore: true, riskLevel: true },
    }),
    prisma.securityEvent.findMany({
      where: { organizationId, createdAt: { gte: since } },
      select: { severity: true, category: true, status: true, createdAt: true },
    }),
    prisma.deceptionTrigger.count({ where: { organizationId, createdAt: { gte: since } } }),
  ]);

  const averageAssetRisk = assets.length
    ? assets.reduce((total, asset) => total + asset.riskScore, 0) / assets.length
    : 0;
  const openCritical = recentEvents.filter((event) => event.status !== "resolved" && event.severity === "critical").length;
  const highEvents = recentEvents.filter((event) => event.severity === "high").length;
  const score = clampRiskScore(averageAssetRisk * 0.55 + openCritical * 12 + highEvents * 5 + trapTriggers * 8);

  return {
    score,
    level: getRiskLevel(score),
    reasons: [
      `Average asset risk is ${Math.round(averageAssetRisk)}.`,
      `${openCritical} open critical event(s) in the last 24 hours.`,
      `${trapTriggers} deception trigger(s) in the last 24 hours.`,
    ],
  };
}

export async function calculateSecurityHealthScore(organizationId: string) {
  const risk = await calculateOrganizationRisk(organizationId);
  const score = clampRiskScore(100 - risk.score);

  return {
    score,
    level: getRiskLevel(100 - score),
    reasons: risk.reasons,
  };
}
