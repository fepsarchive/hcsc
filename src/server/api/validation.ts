import type { NextRequest } from "next/server";
import { z } from "zod";

import { apiError } from "@/server/api/response";

export async function parseRequestJson<T extends z.ZodTypeAny>(
  request: NextRequest,
  schema: T,
  requestId: string,
) {
  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);

  if (!parsed.success) {
    return {
      success: false as const,
      response: apiError(
        requestId,
        400,
        "VALIDATION_ERROR",
        "İstek gövdesi beklenen formatta değil.",
        {
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
      ),
    };
  }

  return {
    success: true as const,
    data: parsed.data,
  };
}
