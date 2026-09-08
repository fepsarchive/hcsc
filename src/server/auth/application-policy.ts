import "server-only";

import { prisma } from "@/server/db/prisma";

export async function getApplicationPolicy(client: Pick<typeof prisma, "appSetting"> = prisma) {
  const settings = await client.appSetting.findMany({
    where: { key: { in: ["maintenanceMode", "registrationEnabled"] } },
    select: { key: true, value: true },
  });
  return {
    maintenanceMode: settings.some((item) => item.key === "maintenanceMode" && item.value === true),
    registrationEnabled: !settings.some((item) => item.key === "registrationEnabled" && item.value === false),
  };
}
