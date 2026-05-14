import { NextRequest } from "next/server";
import { z } from "zod";

import { completeWorkspaceOnboarding } from "@/server/auth/account";
import { requireApiAuth } from "@/server/api/require-auth";
import { apiError, apiOk } from "@/server/api/response";
import { parseRequestJson } from "@/server/api/validation";

const onboardingSchema = z.object({
  organizationName: z.string().trim().min(2),
  city: z.string().trim().min(1).optional(),
  usageType: z.enum(["saas", "fintech", "retail", "platform", "managed-security"]).optional(),
  defaultCurrency: z.enum(["TRY", "USD", "EUR", "GBP"]).optional(),
  cloudMode: z.enum(["private_cloud", "public_cloud", "hybrid_cloud"]),
  complianceFrameworks: z.array(z.string().trim().min(1)).min(1),
  seedStarterData: z.boolean(),
  runInitialScan: z.boolean(),
});

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request, {
    requireTwoFactor: true,
    target: "auth:onboarding",
  });

  if (!auth.ok) {
    return auth.response;
  }

  const parsed = await parseRequestJson(request, onboardingSchema, auth.context.requestId);

  if (!parsed.success) {
    return parsed.response;
  }

  try {
    const result = await completeWorkspaceOnboarding({
      organizationId: auth.context.session.organizationId,
      actor: {
        userId: auth.context.session.userId,
        name: auth.context.user.name,
        role: auth.context.user.role,
        ipAddress: auth.context.ipAddress,
        userAgent: auth.context.userAgent,
      },
      data: parsed.data,
    });

    return apiOk(auth.context.requestId, result);
  } catch (error) {
    return apiError(
      auth.context.requestId,
      500,
      "ONBOARDING_FAILED",
      error instanceof Error ? error.message : "Kurulum tamamlanamadı.",
    );
  }
}
