import { buildDemoEnvironmentForOrganization } from "@/server/services/core/environment-service";
import { recalculateAndPersistCompliance } from "@/server/services/reports/reports-service";

export async function getCurrentCompliance(organizationId: string) {
  const environment = await buildDemoEnvironmentForOrganization(organizationId);
  return environment.compliance;
}

export { recalculateAndPersistCompliance };
