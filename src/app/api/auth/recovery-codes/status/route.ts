import { NextRequest } from "next/server";

import { requireApiAuth } from "@/server/api/require-auth";
import { apiOk } from "@/server/api/response";
import { getRecoveryCodeStatus } from "@/server/auth/recovery-codes";

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request, {
    requireTwoFactor: true,
    target: "auth:recovery-codes-status",
  });

  if (!auth.ok) {
    return auth.response;
  }

  const status = await getRecoveryCodeStatus(auth.context.session.userId);

  return apiOk(auth.context.requestId, status);
}
