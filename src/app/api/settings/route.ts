import { type NextRequest } from "next/server";

import { requireApiAuth } from "@/server/api/require-auth";
import { apiOk } from "@/server/api/response";
import { getSettingsBundle } from "@/server/services/settings/settings-service";

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request, {
    permission: "manage_settings",
    target: "settings:get",
  });

  if (!auth.ok) {
    return auth.response;
  }

  const settings = await getSettingsBundle(auth.context.session.organizationId);
  return apiOk(auth.context.requestId, settings);
}
