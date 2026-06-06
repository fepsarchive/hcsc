import { type NextRequest } from "next/server";
import { z } from "zod";

import { requireSystemOwnerApiAuth } from "@/server/admin/admin-auth";
import { getAdminSettings, updateAdminSettings } from "@/server/admin/admin-service";
import { apiError, apiOk } from "@/server/api/response";
import { parseRequestJson } from "@/server/api/validation";

const settingsSchema = z.object({
  applicationName: z.string().trim().min(1).max(80),
  maintenanceMode: z.boolean(),
  registrationEnabled: z.boolean(),
  adminContactEmail: z.email().trim(),
  systemNoticeMessage: z.string().trim().max(240),
  securityScanVisibility: z.boolean(),
  publicStatusMessage: z.string().trim().max(180),
});

export async function GET(request: NextRequest) {
  const auth = await requireSystemOwnerApiAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  try {
    return apiOk(auth.requestId, await getAdminSettings());
  } catch {
    return apiError(auth.requestId, 500, "ADMIN_SETTINGS_READ_FAILED", "Admin ayarları okunamadı.");
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireSystemOwnerApiAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const parsed = await parseRequestJson(request, settingsSchema, auth.requestId);
  if (!parsed.success) {
    return parsed.response;
  }

  try {
    const settings = await updateAdminSettings({
      session: auth.session,
      settings: parsed.data,
      ipAddress: auth.ipAddress,
      device: auth.userAgent,
    });

    return apiOk(auth.requestId, settings);
  } catch {
    return apiError(auth.requestId, 500, "ADMIN_SETTINGS_UPDATE_FAILED", "Admin ayarları güncellenemedi.");
  }
}
