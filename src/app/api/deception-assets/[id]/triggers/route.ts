import { type NextRequest } from "next/server";

import { requireApiAuth } from "@/server/api/require-auth";
import { apiOk } from "@/server/api/response";
import { listDeceptionTriggers } from "@/server/services/deception/deception-service";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth(request, {
    permission: "trigger_deception",
    target: "deception-assets:triggers",
  });

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const triggers = await listDeceptionTriggers(auth.context.session.organizationId, id);
  return apiOk(auth.context.requestId, triggers, { total: triggers.length });
}
