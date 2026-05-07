import { createAuditLog } from "@/server/services/audit/audit-log-service";
import { getCurrentComplianceWithEngine, recalculateComplianceWithEngine } from "@/server/services/engines/compliance-engine.service";
import { notifyOrganizationMembers } from "@/server/services/notifications/notification-service";

export async function getCurrentCompliance(organizationId: string) {
  return getCurrentComplianceWithEngine(organizationId);
}

export async function recalculateAndPersistCompliance(input: {
  organizationId: string;
  actor: {
    userId: string;
    name: string;
    role: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  };
}) {
  const result = await recalculateComplianceWithEngine({
    organizationId: input.organizationId,
  });

  await createAuditLog({
    organizationId: input.organizationId,
    userId: input.actor.userId,
    actorName: input.actor.name,
    actorRole: input.actor.role,
    action: "compliance_recalculated",
    module: "Compliance",
    target: "latest-compliance-snapshot",
    severity: "info",
    result: "success",
    details: `Uyumluluk snapshot skoru ${result.overallScore}% olarak güncellendi.`,
    ipAddress: input.actor.ipAddress,
    device: input.actor.userAgent,
  });

  await notifyOrganizationMembers({
    organizationId: input.organizationId,
    title: "Compliance recalculated",
    description: `Uyumluluk snapshot skoru ${result.overallScore}% olarak güncellendi.`,
    type: "compliance_changed",
    severity: "medium",
    module: "Compliance",
    actionHref: "/compliance",
    roles: ["security_admin", "cloud_security_analyst", "compliance_officer"],
  });

  return result.compliance;
}
