import type { DeceptionTrigger } from "@prisma/client";

export function mapDeceptionTriggerRecord(trigger: DeceptionTrigger) {
  return {
    id: trigger.id,
    deceptionAssetId: trigger.deceptionAssetId,
    identityProfileId: trigger.identityProfileId,
    eventId: trigger.eventId,
    sourceIp: trigger.sourceIp,
    userAgent: trigger.userAgent,
    requestHeaders: trigger.requestHeaders,
    requestPath: trigger.requestPath,
    createdAt: trigger.createdAt.toISOString(),
  };
}
