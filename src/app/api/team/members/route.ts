import { NextRequest } from "next/server";

import { requireApiAuth } from "@/server/api/require-auth";
import { apiOk } from "@/server/api/response";
import { listTeamMembers } from "@/server/team/team-service";

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request, {
    requireTwoFactor: true,
    target: "team:members",
  });

  if (!auth.ok) {
    return auth.response;
  }

  const members = await listTeamMembers(auth.context.session.organizationId);

  return apiOk(auth.context.requestId, {
    members,
  });
}
