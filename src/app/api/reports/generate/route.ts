import { type NextRequest } from "next/server";
import { z } from "zod";

import { requireApiAuth } from "@/server/api/require-auth";
import { apiOk } from "@/server/api/response";
import { parseRequestJson } from "@/server/api/validation";
import { generateOrganizationReport } from "@/server/services/reports/reports-service";

const bodySchema = z.object({
  type: z
    .enum(["general", "critical-data", "critical_data", "zero-trust", "zero_trust", "deception", "nist", "privacy", "demo"])
    .optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request, {
    permission: "generate_report",
    target: "reports:generate",
  });

  if (!auth.ok) {
    return auth.response;
  }

  const parsed = await parseRequestJson(request, bodySchema, auth.context.requestId);
  if (!parsed.success) {
    return parsed.response;
  }

  const report = await generateOrganizationReport({
    organizationId: auth.context.session.organizationId,
    type: parsed.data.type,
    actor: {
      userId: auth.context.session.userId,
      name: auth.context.user.name,
      role: auth.context.user.role,
      ipAddress: auth.context.ipAddress,
      userAgent: auth.context.userAgent,
    },
  });

  return apiOk(auth.context.requestId, report);
}
