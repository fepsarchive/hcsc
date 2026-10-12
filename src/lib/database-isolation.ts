import { createHash } from "node:crypto";

type DatabaseEnvironment = Record<string, string | undefined>;
export class DatabaseIsolationError extends Error {
  constructor(message: string) { super(message); this.name = "DatabaseIsolationError"; }
}

// No credentials in diagnostics. Neon pooled/direct URLs identify the same DB.
export function databaseTargetFingerprint(value: string) {
  let url: URL;
  try { url = new URL(value); } catch { throw new DatabaseIsolationError("Geçersiz Postgres bağlantı yapılandırması."); }
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname || url.hash) {
    throw new DatabaseIsolationError("Geçerli bir Postgres hedefi gereklidir.");
  }
  // pg query parameters can override URL fields. Reject target overrides.
  for (const key of url.searchParams.keys()) {
    if (!["sslmode", "sslcert", "sslkey", "sslrootcert", "connect_timeout", "connection_limit", "pool_timeout", "pgbouncer", "application_name", "channel_binding"].includes(key)) {
      throw new DatabaseIsolationError("Postgres URL'sinde onaylanmamış bağlantı parametresi var.");
    }
  }
  let hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (hostname.endsWith(".neon.tech")) hostname = hostname.replace(/-pooler(?=\.)/, "");
  let database: string;
  try { database = decodeURIComponent(url.pathname.slice(1)); } catch { throw new DatabaseIsolationError("Geçersiz veritabanı adı."); }
  if (!database || database.includes("/") || database.includes("\0")) throw new DatabaseIsolationError("URL açık bir veritabanı adı içermelidir.");
  const fingerprint = createHash("sha256").update(JSON.stringify([hostname, url.port || "5432", database])).digest("hex");
  return { fingerprint, local: ["localhost", "127.0.0.1", "[::1]"].includes(hostname) };
}

export function assertDatabaseIsolation(env: DatabaseEnvironment, options: { testData?: boolean } = {}) {
  const runtime = env.DATABASE_URL?.trim();
  if (!runtime) throw new DatabaseIsolationError("DATABASE_URL eksik.");
  const target = databaseTargetFingerprint(runtime);
  const direct = env.DIRECT_URL?.trim();
  if (direct && databaseTargetFingerprint(direct).fingerprint !== target.fingerprint) {
    throw new DatabaseIsolationError("DATABASE_URL ve DIRECT_URL farklı veritabanlarını gösteriyor; işlem engellendi.");
  }
  const scope = env.VERCEL_ENV || env.HCSC_DEPLOYMENT_ENV || env.NODE_ENV || "development";
  if (!["production", "preview", "development", "test"].includes(scope)) throw new DatabaseIsolationError("Geçersiz HCSC_DEPLOYMENT_ENV.");
  const production = scope === "production";
  if (options.testData && production) throw new DatabaseIsolationError("Üretim ortamında test/seed verisi oluşturulamaz.");
  const pin = env.HCSC_DATABASE_TARGET_FINGERPRINT?.trim();
  const productionPin = env.HCSC_PRODUCTION_DATABASE_FINGERPRINT?.trim();
  if ((!target.local || production) && (!pin || !productionPin)) {
    throw new DatabaseIsolationError("Uzak DB bağlantısı için HCSC_DATABASE_TARGET_FINGERPRINT ve HCSC_PRODUCTION_DATABASE_FINGERPRINT doğrulanmalıdır.");
  }
  for (const value of [pin, productionPin]) {
    if (value && !/^[a-f0-9]{64}$/.test(value)) throw new DatabaseIsolationError("DB parmak izi 64 karakterlik SHA-256 olmalıdır.");
  }
  if (pin && pin !== target.fingerprint) throw new DatabaseIsolationError("DB hedefi onaylı parmak iziyle eşleşmiyor.");
  if (productionPin && (production ? productionPin !== target.fingerprint : productionPin === target.fingerprint)) {
    throw new DatabaseIsolationError(production ? "Üretim DB hedefi doğrulanamadı." : "Yerel/test/preview ortamı canlı DB'ye bağlanamaz.");
  }
  return { scope, fingerprint: target.fingerprint, local: target.local };
}
