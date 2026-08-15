import { type NextRequest } from "next/server";
import { z } from "zod";

import { requireApiAuth } from "@/server/api/require-auth";
import { apiCreated } from "@/server/api/response";
import { securityTestErrorResponse } from "@/server/api/security-test-error";
import { parseRequestJson } from "@/server/api/validation";
import { launchSecurityTestRun } from "@/server/services/security-testing/security-test-service";

const launchRunSchema = z.object({
  targetId: z.string().trim().min(1),
  scanMode: z.enum(["quick", "standard", "deep"]),
  instructions: z.string().trim().max(2000).optional().nullable(),
  maxBudgetUsd: z.number().positive().max(1000).optional().nullable(),
  maxTurns: z.number().int().min(25).max(500).default(100),
  explicitAuthorizationConfirmed: z.literal(true),
});

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request, {
    permission: "run_security_test",
    target: "adversary-validation:run:create",
  });

  if (!auth.ok) return auth.response;

  const parsed = await parseRequestJson(request, launchRunSchema, auth.context.requestId);
  if (!parsed.success) return parsed.response;

  try {
    const run = await launchSecurityTestRun({
      organizationId: auth.context.session.organizationId,
      targetId: parsed.data.targetId,
      scanMode: parsed.data.scanMode,
      instructions: parsed.data.instructions,
      maxBudgetUsd: parsed.data.maxBudgetUsd,
      maxTurns: parsed.data.maxTurns,
      explicitAuthorizationConfirmed: parsed.data.explicitAuthorizationConfirmed,
      actor: {
        userId: auth.context.session.userId,
        name: auth.context.user.name,
        role: auth.context.user.role,
        ipAddress: auth.context.ipAddress,
        userAgent: auth.context.userAgent,
      },
    });
    return apiCreated(auth.context.requestId, run);
  } catch (error) {
    return securityTestErrorResponse(auth.context.requestId, error);
  }
}
