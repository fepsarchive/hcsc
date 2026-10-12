import { randomUUID } from "node:crypto";
import { apiError } from "@/server/api/response";

// Stale clients must also be denied, independently of legacy settings.
export async function POST() {
  return apiError(randomUUID(), 403, "REGISTRATION_DISABLED", "Hesaplar yalnızca yetkili yönetici tarafından oluşturulur.");
}
