import { type NextRequest } from "next/server";
import { z } from "zod";

import { normalizeSecurityTestScope } from "@/lib/security-test-policy";
import { requireApiAuth } from "@/server/api/require-auth";
import { apiCreated } from "@/server/api/response";
import { securityTestErrorResponse } from "@/server/api/security-test-error";
import { parseRequestJson } from "@/server/api/validation";
import { createSecurityTestTarget } from "@/server/services/security-testing/security-test-service";

const createTargetSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    targetType: z.enum(["repository", "web_application", "api"]),
    target: z.url().max(500).refine((value) => new URL(value).protocol === "https:", {
      message: "Hedef adresi güvenli HTTPS protokolü kullanmalı.",
    }),
    environment: z.enum(["sandbox", "staging", "production"]),
    description: z.string().trim().max(1000).optional().nullable(),
    scope: z.array(z.string().trim().min(2).max(240)).min(1).max(24),
    exclusions: z.array(z.string().trim().min(2).max(240)).max(24).default([]),
    authorizationReference: z.string().trim().min(3).max(160),
    authorizationExpiresAt: z.iso.datetime(),
    authorizationNotes: z.string().trim().max(1000).optional().nullable(),
    explicitAuthorizationConfirmed: z.literal(true),
  })
  .superRefine((value, context) => {
    if (new Date(value.authorizationExpiresAt).getTime() <= Date.now()) {
      context.addIssue({
        code: "custom",
        path: ["authorizationExpiresAt"],
        message: "Yetkilendirme bitiş tarihi gelecekte olmalı.",
      });
    }
  });

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request, {
    permission: "manage_security_test_targets",
    target: "adversary-validation:target:create",
  });

  if (!auth.ok) return auth.response;

  const parsed = await parseRequestJson(request, createTargetSchema, auth.context.requestId);
  if (!parsed.success) return parsed.response;

  try {
    const target = await createSecurityTestTarget({
      organizationId: auth.context.session.organizationId,
      name: parsed.data.name,
      targetType: parsed.data.targetType,
      target: parsed.data.target,
      environment: parsed.data.environment,
      description: parsed.data.description,
      scope: normalizeSecurityTestScope(parsed.data.scope),
      exclusions: normalizeSecurityTestScope(parsed.data.exclusions),
      authorizationReference: parsed.data.authorizationReference,
      authorizationExpiresAt: new Date(parsed.data.authorizationExpiresAt),
      authorizationNotes: parsed.data.authorizationNotes,
      actor: {
        userId: auth.context.session.userId,
        name: auth.context.user.name,
        role: auth.context.user.role,
        ipAddress: auth.context.ipAddress,
        userAgent: auth.context.userAgent,
      },
    });
    return apiCreated(auth.context.requestId, target);
  } catch (error) {
    return securityTestErrorResponse(auth.context.requestId, error);
  }
}
