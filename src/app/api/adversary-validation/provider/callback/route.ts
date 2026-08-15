import { type NextRequest } from "next/server";
import { z } from "zod";

import { apiError, apiOk } from "@/server/api/response";
import { securityTestErrorResponse } from "@/server/api/security-test-error";
import { parseRequestJson } from "@/server/api/validation";
import { buildRequestMeta } from "@/server/auth/session";
import { verifySecurityTestProviderCallback } from "@/server/services/security-testing/provider-callback-auth";
import { applySecurityTestProviderCallback } from "@/server/services/security-testing/security-test-service";

const callbackFindingSchema = z.object({
  externalId: z.string().trim().min(1).max(160),
  title: z.string().trim().min(3).max(240),
  severity: z.enum(["info", "low", "medium", "high", "critical"]),
  category: z.string().trim().min(2).max(120),
  description: z.string().trim().min(3).max(10_000),
  evidence: z.array(z.string().trim().min(1).max(4_000)).max(50).default([]),
  remediation: z.string().trim().min(3).max(10_000),
  affectedResource: z.string().trim().min(1).max(1_000),
  cvssScore: z.number().min(0).max(10).optional().nullable(),
  pocAvailable: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const callbackSchema = z.object({
  hcscRunId: z.string().trim().min(1).max(160),
  externalRunId: z.string().trim().min(1).max(160),
  status: z.enum(["queued", "running", "completed", "failed", "cancelled"]),
  summary: z.string().trim().max(10_000).optional().nullable(),
  errorMessage: z.string().trim().max(2_000).optional().nullable(),
  costUsd: z.number().min(0).max(100_000).optional().nullable(),
  findings: z.array(callbackFindingSchema).max(200).default([]),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  const meta = buildRequestMeta(request);
  const callbackAuth = verifySecurityTestProviderCallback(request.headers.get("authorization"));
  if (!callbackAuth.configured) {
    return apiError(meta.requestId, 503, "PROVIDER_CALLBACK_DISABLED", "Provider callback yapılandırılmamış.");
  }
  if (!callbackAuth.valid) {
    return apiError(meta.requestId, 401, "INVALID_PROVIDER_TOKEN", "Provider callback kimliği doğrulanamadı.");
  }

  const parsed = await parseRequestJson(request, callbackSchema, meta.requestId);
  if (!parsed.success) return parsed.response;

  try {
    const run = await applySecurityTestProviderCallback({
      runId: parsed.data.hcscRunId,
      externalRunId: parsed.data.externalRunId,
      status: parsed.data.status,
      summary: parsed.data.summary,
      errorMessage: parsed.data.errorMessage,
      costUsd: parsed.data.costUsd,
      findings: parsed.data.findings,
      metadata: parsed.data.metadata,
    });
    return apiOk(meta.requestId, { accepted: true, run });
  } catch (error) {
    return securityTestErrorResponse(meta.requestId, error);
  }
}
