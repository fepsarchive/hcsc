import { type NextRequest } from "next/server";

import { requireSystemOwnerApiAuth } from "@/server/admin/admin-auth";
import { getAdminUsers } from "@/server/admin/admin-service";
import { apiCreated, apiError, apiOk } from "@/server/api/response";
import { parseRequestJson } from "@/server/api/validation";
import { provisionManagedUser, provisionUserSchema, UserProvisioningError } from "@/server/admin/provision-user";
import { applyRateLimitHeaders, consumeRateLimitPolicy } from "@/server/auth/rate-limit";

export async function GET(request: NextRequest) {
  const auth = await requireSystemOwnerApiAuth(request);
  if (!auth.ok) return auth.response;

  try {
    return apiOk(auth.requestId, await getAdminUsers(request.nextUrl.searchParams.get("q") ?? ""));
  } catch {
    return apiError(auth.requestId, 500, "ADMIN_USERS_FAILED", "Admin kullanıcı listesi alınamadı.");
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireSystemOwnerApiAuth(request);
  if (!auth.ok) return auth.response;
  // Provisioning always requires real MFA, even if a legacy exception is configured.
  if (!auth.session.is2FAVerified) return apiError(auth.requestId, 403, "TWO_FACTOR_REQUIRED", "Kullanıcı oluşturmak için gerçek 2FA doğrulaması gerekli.");
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return apiError(auth.requestId, 403, "ORIGIN_REJECTED", "Bu işlem yalnızca yönetim ekranından yapılabilir.");
  }
  const parsed = await parseRequestJson(request, provisionUserSchema, auth.requestId);
  if (!parsed.success) return parsed.response;
  const limit = await consumeRateLimitPolicy("admin_provision", { userId: auth.session.userId });
  if (!limit.allowed) return applyRateLimitHeaders(apiError(auth.requestId, 429, "RATE_LIMITED", "Kullanıcı oluşturma sınırına ulaşıldı."), limit);
  try {
    const result = await provisionManagedUser({
      account: parsed.data, session: auth.session, ipAddress: auth.ipAddress, userAgent: auth.userAgent,
    });
    return applyRateLimitHeaders(apiCreated(auth.requestId, result), limit);
  } catch (error) {
    return applyRateLimitHeaders(error instanceof UserProvisioningError
      ? apiError(auth.requestId, error.status, error.code, error.message)
      : apiError(auth.requestId, 500, "ADMIN_PROVISION_FAILED", "Hesap oluşturulamadı. Yeniden denemeden önce kullanıcı listesini kontrol edin."), limit);
  }
}
