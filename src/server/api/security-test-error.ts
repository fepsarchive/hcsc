import { apiError } from "@/server/api/response";
import { SecurityTestServiceError } from "@/server/services/security-testing/security-test-service";

export function securityTestErrorResponse(requestId: string, error: unknown) {
  if (error instanceof SecurityTestServiceError) {
    return apiError(requestId, error.status, error.code, error.message);
  }

  console.error("[adversary-validation] Unhandled service error", error);
  return apiError(requestId, 500, "INTERNAL_ERROR", "Güvenlik testi işlemi tamamlanamadı.");
}
