import { type NextRequest } from "next/server";
import { z } from "zod";

import { requireApiAuth } from "@/server/api/require-auth";
import { apiOk } from "@/server/api/response";
import { securityTestErrorResponse } from "@/server/api/security-test-error";
import { parseRequestJson } from "@/server/api/validation";
import { updateSecurityTestFindingStatus } from "@/server/services/security-testing/security-test-service";

const updateFindingSchema = z.object({
  status: z.enum(["open", "investigating", "accepted_risk", "remediated", "false_positive"]),
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(request, {
    permission: "run_security_test",
    target: "adversary-validation:finding:update",
  });

  if (!auth.ok) return auth.response;

  const parsed = await parseRequestJson(request, updateFindingSchema, auth.context.requestId);
  if (!parsed.success) return parsed.response;
  const { id } = await context.params;

  try {
    const finding = await updateSecurityTestFindingStatus({
      organizationId: auth.context.session.organizationId,
      findingId: id,
      status: parsed.data.status,
      actor: {
        userId: auth.context.session.userId,
        name: auth.context.user.name,
        role: auth.context.user.role,
        ipAddress: auth.context.ipAddress,
        userAgent: auth.context.userAgent,
      },
    });
    return apiOk(auth.context.requestId, finding);
  } catch (error) {
    return securityTestErrorResponse(auth.context.requestId, error);
  }
}
